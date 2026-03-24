import { ListChecks, Palette, Puzzle, User } from "lucide-react";

type DesignPlanProps = {
  content: string;
};

type SectionHeader = {
  key: string;
  label: string;
  icon: React.ReactNode;
};

const SECTION_HEADERS: SectionHeader[] = [
  { key: "**Tool Type**", label: "Tool Type", icon: <Puzzle size={14} /> },
  { key: "**Design Direction**", label: "Design Direction", icon: <Palette size={14} /> },
  { key: "**Features for V1**", label: "Features for V1", icon: <ListChecks size={14} /> },
  { key: "**Child Profile**", label: "Child Profile", icon: <User size={14} /> },
];

const CLOSING_LINE = "Let me build this now.";

function parseLine(line: string): { type: "header" | "bullet" | "closing" | "text"; content: string; header?: SectionHeader } {
  // Check for section headers (e.g. "1. **Tool Type** — ...")
  for (const header of SECTION_HEADERS) {
    if (line.includes(header.key)) {
      // Strip markdown bold and numbering prefix, keep rest of content
      const cleaned = line
        .replace(/^\d+\.\s*/, "")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .trim();
      return { type: "header", content: cleaned, header };
    }
  }

  // Check for closing line
  if (line.includes(CLOSING_LINE)) {
    return { type: "closing", content: line };
  }

  // Check for bullet points
  if (/^[-•*]\s/.test(line.trim()) || /^\s*[-•*]\s/.test(line)) {
    const content = line.replace(/^\s*[-•*]\s*/, "").trim();
    return { type: "bullet", content };
  }

  return { type: "text", content: line };
}

export function DesignPlan({ content }: DesignPlanProps) {
  if (!content) {
    return null;
  }

  const lines = content.split("\n");

  return (
    <div className="flex w-full justify-start mb-8 pl-1">
      <div className="flex flex-col gap-3 max-w-full w-full">
        {lines.map((line, i) => {
          if (!line.trim()) {
            return <div key={i} className="h-1" />;
          }

          const parsed = parseLine(line);

          if (parsed.type === "header" && parsed.header) {
            return (
              <div key={i} className="flex items-center gap-2 mt-3 first:mt-0">
                <span className="text-[#00595c]">{parsed.header.icon}</span>
                <span className="text-sm font-semibold text-foreground">
                  {parsed.content}
                </span>
              </div>
            );
          }

          if (parsed.type === "bullet") {
            return (
              <div key={i} className="flex items-start gap-2 pl-5">
                <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#00595c]" />
                <span className="text-sm text-foreground leading-relaxed">
                  {parsed.content}
                </span>
              </div>
            );
          }

          if (parsed.type === "closing") {
            return (
              <div key={i} className="flex flex-col gap-2 mt-3">
                <div className="h-px bg-[#00595c]/20" />
                <span className="text-sm font-medium text-[#00595c]">
                  {CLOSING_LINE}
                </span>
              </div>
            );
          }

          return (
            <p key={i} className="text-sm text-foreground leading-relaxed">
              {parsed.content}
            </p>
          );
        })}
      </div>
    </div>
  );
}
