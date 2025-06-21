# Code Standards

## TypeScript Requirements

- Target: TypeScript 5.x+
- Use: ESM, readonly properties, const assertions, union types over enums, optional chaining, nullish coalescing, parameter properties, discriminated unions, exhaustive checks, strict null checks, utility types
- Compiler Settings: ES2022, ESNext, strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, useUnknownInCatchVariables
- Quality Standards: Follow Airbnb Style Guide, use Prettier, ESLint with @typescript-eslint, prefer composition, dependency injection, immutability, avoid any
- Static Analysis: Use Zod/io-ts, ts-prune, run tsc/eslint in CI
- Error Handling: Custom error classes, unknown in catch blocks, handle expected errors only

## 🧱 HTML/CSS Requirements

### 📄 HTML

- ✅ Use **HTML5 semantic elements**:
  - `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`, `<search>`, etc.
- ✅ Add **ARIA attributes** where needed to ensure accessibility (`aria-label`, `aria-hidden`, etc.)
- ✅ Ensure **valid, semantic markup** that passes **W3C HTML validation**
- ✅ Implement **responsive design** best practices
- ✅ Optimize images:
  - Use modern formats: **WebP** or **AVIF**
  - Use `loading="lazy"` for non-critical images
  - Provide `srcset` and `sizes` for **responsive image loading**
- ✅ Prioritize SEO with:
  - `<title>` tag
  - `<meta name="description">`
  - Open Graph (`<meta property="og:*">`) and Twitter Card metadata
- ✅ Use appropriate `lang` attribute on `<html>` and logical heading order (`<h1>` to `<h6>`)

### 🎨 CSS (with `styled-components`)

- ✅ Use **`styled-components`** for all styles
- ✅ Use ThemeProvider from styled-components to support light/dark theme switching
  - Define light and dark theme objects (e.g., lightTheme, darkTheme)
  - Pass them via ThemeProvider at the root of the app
  - Use prefers-color-scheme media query to determine initial theme
  - Consume theme variables via props.theme in styled components
- ✅ Utilize **CSS Grid** and **Flexbox** for layouts
- ✅ Use **CSS Custom Properties** (variables) where applicable (via `:root` or theme object)
- ✅ Implement **CSS transitions and animations** using keyframes or `transition` props
- ✅ Add **responsive design** using media queries (via `styled-components`' `css` helper)
- ✅ Use **logical properties** like `margin-inline`, `padding-block` for better internationalization
- ✅ Leverage **modern CSS selectors**:
  - `:is()`, `:where()`, `:has()` (when browser support allows)
- ✅ Apply a consistent **naming methodology** (preferably BEM or a scoped naming convention)
- ✅ Use **CSS nesting** (via `styled-components` syntax or enabled CSS nesting config)
- ✅ Support **dark mode** with `prefers-color-scheme` media query and theme switching
- ✅ Use **modern, performant fonts**, preferably **variable fonts** (e.g., via `@font-face` or Google Fonts)
- ✅ Prefer **responsive units** like `rem`, `em`, `vh`, `vw` over `px`

## Folder Structure

Follow this monorepo layout:

    project-root/
    ├── backend/              # TypeScript backend
    │   └── src/              # Source files with controllers, models, services, etc.
    ├── frontend/            # React/TypeScript frontend
    │   └── src/             # Components, features, hooks, services, styles
    └── docker-compose.yml   # Container orchestration

## Browser Compatibility

- Prioritize feature detection (`if ('fetch' in window)` etc.)
- Support latest two stable releases of major browsers:
  - Firefox, Chrome, Edge, Safari (macOS/iOS)
- Emphasize progressive enhancement with polyfills or bundlers (e.g., **Babel**, **Vite**) as needed.

## Dependencies and Versioning

- Core dependencies:

  - React: ^18.2.0
  - TypeScript: ^5.0.0
  - Node.js: ^18.0.0
  - PostgreSQL: ^15.0
  - Express: ^4.18.0
  - Sequelize: ^7.0.0
  - Jest: ^29.0.0
  - Playwright: ^1.35.0
  - Styled-components: ^6.0.0
  - React Query/TanStack Query: ^4.0.0
  - Zod: ^3.21.0

- Dependency management:

  - Use package.json with specific version ranges (^major.minor.patch)
  - Lock dependencies with package-lock.json or yarn.lock
  - Regularly audit dependencies for security vulnerabilities
  - Update dependencies on a scheduled basis (monthly for security, quarterly for features)
  - Test thoroughly after dependency updates

- Version control:
  - Follow Semantic Versioning (SemVer) for all internal packages
  - Use Conventional Commits for commit messages
  - Tag releases with version numbers
  - Maintain a detailed CHANGELOG.md
  - Branch naming: feature/, bugfix/, hotfix/, release/
