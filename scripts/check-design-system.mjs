import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const srcRoot = new URL("../src/", import.meta.url);
const allowedExtensions = new Set([".tsx", ".ts", ".css", ".scss"]);
const violations = [];

function inspect(relative, source) {
  if (relative === "src/GoogleMapsDiscovery.tsx" &&
      (!/\bButton\b/.test(source) || /<button\b[^>]*className=["']gm-customer-link["']/.test(source))) {
    violations.push(relative + ": Google Maps customer actions must use Carbon Button.");
  }
  if (relative === "src/FacebookDiscovery.tsx" &&
      (!/\bClickableTile\b/.test(source) || /<button\b[^>]*className=\{historyId/.test(source))) {
    violations.push(relative + ": history rows must use Carbon ClickableTile.");
  }
  if (relative === "src/LinkedInDiscovery.tsx" &&
      (!/\bClickableTile\b/.test(source) || /<button\b[^>]*className=\{historyId/.test(source))) {
    violations.push(relative + ": history rows must use Carbon ClickableTile.");
  }
  if (relative === "src/pages/EcommerceDiscovery.tsx" &&
      (!/\bClickableTile\b/.test(source) || /<button\b[^>]*className=\{selectedHistory/.test(source))) {
    violations.push(relative + ": history rows must use Carbon ClickableTile.");
  }
  if (relative === "src/pages/PlatformDataCollection.tsx" &&
      (!/\bClickableTile\b/.test(source) || /<button\b[^>]*className=\{["']pdc-history-row/.test(source))) {
    violations.push(relative + ": history rows must use Carbon ClickableTile.");
  }
  if (relative === "src/ProductCenter.tsx") {
    if (!/\bClickableTile\b/.test(source) || /<button\b[^>]*className=["']pc-product-row["']/.test(source)) {
      violations.push(relative + ": product catalog rows must use Carbon ClickableTile, not hand-built button tiles.");
    }
  }
  if (relative === "src/App.tsx") {
    for (const component of ["Header", "SideNav", "Content", "Grid", "Column", "Breadcrumb", "BreadcrumbItem"]) {
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
  if (relative === "src/App.tsx" && /<nav className="kosmo-breadcrumb"/.test(source)) {
    violations.push(relative + ": route hierarchy must use Carbon Breadcrumb / BreadcrumbItem components.");
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
  const routePageComponents = [
    "src/GlobalIntelligence.tsx", "src/ProductCenter.tsx", "src/TradeAccessPage.tsx",
    "src/FacebookDiscovery.tsx", "src/LinkedInDiscovery.tsx", "src/GoogleMapsDiscovery.tsx",
    "src/MailCommunication.tsx", "src/Settings.tsx", "src/pages/EcommerceDiscovery.tsx",
    "src/pages/InstagramDiscovery.tsx", "src/pages/PlatformDataCollection.tsx", "src/pages/SeoAnalysis.tsx",
  ];
  if (routePageComponents.includes(relative) &&
      !/\bPageHeader\b|\b(?:Intelligence|DataList|Configuration|Analysis)PageTemplate\b/.test(source)) {
    violations.push(relative + ": route page must use the shared PageHeader or approved page template.");
  }
  if (["src/GlobalIntelligence.tsx", "src/IntelligenceExperience.tsx"].includes(relative) && /<button\b/.test(source)) {
    violations.push(relative + ": primary intelligence workspace actions must use Carbon Button components.");
  }
  if ((relative.startsWith("src/pages/") || relative === "src/Settings.tsx" || rootPageComponents.includes(relative)) && /\.(tsx|ts)$/.test(relative) &&
      !/from\s+["']@carbon\/react["']/.test(source) &&
      !/from\s+["'][^"']*design-system/.test(source)) {
    violations.push(relative + ": page must use Carbon React components or an approved shared Carbon design-system primitive.");
  }
  if (/\.tsx?$/.test(relative)) {
    if (/\b(?:fill|stroke|stopColor)\s*=\s*["']#[0-9a-f]{3,8}\b/i.test(source)) {
      violations.push(relative + ": inline SVG colors must use Carbon semantic tokens, not hard-coded hex values.");
    }
    if (/\bstyle\s*=\s*\{\{[^}]*\b(?:color|backgroundColor|borderColor|fill|stroke)\s*:\s*["']#[0-9a-f]{3,8}\b/is.test(source)) {
      violations.push(relative + ": inline style colors must use Carbon semantic tokens, not hard-coded hex values.");
    }
    if (/\bstyle\s*=\s*\{\{[^}]*\b(?:margin|marginTop|marginBottom|padding|paddingTop|paddingBottom|gap|rowGap|columnGap)\s*:\s*\d+(?:\.\d+)?(?:\s*[,}])/is.test(source)) {
      violations.push(relative + ": inline layout spacing must use shared CSS classes and Carbon spacing tokens.");
    }
    if (/\bstyle\s*=\s*\{\{[^}]*\b(?:fontSize|fontFamily|fontWeight|lineHeight)\s*:/is.test(source)) {
      violations.push(relative + ": inline typography must use Carbon type tokens and shared CSS classes.");
    }
    if (/\brole\s*=\s*["']tab(?:list)?["']/i.test(source)) {
      violations.push(relative + ": tab semantics must come from Carbon Tabs components, not hand-built tab roles.");
    }
  }
  if (relative.endsWith(".css")) {
    if (/var\(--kosmo-space-\d+\)/.test(source)) violations.push(relative + ": migrate legacy --kosmo-space-* aliases to canonical --kosmo-spacing-* tokens.");
    if (/(?:\d+var|\.var)\(--kosmo-spacing-\d+\)/.test(source)) violations.push(relative + ": malformed Carbon spacing expression detected.");
    if (/(?:^|[;{}])\s*[^:;{}]+\s*:[^;{}]*#[0-9a-f]{3,8}\b/im.test(source)) violations.push(relative + ": hard-coded hex colors are not allowed; use Carbon/Kosmo tokens.");
    if (/(?:^|[;{}])\s*[^:;{}]+\s*:[^;{}]*\brgba?\(/im.test(source)) violations.push(relative + ": hard-coded RGB colors are not allowed; use Carbon/Kosmo tokens.");
    if (/font-size\s*:\s*(?!\s*var\(--cds-)(?!\s*var\(--kosmo-type-)(?!\s*clamp\()[^;}]+/i.test(source)) violations.push(relative + ": typography must use Carbon type tokens or an approved expressive clamp scale.");
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
    if (entry.isDirectory()) await walk(path, prefix + entry.name + "/");
    else if (allowedExtensions.has(extname(entry.name))) inspect(prefix + entry.name, await readFile(path, "utf8"));
  }
}

await walk(srcRoot.pathname, "src/");
if (violations.length) {
  console.error("Design-system guard failed:\n" + violations.map(item => " - " + item).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Design-system guard passed: Carbon AppShell, Content/Grid composition, Carbon spacing tokens, Carbon React controls, token colors, and scoped CSS are enforced.");
}
