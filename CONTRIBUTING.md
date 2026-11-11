# Contributing

Thanks for taking an interest in Kernel.

## Development

- Use Node.js 22 LTS or newer (20.19+ minimum).
- Install dependencies with `npm install`.
- Start the local site with `npm run dev`.
- Run `npm run check` and `npm run build` before submitting changes.

The Vite dev server proxies `/api/tokenjuice/*` to TokenJuice. The production Vercel Function lives in `api/tokenjuice/[...path].js`.

## Commit messages and releases

Use Conventional Commits:

- `feat: ...` for new functionality (minor release)
- `fix: ...` for bug fixes (patch release)
- `docs: ...`, `refactor: ...`, `perf: ...`, and `test: ...` for maintenance and improvements
- `feat!: ...` or another `type!: ...` for a breaking change (major release)

Release Please maintains a release PR from commits on `main`. Merging that PR updates the package version and changelog, creates a Git tag and publishes a GitHub Release. Vercel deploys pushes to `main` and creates previews for pull requests when Git integration is enabled.

## Pull requests

Keep changes focused. Include the reason for a change, how it was tested, and any relevant screenshots for UI changes. Never include API keys, access tokens, `.env` files, private chat exports, or browser storage data.
