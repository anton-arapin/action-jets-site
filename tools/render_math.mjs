/* =====================================================================
   render_math.mjs -- turn the LaTeX in index.html into static HTML.

   The page ships PRE-RENDERED math: no MathJax, no KaTeX at runtime, no
   CDN. What the browser loads is static/katex/katex.min.css plus a few
   woff2 fonts, and the equations are already HTML by the time the file
   is served. That means they render with JavaScript off, they cannot
   flash raw LaTeX before a typesetter runs, and they cannot break
   because someone else's CDN went down.

   The LaTeX source stays in the file, inside HTML comments:

       inline   <!--t:J_i-->...rendered...<!--/t-->
       display  <!--T:E = mc^2-->...rendered...<!--/t-->

   To change an equation, edit the LaTeX in the comment and re-run:

       npm install katex          # once
       node tools/render_math.mjs

   Everything between the opening comment and <!--/t--> is replaced,
   so it is safe to run as often as you like. A block with nothing
   after the comment yet is rendered the same way, which is how new
   equations get added.

   One restriction, from HTML itself: the LaTeX cannot contain "--",
   since that would end the comment. None of this paper's math does.
   ===================================================================== */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const page = resolve(here, "..", "index.html");

let katex;
try {
  katex = (await import("katex")).default;
} catch {
  console.error(
    "katex is not installed. Run `npm install katex` in this folder first."
  );
  process.exit(1);
}

const src = readFileSync(page, "utf8");

// <!--t:LATEX--> anything <!--/t-->    (inline)
// <!--T:LATEX--> anything <!--/t-->    (display)
const BLOCK = /<!--([tT]):([\s\S]*?)-->[\s\S]*?<!--\/t-->/g;

let n = 0;
let failed = 0;

const out = src.replace(BLOCK, (_whole, d, tex) => {
  const display = d === "T";
  const latex = tex.trim();
  let html;
  try {
    html = katex.renderToString(latex, {
      displayMode: display,
      throwOnError: true,
      strict: "ignore",
      output: "html", // no MathML duplicate; keeps the page small
      trust: false,
    });
    n++;
  } catch (err) {
    failed++;
    console.error(`\n  FAILED  ${latex}\n          ${err.message}`);
    html = `<span class="tex-error">${latex}</span>`;
  }
  return `<!--${d}:${tex}-->${html}<!--/t-->`;
});

writeFileSync(page, out);
console.log(`rendered ${n} equation${n === 1 ? "" : "s"}` +
            (failed ? `, ${failed} FAILED` : ""));
process.exit(failed ? 1 : 0);
