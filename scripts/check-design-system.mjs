import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const pagesRoot = new URL("../src/pages/", import.meta.url);
const explicitFiles = [
  ["src/Settings.tsx", new URL("../src/Settings.tsx", import.meta.url)],
  ["src/SettingsBackend.tsx", new URL("../src/SettingsBackend.tsx", import.meta.url)],
  ["src/settings-center.css", new URL("../src/settings-center.css", import.meta.url)],
];
const allowedExtensions = new Set([".tsx", ".ts", ".css"]);
const violations = [];

function inspect(relative, source) {
  if (/<select\b/i.test(source)) violations.push(relative + ": use Carbon Dropdown, ComboBox, or shared CarbonSelect; native select is not allowed.");
  if (relative === "src/pages/SeoAnalysis.tsx") {
    if (!/\bProgressIndicator\b/.test(source) || !/\bProgressStep\b/.test(source)) violations.push(relative + ": execution stages must use Carbon ProgressIndicator / ProgressStep.");
    if (!/\bTableContainer\b/.test(source) || !/\bTableHeader\b/.test(source) || !/\bTableCell\b/.test(source)) violations.push(relative + ": tabular records must use Carbon Table components.");
    if (/\bStructuredListWrapper\b/.test(source)) violations.push(relative + ": use Carbon Table for row-and-column records; do not substitute StructuredList.");
  }
  if (relative === "src/pages/seo-analysis.css") {
    if (/\bfont-size\s*:/i.test(source)) violations.push(relative + ": typography sizes must come from Carbon type styles, not page CSS.");
    if (/(?:^|[;{}])\s*(?:margin|padding|gap|row-gap|column-gap)\s*:[^;{}]*(?:\b(?:8|12|16|24|32|40|48)px\b)/im.test(source)) violations.push(relative + ": use Carbon spacing tokens instead of hard-coded spacing values.");
    if (/\b(?:seo-event-row|seo-detail-list|seo-history-list)\b/.test(source)) violations.push(relative + ": tabular data must not be simulated with page-specific list/grid layouts.");
  }
  if ((relative.startsWith("src/pages/") || relative === "src/Settings.tsx") && /\.(tsx|ts)$/.test(relative) &&
      !/from\s+["']@carbon\/react["']/.test(source) &&
      !/from\s+["'][^"']*design-system/.test(source)) {
    violations.push(relative + ": page must use Carbon React components or an approved shared Carbon design-system primitive.");
  }
  if (relative.endsWith(".css")) {
    if (/(?:^|[;{}])\s*[^:;{}]+\s*:[^;{}]*#[0-9a-f]{3,8}\b/im.test(source)) violations.push(relative + ": hard-coded hex colors are not allowed; use Carbon/Kosmo tokens.");
    if (/(?:^|[;{}])\s*[^:;{}]+\s*:[^;{}]*\brgba?\(/im.test(source)) violations.push(relative + ": hard-coded RGB colors are not allowed; use Carbon/Kosmo tokens.");
    if (relative === "src/settings-center.css" && /\.cds--[\w-]+/.test(source)) violations.push(relative + ": page CSS must not override Carbon internal component selectors.");
    if (/(^|[,}])\s*(html|body|:root|\.cds--[\w-]+)\b/m.test(source)) violations.push(relative + ": page CSS must not override global or Carbon component selectors.");
  }
}

async function walk(directory, prefix = "src/pages/") {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error?.code === "ENOENT") return; throw error; }
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path, prefix);
    else if (allowedExtensions.has(extname(entry.name))) inspect(prefix + entry.name, await readFile(path, "utf8"));
  }
}

await walk(pagesRoot.pathname);
for (const [relative, url] of explicitFiles) {
  try { inspect(relative, await readFile(url, "utf8")); }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
}
if (violations.length) {
  console.error("Design-system guard failed:\n" + violations.map(item => " - " + item).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Design-system guard passed: Carbon React/shared primitives, Carbon controls, token colors, and scoped CSS are enforced for src/pages and Settings.");
}
