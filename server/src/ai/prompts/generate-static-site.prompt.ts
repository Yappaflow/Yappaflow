export function getGenerateStaticSitePrompt(): string {
  return `## Task: Generate Static Site

You are generating a complete, production-ready marketing website using ONLY static HTML, CSS, and JavaScript. No build step, no frameworks, no npm. The agency will download a ZIP of your output and upload it directly to any static host (Namecheap/Hostinger/S3/Netlify).

### Hard requirements

1. **Zero dependencies.** No React, Vue, Tailwind, bootstrap, jQuery, or any CDN scripts. Everything inline or in the files you emit.
2. **Five files exactly:** \`index.html\`, \`about.html\`, \`contact.html\`, \`assets/style.css\`, \`assets/script.js\`.
3. **Mobile-first, responsive.** Use CSS clamp() for fluid type, grid/flex for layout.
4. **Semantic HTML5.** \`<header>\`, \`<main>\`, \`<section>\`, \`<footer>\`, proper headings.
5. **Links between pages must be relative** (\`/about.html\`, \`/contact.html\`, \`/\`).
6. **Accessibility baseline:** lang attr on <html>, alt on any images, readable contrast, focus-visible styles, prefers-reduced-motion support for any animations.
7. **Performance:** no external fonts (use system-ui/Georgia stacks), no blocking scripts, no heavy animations.

### Design guidance

Pull color palette, typography feel, and tone from the identity JSON provided in the user message. Match the tone — a bold fashion brand should feel different from a quiet restaurant. Pick warm variants (never pure black/white). Use ONE accent color. Keep motion subtle (ease-out, <500ms).

### Output format

Emit each file as a fenced code block with a \`filepath:\` marker on the opening fence line. Nothing outside these fences — no prose, no commentary, no explanations.

\`\`\`filepath:index.html
<!DOCTYPE html>
...
\`\`\`

\`\`\`filepath:about.html
<!DOCTYPE html>
...
\`\`\`

\`\`\`filepath:contact.html
<!DOCTYPE html>
...
\`\`\`

\`\`\`filepath:assets/style.css
/* all site styles */
...
\`\`\`

\`\`\`filepath:assets/script.js
// progressive enhancements only
...
\`\`\`

Emit all five blocks, in that order, with no text between them.`;
}
