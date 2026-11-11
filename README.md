# Kernel

**A personal, local-first AI workspace. Bring your own model, key, personality, and agent files.**

Kernel is an open-source browser application built with Vite and Tailwind CSS v4. The production site is static HTML, CSS, and JavaScript plus a small same-origin Vercel Function that streams requests to the default TokenJuice provider.

## Features

- First-run connection page with an API-key test before opening the workspace.
- TokenJuice defaults: `https://api.tokenjuice.ai/v1` and `deepseek-ai/DeepSeek-V4.1-Flash-1017`.
- OpenAI-compatible custom API endpoints and model IDs.
- Streaming responses, DeepSeek thinking controls, and configurable reasoning effort.
- Multiple conversations, search, edit/regenerate, import, and export.
- Editable `AGENTS.md`, `SOUL.md`, `USER.md`, `MEMORY.md`, and `TOOLS.md` workspace instructions.
- Custom personality presets, image/text attachments, and syntax-highlighted code blocks.
- Browser-local conversations, settings, and agent files. No Kernel account or hosted chat database.

## Run locally

Requires Node.js 22 LTS (Node.js 20.19+ is the minimum supported version).

```bash
npm install
npm run dev
```

Vite proxies `/api/tokenjuice/*` to TokenJuice during local development. To create the production build:

```bash
npm run check
npm run build
```

The static output is written to `dist/`.

## Deploy to Vercel

The repository is configured for Vercel. Once the GitHub repository is connected to a Vercel project, Vercel automatically:

- creates preview deployments for pull requests and non-production branches;
- deploys pushes to the configured production branch (`main`) to production.

Project settings:

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Install command | `npm install` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js runtime | 22.x |

The Vercel Function in `api/tokenjuice/[...path].js` is the production API proxy. It accepts only the `chat/completions` and `models` paths, rejects cross-origin browser requests, forwards the user's Bearer key to the fixed TokenJuice origin, streams responses, and does not persist or log API keys. The Vercel function is configured for a 60-second maximum duration.

### Vercel CLI (optional)

```bash
npm install
npx vercel login
npx vercel link
npx vercel deploy --prod
```

Git integration is the recommended deployment path; direct CLI deploys are mainly for local previews and recovery.

## API key and privacy

- Each user supplies their own API key on the first-run page.
- The key is stored in that user's browser session by default. The user may explicitly choose to remember it in local storage.
- The key is sent in the `Authorization` header to the configured API provider. For the default TokenJuice endpoint, the request passes through this repository's same-origin Vercel Function. The function forwards the key and does not persist or log it.
- Vercel necessarily handles the request while proxying it. Do not use a shared or privileged key in a public deployment.
- Conversations, agent files, settings, and attachments stay in that browser's storage. They are not synchronized to Vercel or GitHub.
- Browser storage is not a secure vault. Anyone with access to that browser profile may be able to inspect locally stored data.

## Open source and releases

Kernel is licensed under the MIT License. Contributions are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).

Releases are managed by [Release Please](https://github.com/googleapis/release-please). Commits should follow Conventional Commits:

- `fix: ...` → patch release
- `feat: ...` → minor release
- `feat!: ...` or `fix!: ...` → major release

Release Please opens or updates a release pull request on `main`. Merging that PR updates the version and changelog and creates a Git tag and GitHub Release. Vercel's Git integration then deploys the merged `main` commit.

## Project structure

```text
api/tokenjuice/[...path].js  Vercel streaming API proxy
public/                      Static PWA assets
src/main.css                 Tailwind CSS v4 entry point
src/main.js                  Vite entry point
index.html                   First-run screen and app shell
app.js                       Chat, streaming, settings, and local storage
styles.css                   Workspace styles
vite.config.js               Vite and local API proxy
vercel.json                  Vercel build, function, and security settings
```

## License

MIT. See [LICENSE](LICENSE).
