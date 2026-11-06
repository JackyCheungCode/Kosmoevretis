import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const pagesRoot = new URL("../src/pages/", import.meta.url);
const explicitFiles = [
  ["src/Settings.tsx", new URL("../src/Settings.tsx", import.meta.url)],
  ["src/SettingsBackend.tsx", new URL("../src/SettingsBackend.tsx", import.meta.url)],
  ["src/GlobalIntelligence.tsx", new URL("../src/GlobalIntelligence.tsx", import.meta.url)],
  ["src/ProductCenter.tsx", new URL("../src/ProductCenter.tsx", import.meta.url)],
  ["src/TradeAccessPage.tsx", new URL("../src/TradeAccessPage.tsx", import.meta.url)],
  ["src/FacebookDiscovery.tsx", new URL("../src/FacebookDiscovery.tsx", import.meta.url)],
  ["src/LinkedInDiscovery.tsx", new URL("../src/LinkedInDiscovery.tsx", import.meta.url)],
  ["src/GoogleMapsDiscovery.tsx", new URL("../src/GoogleMapsDiscovery.tsx", import.meta.url)],
  ["src/MailCommunication.tsx", new URL("../src/MailCommunication.tsx", import.meta.url)],
  ["src/MailSettings.tsx", new URL("../src/MailSettings.tsx", import.meta.url)],
  ["src/IntelligenceExperience.tsx", new URL("../src/IntelligenceExperience.tsx", import.meta.url)],
  ["src/DesignSystemPreview.tsx", new URL("../src/DesignSystemPreview.tsx", import.meta.url)],
  ["src/settings-center.css", new URL("../src/settings-center.css", import.meta.url)],
  ["src/App.tsx", new URL("../src/App.tsx", import.meta.url)],
  ["src/app-shell.css", new URL("../src/app-shell.css", import.meta.url)],
  ["src/styles.css", new URL("../src/styles.css", import.meta.url)],
  ["src/design-tokens.scss", new URL("../src/design-tokens.scss", import.meta.url)],
  ["src/intelligence.css", new URL("../src/intelligence.css", import.meta.url)],
  ["src/product-center.css", new URL("../src/product-center.css", import.meta.url)],
  ["src/trade-access.css", new URL("../src/trade-access.css", import.meta.url)],
  ["src/facebook-discovery.css", new URL("../src/facebook-discovery.css", import.meta.url)],
  ["src/google-maps-discovery.css", new URL("../src/google-maps-discovery.css", import.meta.url)],
  ["src/linkedin-discovery.css", new URL("../src/linkedin-discovery.css", import.meta.url)],
  ["src/auth/auth.css", new URL("../src/auth/auth.css", import.meta.url)],
  ["src/components/carbon-select.css", new URL("../src/components/carbon-select.css", import.meta.url)],
  ["src/mail-communication.css", new URL("../src/mail-communication.css", import.meta.url)],
  ["src/social-platform-workspace.css", new URL("../src/social-platform-workspace.css", import.meta.url)],
  ["src/design-system-preview.css", new URL("../src/design-system-preview.css", import.meta.url)],
  ["src/design-system/components/CollectionModeGrid.css", new URL("../src/design-system/components/CollectionModeGrid.css", import.meta.url)],
  ["src/design-system/design-system.css", new URL("../src/design-system/design-system.css", import.meta.url)],
  ["src/mail-settings.css", new URL("../src/mail-settings.css", import.meta.url)],
  ["src/responsive-audit.css", new URL("../src/responsive-audit.css", import.meta.url)],
];
const allowedExtensions = new Set([".tsx", ".ts", ".css", ".scss"]);
const violations = [];

function inspect(relative, source) {
  if (relative === "src/App.tsx") {
    for (const component of ["Header", "SideNav", "Content", "Grid", "Column"]) {
      if (!new RegExp("\\b" + component + "\\b").test(source)) {
        violations.push(relative + ": Carbon UI Shell foundation must include " + component + ".");
      }
    }
    if (!/<Content\b[^>]*className=/.test(source) ||
        !/<Grid\b[^>]*fullWidth/.test(source) ||
        !/<Column\b[^>]*sm=\{4\}[^>]*md=\{8\}[^>]*lg=\{16\}/.test(source)) {
      violations.push(relative + ": page content must use Carbon Content > full-width Grid > responsive 2x Grid Column.");
    }
  }
  if (relative === "src/app-shell.css") {
    if (/\bbox-shadow\s*:/i.test(source)) violations.push(relative + ": AppShell must use Carbon layer and border tokens, not shadows.");
    if (/--kosmo-space-\d+/.test(source)) violations.push(relative + ": AppShell must use canonical --kosmo-spacing-* Carbon aliases, not legacy spacing aliases.");
    if (!/\.kosmo-main\.cds--content\s*\{[^}]*margin-top:\s*var\(--kosmo-shell-header-height\)/s.test(source)) {
      violations.push(relative + ": Carbon Content must own the single Header offset.");
    }
  }
  if (relative === "src/styles.css" && /(^|[,}])\s*\.content\s*\{/m.test(source)) {
    violations.push(relative + ": generic .content layout rules are not allowed; use Carbon Content and scoped page containers.");
  }
  if (relative === "src/design-tokens.scss") {
    if (!/@use ["']@carbon\/react\/scss\/spacing["']/.test(source) || !/carbon-spacing\.\$spacing-12/.test(source)) {
      violations.push(relative + ": spacing aliases must be sourced from official Carbon v11 Sass spacing tokens.");
    }
    if (/:focus-visible\s*\{/.test(source)) violations.push(relative + ": do not globally override Carbon component focus treatments.");
  }
  if (/<select\b/.test(source)) violations.push(relative + ": use Carbon Dropdown, ComboBox, or shared CarbonSelect; native select is not allowed.");
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
  const rootPageComponents = [
    "src/GlobalIntelligence.tsx", "src/ProductCenter.tsx", "src/TradeAccessPage.tsx",
    "src/FacebookDiscovery.tsx", "src/LinkedInDiscovery.tsx", "src/GoogleMapsDiscovery.tsx",
    "src/MailCommunication.tsx", "src/MailSettings.tsx", "src/IntelligenceExperience.tsx",
    "src/DesignSystemPreview.tsx",
  ];
  if ((relative.startsWith("src/pages/") || relative === "src/Settings.tsx" || rootPageComponents.includes(relative)) && /\.(tsx|ts)$/.test(relative) &&
      !/from\s+["']@carbon\/react["']/.test(source) &&
      !/from\s+["'][^"']*design-system/.test(source)) {
    violations.push(relative + ": page must use Carbon React components or an approved shared Carbon design-system primitive.");
  }
  if (relative.endsWith(".css")) {
    if (/(?:^|[;{}])\s*[^:;{}]+\s*:[^;{}]*#[0-9a-f]{3,8}\b/im.test(source)) violations.push(relative + ": hard-coded hex colors are not allowed; use Carbon/Kosmo tokens.");
    if (/(?:^|[;{}])\s*[^:;{}]+\s*:[^;{}]*\brgba?\(/im.test(source)) violations.push(relative + ": hard-coded RGB colors are not allowed; use Carbon/Kosmo tokens.");
    if (relative !== "src/styles.css") {
      if (relative === "src/settings-center.css" && /\.cds--[\w-]+/.test(source)) violations.push(relative + ": page CSS must not override Carbon internal component selectors.");
      if (/(^|})\s*(html|body|:root|\.cds--[\w-]+)\b/m.test(source)) violations.push(relative + ": page CSS must not override global or Carbon component selectors.");
    }
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
  console.log("Design-system guard passed: Carbon AppShell, Content/Grid composition, Carbon spacing tokens, Carbon React controls, token colors, and scoped CSS are enforced.");
}
