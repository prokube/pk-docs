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

## Versioned Docs

This site uses `vitepress-versioning-plugin` for documentation versions.

- Full version snapshots live under `docs/versions/<version>/` and publish under `/docs/<version>/`.
- The full docs trees are currently `docs/versions/development/` and `docs/versions/1.9/`.
- The version selector currently lists `/docs/development/` and `/docs/1.9/`.
- When switching versions, the selector keeps the current page path if that page exists in the target version, for example `/docs/development/labs/` switches to `/docs/1.9/labs/`.
- `/docs/latest/` is an unlisted redirect-only alias to the latest released version, currently `/docs/1.9/`.
- `/docs/` redirects to the latest released version, currently `/docs/1.9/`.
- The sidebar is defined once in `docs/.vitepress/config.mts`; version-specific sidebar links are generated from that shared definition.
- Keep shared static assets under `docs/public/` unless a screenshot or asset must be version-specific.

Run `npm run build` after adding or changing a version.

### Release Workflow

When publishing a new release, copy the current development snapshot into a new release version and update the redirects.

For example, to release `2.0` from `development`:

```bash
cp -R docs/versions/development docs/versions/2.0
```

Then update:

- `docs/.vitepress/config.mts`: add the new release to the visible versions and sidebars, then update latest-release nav links.
- `docs/index.md`: change the root redirect from `./1.9/` to the new latest release, for example `./2.0/`.
- `docs/versions/latest/index.md`: change the alias redirect from `../1.9/` to the new latest release, for example `../2.0/`.
- this README: update the current latest release references.

Keep editing unreleased docs under `docs/versions/development/` after the release is cut.
