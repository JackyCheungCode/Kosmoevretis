# Application Architecture

- Feature-first modules with independently owned routes.
- Shared shell and design tokens live outside feature modules.
- Internal navigation uses React Router.
- Cloudflare Pages deep links are served through public/_redirects.
- API/data access is isolated from presentation.
- A page is delivered and reviewed before the next feature page is implemented.

## Structure

- src/app: router, providers, application shell
- src/components: reusable cross-feature UI
- src/features: isolated product modules and route pages
- src/styles: global tokens and application styling
- src/main.tsx: application entry

## First route

- /dashboard — first delivered page