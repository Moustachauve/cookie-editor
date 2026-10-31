# AGENTS.md

Guidance for AI coding agents (and humans) working on Cookie-Editor, a cookie manager extension for Chrome, Firefox, Edge, Opera and Safari.

## Setup

- Node.js 22 (same as CI). Install with `npm ci`.
- For E2E tests, install the Playwright browser once: `npx playwright install chromium`.

## Commands

| Task | Command |
| --- | --- |
| Lint (ESLint + Prettier, Google style) | `npm run lint` |
| Auto-fix lint and formatting | `npm run lint:fix` |
| Unit tests (Node test runner, jsdom, sinon) | `npm test` |
| Chrome E2E tests (builds `build/chrome` first) | `npm run test:e2e` |
| Build Chrome only | `npx grunt build-chrome` |
| Build Safari only | `npx grunt build-safari` |
| Full release build: lint, all browsers, zips in `dist/<version>/` | `npx grunt` |

CI (`.github/workflows/npm-grunt.yml`) runs lint, unit tests and Chrome E2E tests on every pull request to `master`. Run all three locally before opening a PR.

## Project layout

- `cookie-editor.js`: background service worker (connections, messages, tab and cookie change events).
- `interface/lib/`: shared logic. Key files: `genericCookieHandler.js` (cookie API wrapper), `permissionHandler.js` (host permissions), `browserDetector.js` (browser detection and API access), `cookie.js` (one cookie row in the UI), `animate.js` (UI animations), `jsonFormat.js`, `netscapeFormat.js`, `headerstringFormat.js` (import and export formats), `optionsHandler.js` and `options/` (user settings), `ads/` (ad handling).
- `interface/popup/`: desktop popup UI. `interface/popup-mobile/`: Firefox Android popup. `interface/sidepanel/`, `interface/devtools/`, `interface/options/`: the other surfaces.
- `manifest.<browser>.json`: one manifest per browser. The build copies the right one to `build/<browser>/manifest.json` and sets `version` from `package.json`.
- `test/*.test.js`: unit tests; `test/mocks/sinonBrowserMock.js` mocks the extension APIs and sets up the DOM. `test/e2e/`: Playwright tests that load `build/chrome` into Chromium (`fixtures.js` grants host permissions and serves a local test page).
- `safari/`: Xcode project for the Safari app extension.
- Generated, never edit or commit: `build/`, `dist/`, root `manifest.json`, `test-results/`, `playwright-report/`.

## Conventions

- Plain JavaScript ES modules, no bundler. Files under `interface/` are copied into the build as they are.
- Always reach extension APIs through `BrowserDetector` (`browserDetector.getApi()`), not `chrome.*` or `browser.*` directly, so every browser keeps working. Check `browserDetector.isFirefox()`, `isSafari()` and similar for browser-specific code.
- `@@browser_name` (see `interface/lib/env.js`) is replaced with the target browser name at build time.
- Formatting is enforced by Prettier through ESLint: 2 spaces, single quotes, semicolons, 80 columns, sorted imports (`simple-import-sort`). Public functions and classes have JSDoc comments.
- `console.log` calls are stripped from release builds (except Safari), so logging is fine for debugging but should not carry logic.
- When animations are turned off, the body gets the `notransition` class and CSS transitions do not run. Code that waits for `transitionend` must also work without it.
- Partitioned cookies (CHIPS) are supported: keep `partitionKey` and the `Secure` flag when reading, editing, exporting and importing cookies, and do not merge cookies that only differ by partition.

## Testing changes

- Add or update a unit test in `test/` for logic changes; add an E2E case in `test/e2e/extension.spec.js` for popup behaviour.
- Permission behaviour differs by browser: on Chrome, `cookies.getAll()` only returns cookies for origins the extension has host permission for, including the cookie's own scheme. Test with both Secure and non-Secure cookies.
- Firefox is not covered by CI. For Firefox changes, build with `npx grunt` and load `build/firefox` as a temporary add-on, and check the browser console for manifest warnings.

## Pull requests

- Keep PRs small and focused on one issue, and reference it (for example `Fixes #123`).
- Describe what you tested and on which browsers and versions.
- Do not bump the version or edit `dist/`; releases are handled by the maintainer.
