# prokube.ai Docs

This repository contains a VitePress prototype for the public prokube.ai documentation site.

The intended model is:

- New product documentation lives here.
- Existing documentation remains available at [docs.prokube.ai](https://docs.prokube.ai/) while sections are rewritten.
- Do not copy legacy pages into this tree. Add native pages as they are rewritten.
- The generated site is static and can be deployed to a Google Cloud Storage bucket under `/docs/`.

## Local Preview

Install dependencies:

```bash
npm install
```

Run a local dev server:

```bash
npm run dev
```

Build the static site:

```bash
npm run build
```

The build output is written to `docs/.vitepress/dist`.

## Base Path

The default base path is `/docs/`. Override it for local experiments with:

```bash
VITEPRESS_BASE=/ npm run build
```
