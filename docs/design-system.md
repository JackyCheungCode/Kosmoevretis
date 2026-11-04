# Kosmoevretis Design System

## Source of truth

Kosmoevretis uses IBM Carbon Design System v11 as its visual foundation. Carbon semantic theme tokens and Carbon component styles are the source of truth. Product-level aliases are defined only in `src/styles/design-tokens.scss`.

## Theme

- Default theme: Carbon Gray 10 (`g10`).
- Theme CSS custom properties are emitted by `src/styles/carbon.scss`.
- The app entry imports styles in this order: Carbon Sass, product design tokens, then global application styles.
- Do not introduce page-local color palettes or duplicate semantic aliases.

## Layer-first composition

Use surface contrast and spacing to establish hierarchy:

1. `background`: page canvas.
2. `layer-01`: primary structural regions such as the navigation rail.
3. `layer-02`: nested content surfaces and active navigation.
4. `layer-03`: deeper nested surfaces where needed.

Use Carbon semantic border tokens only when a real boundary, data separation, input affordance, or interaction state needs to be communicated. Do not outline every card or section by default. Decorative shadows are not part of the default visual language.

## Tokens

- Colors: `--app-color-*` aliases to Carbon semantic `--cds-*` variables, including support-error and inverse-surface/text aliases for error states and raw-data previews.
- Spacing: `--app-space-*` aliases to Carbon's spacing scale.
- Typography: `--app-font-family` and `--app-type-*` aliases.
- Shape and motion: shared radius, shadow, and motion aliases.
- Shell geometry: shared header height, sidebar width, and content max width.

New application styles must consume these aliases instead of adding local hex values or arbitrary spacing values. Page migration may temporarily retain existing legacy values; they must be removed as each page is migrated.

## AppShell

The shared shell is implemented in `src/app/AppShell.tsx` and styled in the shared section of `src/styles/global.scss`.

- Header: fixed global navigation surface.
- Sidebar: Carbon `layer-01`, without a permanent separator border.
- Active navigation: `layer-02` plus the interactive accent.
- Main content: page background, shared content max width, and consistent gutters.
- Mobile navigation: overlay navigation with an accessible close action and backdrop.

## Shared page composition

`src/components/ui/PageHeader.tsx` provides the shared page-title pattern. It standardizes eyebrow, title, description, and optional metadata/action placement while allowing feature pages to retain their existing semantic class names during migration. Its layout contract is styled in `src/styles/page-layout.scss` and consumes the shared typography, color, and spacing aliases.

Use this primitive for top-level feature pages instead of re-creating a page header in each feature. The enterprise profile, AI analysis, AI work center, research-task detail, and standalone analysis-results pages now use it; their existing feature classes are retained only as styling hooks. Keep page-specific content and task controls within the feature; do not turn the shared header into a page-specific toolbar.


## Component primitives

`src/styles/component-primitives.scss` provides shared composition classes for surfaces, section headings, action groups, horizontally scrollable data regions, and empty states. These primitives use Carbon layer and spacing tokens. Feature pages should adopt them rather than recreating bordered cards or bespoke data wrappers. The surface variants are intentionally borderless: use background contrast and spacing for hierarchy, and reserve borders for actual input affordances or dense data separation. Metric groups should use layer contrast and spacing rather than 1px border-colored gridlines; map labels should use a contrasting layer surface instead of an outline when that provides sufficient separation. Choice groups and compact metric collections should follow the same rule: use Carbon spacing between layer surfaces, while keeping Carbon checkbox, radio, input, select, and button interaction states intact. Page content containers share `--app-content-max-width`; status strips, provider cards, report metrics, and task metadata collections use spacing between layer surfaces instead of 1px border-colored gridlines. Keep dense record lists and table rows distinguishable with subtle data separators.

## Enterprise intelligence pages

`src/styles/intelligence-pages.scss` is the shared layout and component styling layer for enterprise profile editing, the four-step enterprise workflow, AI model allocation and execution, and analysis result reporting. It is loaded after the global and shared primitive styles. Keep these page styles on Carbon semantic aliases and the shared spacing scale; preserve feature-owned data and task behavior when adjusting presentation.

## AI work center

The task list and research-task detail share `src/features/ai-work-center/ai-work-center.scss`. Use the semantic layer and spacing aliases for status summaries, filters, task metadata, execution history, result previews, and raw-data panels. Keep Carbon status tags and controls as the interaction primitives; use borders only for dense table or timeline separation. Preserve task loading, polling, retry, bulk archive/trash/restore, and export behavior when changing presentation.

## Responsive grid

Use Carbon 2x grid breakpoints as the reference:

| Breakpoint | Width |
|---|---:|
| Small | 320px |
| Medium | 672px |
| Large | 1056px |
| X Large | 1312px |
| Max | 1584px |

The AppShell switches to compact desktop navigation below 1056px and to an overlay navigation below 672px. In CSS max-width queries, use 1055px and 671px respectively so the transition aligns with the same 1056px / 672px grid boundaries. Feature page layouts must use these shared boundaries rather than inventing unrelated breakpoints. Market Trends and Keyword Research now follow this contract.

## Review checklist

- [ ] Colors come from Carbon semantic tokens or approved aliases.
- [ ] Background layers, not card outlines, establish the main hierarchy.
- [ ] Borders are limited to meaningful structure and component affordances.
- [ ] No decorative box shadows.
- [ ] Spacing uses Carbon spacing aliases.
- [ ] Typography uses Carbon type tokens and IBM Plex Sans.
- [ ] AppShell dimensions and responsive transitions are shared.
- [ ] Page-specific CSS does not redefine global shell behavior.
- [ ] Keyboard focus and reduced-motion behavior remain accessible. Focus-visible styling is centralized in `src/styles/global.scss`, including native disclosure summaries.

## Shell breakpoint ownership

AppShell responsive behavior is defined once in `src/styles/global.scss`: compact desktop navigation begins below 1056px and overlay navigation begins below 672px. Do not add parallel legacy 900px/720px shell breakpoint blocks. Feature-owned responsive rules may use the same Carbon grid breakpoints for their own content, but must not redefine `.sidebar`, `.main`, `.topbar`, or the shared navigation overlay.


## Platform settings and integrations

`src/styles/settings-pages.scss` owns the layout and visual treatment for the AI service directory, provider configuration, Apify credentials, diagnostics, and security panels. It is loaded after the shared page and intelligence styles. Keep credentials and integration behavior in feature components; the stylesheet only standardizes Carbon layers, spacing, responsive grids, and data regions. Use status text and Carbon semantic support tokens rather than decorative card outlines.
