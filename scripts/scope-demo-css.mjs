/**
 * Generates route-scoped CSS from the verbatim demo CSS in design-reference/.
 *
 * Why: the demo's per-page stylesheets reuse selector names (.g1, .casa,
 * .page-hero, even `footer`) with DIFFERENT values per page. Next.js global
 * CSS imports stay loaded across client navigations, so importing them
 * unscoped would let one page's rules corrupt another's pixel-exactness.
 *
 * What it does — values are NEVER changed, only selector scope:
 *   design-reference/<page>.css  →  src/styles/demo/<page>.css
 *     every rule prefixed with `body:has(.pg-<page>)` so it applies only
 *     while that page's root element is mounted (chrome included, since
 *     header/footer live outside the page wrapper).
 *   src/styles/demo/base.css
 *     the base rules that are identical in every demo file (:root palette,
 *     *, html, body, a, button, headings) + @keyframes, emitted once.
 *
 * Run: node scripts/scope-demo-css.mjs   (or: npm run demo:css)
 * design-reference/ stays the single source of truth — never edit the
 * generated files by hand.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "design-reference");
const outDir = join(root, "src", "styles", "demo");
mkdirSync(outDir, { recursive: true });

/** selectors hoisted into base.css (verified identical across all files) */
const BASE_KEYS = new Set([":root", "*", "html", "body", "a", "button", "h1,h2,h3,.hand", "h1,h2,h3"]);

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const norm = (sel) => sel.replace(/\s+/g, "");

/** parse into a flat list of nodes preserving order */
function parse(css) {
  const nodes = [];
  let i = 0;
  while (i < css.length) {
    const b = css.indexOf("{", i);
    if (b === -1) break;
    const sel = css.slice(i, b).trim();
    let depth = 1;
    let j = b + 1;
    while (j < css.length && depth) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }
    const body = css.slice(b + 1, j - 1);
    if (/^@(media|supports)/.test(sel)) {
      nodes.push({ type: "at", sel, children: parse(body) });
    } else if (sel.startsWith("@keyframes")) {
      nodes.push({ type: "keyframes", sel, body });
    } else if (sel.startsWith("@")) {
      nodes.push({ type: "raw", sel, body });
    } else {
      nodes.push({ type: "rule", sel, body });
    }
    i = j;
  }
  return nodes;
}

function scopeSelector(sel, bodyPrefix) {
  return sel
    .split(",")
    .map((s) => {
      s = s.trim();
      if (/^body(\b|[.:[])/.test(s)) return s.replace(/^body/, bodyPrefix);
      if (/^html(\b|[.:[])/.test(s)) return `html:has(${bodyPrefix}) ${s.slice(4)}`.trimEnd();
      return `${bodyPrefix} ${s}`;
    })
    .join(",");
}

function emit(nodes, bodyPrefix, out, keyframes) {
  for (const n of nodes) {
    if (n.type === "rule") {
      if (BASE_KEYS.has(norm(n.sel))) continue; // provided by base.css
      out.push(`${scopeSelector(n.sel, bodyPrefix)}{${n.body}}`);
    } else if (n.type === "at") {
      const inner = [];
      emit(n.children, bodyPrefix, inner, keyframes);
      if (inner.length) out.push(`${n.sel}{\n${inner.join("\n")}\n}`);
    } else if (n.type === "keyframes") {
      const name = n.sel.replace("@keyframes", "").trim();
      const key = `${name}:${n.body.replace(/\s+/g, "")}`;
      if (!keyframes.map.has(name)) {
        keyframes.map.set(name, key);
        keyframes.out.push(`${n.sel}{${n.body}}`);
      } else if (keyframes.map.get(name) !== key) {
        throw new Error(`@keyframes ${name} differs between files — needs manual rename`);
      }
    } else {
      out.push(`${n.sel}{${n.body}}`);
    }
  }
}

const files = readdirSync(srcDir).filter((f) => f.endsWith(".css"));
const keyframes = { map: new Map(), out: [] };
let baseRules = null;

for (const f of files) {
  const page = basename(f, ".css");
  // page contract: the route's root element has a class attribute that
  // BEGINS with `pg-<page>` (single class or first class)
  const prefix = `body:has([class^="pg-${page}"])`;
  const nodes = parse(stripComments(readFileSync(join(srcDir, f), "utf8")));
  if (!baseRules) {
    baseRules = nodes.filter((n) => n.type === "rule" && BASE_KEYS.has(norm(n.sel)));
  }
  const out = [
    `/* GENERATED from design-reference/${f} by scripts/scope-demo-css.mjs — DO NOT EDIT.`,
    `   Verbatim demo values, scoped to .pg-${page}. */`,
  ];
  emit(nodes, prefix, out, keyframes);
  writeFileSync(join(outDir, `${page}.css`), out.join("\n") + "\n");
  console.log(`scoped ${f} → src/styles/demo/${page}.css (${out.length - 2} rules)`);
}

// chrome fallback: routes with no pg- wrapper (admin, not-found) still get
// demo-styled header/footer/chat — index.css rules apply there
{
  const nodes = parse(stripComments(readFileSync(join(srcDir, "index.css"), "utf8")));
  const out = [
    "/* GENERATED by scripts/scope-demo-css.mjs — DO NOT EDIT.",
    "   index.css chrome styling for routes without a pg- page wrapper. */",
  ];
  emit(nodes, 'body:not(:has([class^="pg-"]))', out, { map: new Map(keyframes.map), out: [] });
  writeFileSync(join(outDir, "chrome-fallback.css"), out.join("\n") + "\n");
  console.log("chrome-fallback.css written");
}

// base rules go in @layer base so Tailwind utilities (admin pages)
// still win over the demo's `*{margin:0;padding:0}` reset — unlayered
// they would clobber mx-auto/px-*/py-* everywhere.
const base = [
  "/* GENERATED by scripts/scope-demo-css.mjs — DO NOT EDIT.",
  "   Demo base rules (identical across every design-reference file) + keyframes. */",
  "@layer base{",
  ...baseRules.map((n) => `${n.sel}{${n.body}}`),
  "}",
  ...keyframes.out,
];
writeFileSync(join(outDir, "base.css"), base.join("\n") + "\n");
console.log(`base.css: ${baseRules.length} base rules, ${keyframes.out.length} keyframes`);
