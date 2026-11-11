# Changelog

All notable changes to Kernel are documented here. This file is maintained by Release Please.

## [1.0.0](https://github.com/xayuki/kernel/compare/kernel-v0.2.0...kernel-v1.0.0) (2026-11-11)


### ⚠ BREAKING CHANGES

* complete Kernel redesign with preserved streaming fixes

### Features

* complete Kernel redesign with preserved streaming fixes ([420a129](https://github.com/xayuki/kernel/commit/420a12942c6a800be48bfe157cc90fa1dc46efb6))
* publish Kernel Vercel workspace ([e57bc84](https://github.com/xayuki/kernel/commit/e57bc84d9e215e748d6b760f728dbb2fcea8c776))


### Fixes

* add explicit chat completions function route ([600a389](https://github.com/xayuki/kernel/commit/600a389d9e982c3867ef0872dae88425a5fc3dbf))
* add explicit models function route ([689bd46](https://github.com/xayuki/kernel/commit/689bd4676548dd9cc40b5dffd5a7b065a7655407))
* make TokenJuice API routes explicit for Vercel ([2160b1a](https://github.com/xayuki/kernel/commit/2160b1a9658df42640610ee43443d5509a164376))
* repair proxy validation and CI checks ([#8](https://github.com/xayuki/kernel/issues/8)) ([ec3e717](https://github.com/xayuki/kernel/commit/ec3e7177d8c69908afd3140d303b851cb6d32987))
* replace catch-all proxy with explicit routes ([d4edfdb](https://github.com/xayuki/kernel/commit/d4edfdbcf23a01bc281ae0aa456235ce818ff04a))
* share TokenJuice proxy handler ([49a455b](https://github.com/xayuki/kernel/commit/49a455b7ecdfa7ba01c8dab850ae6fbf6581e7d4))
* smooth workspace handoff and springy chat motion ([8e87080](https://github.com/xayuki/kernel/commit/8e87080f97cacc16590b6157875e527adebb54f2))

## [0.2.0](https://github.com/xayuki/kernel/compare/kernel-v0.1.0...kernel-v0.2.0) (2026-11-11)


### Features

* publish Kernel Vercel workspace ([e57bc84](https://github.com/xayuki/kernel/commit/e57bc84d9e215e748d6b760f728dbb2fcea8c776))

## 0.1.0

### Features

- Initial public release of the Kernel personal AI workspace.
- Tailwind CSS v4 and Vite production build.
- First-run API-key connection screen and browser-local workspace.
- Streaming chat, model controls, personality settings, agent files, image attachments, and syntax-highlighted code blocks.
- Same-origin Vercel Function proxy for TokenJuice chat completions and model listing.
