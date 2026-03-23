#!/usr/bin/env python3
"""
Extract semantic content from Aura project-intelligence HTML artifacts
into structured, AI-agent-parseable markdown files.

Usage:
    python3 extract-intel.py <input-dir> <output-dir>

Example:
    python3 extract-intel.py ~/Aura/project-intelligence ~/Aura/project-intelligence/agent-digest
"""

import sys
import os
import re
from html.parser import HTMLParser
from pathlib import Path


class ContentExtractor(HTMLParser):
    """Extract meaningful text content from HTML, stripping CSS/JS and visual-only markup."""

    def __init__(self):
        super().__init__()
        self.content = []
        self.current_tag = None
        self.skip_tags = {"style", "script", "svg", "noscript"}
        self.skip_depth = 0
        self.in_heading = False
        self.heading_level = 0

    def handle_starttag(self, tag, attrs):
        if tag in self.skip_tags:
            self.skip_depth += 1
            return
        if self.skip_depth > 0:
            return

        self.current_tag = tag
        attrs_dict = dict(attrs)

        if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            self.in_heading = True
            self.heading_level = int(tag[1])
            self.content.append(f"\n{'#' * self.heading_level} ")
        elif tag == "br":
            self.content.append("\n")
        elif tag == "p":
            self.content.append("\n\n")
        elif tag == "li":
            self.content.append("\n- ")
        elif tag == "tr":
            self.content.append("\n| ")
        elif tag in ("td", "th"):
            self.content.append(" | ")
        elif tag == "code":
            self.content.append("`")
        elif tag == "pre":
            self.content.append("\n```\n")
        elif tag == "strong" or tag == "b":
            self.content.append("**")
        elif tag == "em" or tag == "i":
            self.content.append("*")
        elif tag == "div":
            cls = attrs_dict.get("class", "")
            if any(
                kw in cls
                for kw in [
                    "section",
                    "card",
                    "phase",
                    "layer",
                    "group",
                    "category",
                    "domain",
                    "tier",
                    "lane",
                    "node",
                    "step",
                    "item",
                    "entry",
                    "row",
                    "block",
                    "panel",
                    "detail",
                    "stat",
                    "metric",
                    "badge",
                    "chip",
                    "tag",
                    "legend",
                    "header",
                    "title",
                    "subtitle",
                    "description",
                    "content",
                    "body",
                    "info",
                    "meta",
                    "note",
                    "tip",
                    "warning",
                    "alert",
                ]
            ):
                self.content.append("\n")

    def handle_endtag(self, tag):
        if tag in self.skip_tags:
            self.skip_depth = max(0, self.skip_depth - 1)
            return
        if self.skip_depth > 0:
            return

        if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            self.in_heading = False
            self.content.append("\n")
        elif tag == "code":
            self.content.append("`")
        elif tag == "pre":
            self.content.append("\n```\n")
        elif tag == "strong" or tag == "b":
            self.content.append("**")
        elif tag == "em" or tag == "i":
            self.content.append("*")
        elif tag == "tr":
            self.content.append(" |")

    def handle_data(self, data):
        if self.skip_depth > 0:
            return
        text = data.strip()
        if text:
            self.content.append(text)

    def get_text(self):
        raw = "".join(self.content)
        # Clean up excessive whitespace
        raw = re.sub(r"\n{3,}", "\n\n", raw)
        raw = re.sub(r"[ \t]+", " ", raw)
        raw = re.sub(r" \n", "\n", raw)
        return raw.strip()


def extract_js_data(html_content):
    """Extract JavaScript data objects/arrays embedded in the HTML."""
    data_blocks = []

    # Look for const/let/var assignments with arrays or objects
    patterns = [
        r"(?:const|let|var)\s+(\w+)\s*=\s*(\[[\s\S]*?\]);",
        r"(?:const|let|var)\s+(\w+)\s*=\s*(\{[\s\S]*?\});",
    ]

    for pattern in patterns:
        for match in re.finditer(pattern, html_content):
            name = match.group(1)
            # Skip CSS/style/config variables
            if any(
                skip in name.lower()
                for skip in ["color", "style", "theme", "css", "animation", "transition"]
            ):
                continue
            data_blocks.append((name, match.group(2)[:5000]))  # Cap size

    return data_blocks


def extract_html_content(filepath):
    """Extract text content from an HTML file."""
    with open(filepath, "r", encoding="utf-8") as f:
        html = f.read()

    extractor = ContentExtractor()
    extractor.feed(html)
    text = extractor.get_text()

    # Also grab JS data structures
    js_data = extract_js_data(html)

    return text, js_data


def format_digest(filename, text_content, js_data, category):
    """Format extracted content into a structured markdown digest."""
    # Derive a clean title from filename
    name = Path(filename).stem
    # Remove leading number prefix like "01-"
    title = re.sub(r"^\d+-", "", name).replace("-", " ").title()

    lines = [
        f"---",
        f"artifact: {filename}",
        f"category: {category}",
        f"format: agent-digest",
        f"source: project-intelligence/{category}/{filename}",
        f"---",
        f"",
        f"# {title}",
        f"",
    ]

    # Add text content
    if text_content:
        lines.append(text_content)
        lines.append("")

    # Add JS data if meaningful
    if js_data:
        lines.append("## Embedded Data Structures")
        lines.append("")
        for name, data in js_data:
            lines.append(f"### {name}")
            lines.append(f"```json")
            lines.append(data)
            lines.append(f"```")
            lines.append("")

    return "\n".join(lines)


def build_index(digests):
    """Build a master index file for all digests."""
    lines = [
        "---",
        "format: agent-digest-index",
        "description: Master index of all Aura project intelligence digests — structured for AI agent consumption",
        "---",
        "",
        "# Aura Project Intelligence — Agent Digest Index",
        "",
        "Machine-readable extractions from the visual project-intelligence HTML artifacts.",
        "Each file below contains structured markdown with YAML frontmatter for easy parsing.",
        "",
        "## Files by Category",
        "",
    ]

    by_category = {}
    for path, category, title in digests:
        by_category.setdefault(category, []).append((path, title))

    for cat in sorted(by_category.keys()):
        lines.append(f"### {cat.replace('-', ' ').title()}")
        lines.append("")
        for path, title in by_category[cat]:
            rel = os.path.basename(path)
            lines.append(f"- [{title}]({cat}/{rel})")
        lines.append("")

    lines.extend(
        [
            "## Usage",
            "",
            "To get a complete project understanding, read files in this order:",
            "1. `architecture/` — system overview, slice map, infrastructure",
            "2. `data-flows/` — agent lifecycle, memory pipeline, vault indexing, scheduling",
            "3. `features/` — capability matrix, integration map, MCP topology",
            "4. `database/` — Convex schema, API routes",
            "5. `devops/` — deployment, CI/CD pipeline",
            "6. `user-journeys/` — Telegram, dashboard, CLI flows",
            "",
            "For targeted lookups, use the category + filename to find specific topics.",
        ]
    )

    return "\n".join(lines)


def main():
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <input-dir> <output-dir>")
        sys.exit(1)

    input_dir = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])

    if not input_dir.exists():
        print(f"Error: Input directory '{input_dir}' does not exist")
        sys.exit(1)

    # Find all HTML files (exclude index.html)
    html_files = sorted(input_dir.rglob("*.html"))
    html_files = [f for f in html_files if f.name != "index.html"]

    if not html_files:
        print(f"No HTML files found in '{input_dir}'")
        sys.exit(1)

    print(f"Found {len(html_files)} HTML artifacts to process")

    digests = []
    for html_file in html_files:
        category = html_file.parent.name
        print(f"  Extracting: {category}/{html_file.name}")

        text, js_data = extract_html_content(html_file)
        digest = format_digest(html_file.name, text, js_data, category)

        # Write output
        out_category_dir = output_dir / category
        out_category_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_category_dir / html_file.name.replace(".html", ".md")
        out_file.write_text(digest, encoding="utf-8")

        title = re.sub(r"^\d+-", "", html_file.stem).replace("-", " ").title()
        digests.append((str(out_file), category, title))

    # Build index
    index_content = build_index(digests)
    index_file = output_dir / "INDEX.md"
    index_file.write_text(index_content, encoding="utf-8")

    print(f"\nWrote {len(digests)} digest files + INDEX.md to '{output_dir}'")
    print("Done.")


if __name__ == "__main__":
    main()
