import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const root = new URL("../src/pages/", import.meta.url);
const allowedExtensions = new Set([".tsx", ".ts", ".css"]);
const violations = [];

async function walk(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (allowedExtensions.has(extname(entry.name))) {
      const source = await readFile(path, "utf8");
      const relative = path.replaceAll("\\", "/").split("/src/pages/").at(-1);
      if (/<select\b/i.test(source)) violations.push(relative + ": use Carbon Dropdown, ComboBox, or shared CarbonSelect; native select is not allowed.");
      if (/\.(tsx|ts)$/.test(entry.name) && !/(Intelligence|DataList|Configuration|Analysis)PageTemplate/.test(source)) {
        violations.push(relative + ": new pages must use an approved page template from src/design-system.");
      }
      if (extname(entry.name) === ".css") {
        if (/(^|[;{\s])#[0-9a-f]{3,8}(?![\w-])/i.test(source)) violations.push(relative + ": hard-coded hex colors are not allowed; use Carbon/Kosmo tokens.");
        if (/(^|[;{\s])rgba?\(/i.test(source)) violations.push(relative + ": hard-coded RGB colors are not allowed; use Carbon/Kosmo tokens.");
        if (/(^|[,}])\s*(html|body|:root|\.cds--[\w-]+)\b/m.test(source)) violations.push(relative + ": page CSS must not override global or Carbon component selectors.");
      }
    }
  }
}

await walk(root.pathname);
if (violations.length) {
  console.error("Design-system guard failed:\n" + violations.map(item => " - " + item).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Design-system guard passed: page templates, Carbon controls, token colors, and scoped CSS are enforced for src/pages.");
}
