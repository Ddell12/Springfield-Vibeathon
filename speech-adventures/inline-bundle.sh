#!/bin/bash
# Inline CSS and JS into a single HTML file from Vite build output
CSS_FILE=$(ls dist-vite/assets/*.css)
JS_FILE=$(ls dist-vite/assets/*.js)

CSS_CONTENT=$(cat "$CSS_FILE")
JS_CONTENT=$(cat "$JS_FILE")

cat > bundle.html << HTMLEOF
<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🗣️</text></svg>" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Speech Adventures - SLP Game for Kids</title>
<style>
${CSS_CONTENT}
</style>
</head>
<body>
<div id="root"></div>
<script type="module">
${JS_CONTENT}
</script>
</body>
</html>
HTMLEOF

echo "✅ Bundle created: bundle.html ($(du -h bundle.html | cut -f1))"
