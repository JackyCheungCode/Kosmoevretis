import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const pagesRoot = new URL("../src/pages/", import.meta.url);
const explicitFiles = [
  new URL("../src/Settings.tsx", import.meta.url),
  new URL("../src/SettingsBackend.tsx", import.meta.url),
  new URL("../src/settings-center.css", import.meta.url),
];
const allowedExtensions = new Set([".tsx", ".ts", ".css"]);
const violations = [];

function inspect(relative, source) {
  if (/<select\\b/i.test(source)) violations.push(relative + ": use Carbon Dropdown, ComboBox, or shared CarbonSelect; native select is not allowed.");
  if ((relative.startsWith("src/pages/") || relative === "src/Settings.tsx") && /\\.(tsx|ts)$/.test(relative) &&
      !/(Intelligence|DataList|Configuration|Analysis)PageTemplate/.test(source)) {
    violations.push(relative + ": page must use an approved page template from src/design-system.");
  }
  if (relative.endsWith(".css")) {
    if (/(^|[;{\\s])#[0-9a-f]{3,8}(?![\\w-])/i.test(source)) violations.push(relative + ": hard-coded hex colors are not allowed; use Carbon/Kosmo tokens.");
    if (/(^|[;{\\s])rgba?\\(/i.test(source)) violations.push(relative + ": hard-coded RGB colors are not allowed; use Carbon/Kosmo tokens.");
    if (/(^|[,}])\\s*(html|body|:root|\\.cds--[\\w-]+)\\b/m.test(source)) violations.push(relative + ": page CSS must not override global or Carbon component selectors.");
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
for (const url of explicitFiles) {
  try { inspect(url.pathname.split("/").at(-1) === "settings-center.css" ? "src/settings-center.css" : "src/" + url.pathname.split("/").at(-1), await readFile(url, "utf8")); }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
}
if (violations.length) {
  console.error("Design-system guard failed:\\n" + violations.map(item => " - " + item).join("\\n"));
  process.exitCode = 1;
} else {
  console.log("Design-system guard passed: page templates, Carbon controls, token colors, and scoped CSS are enforced for src/pages and Settings.");
}
