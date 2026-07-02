# Agent Instructions

## Project

This repository contains the new public documentation site for prokube.ai.

- Build new documentation here on a green field.
- Existing documentation can be used as source material and factual reference.
- Do not copy legacy pages verbatim into this repository.
- Prefer native pages that fit this site's structure, tone, and information architecture.
- The generated site is static and intended to be deployable under `/docs/`.

## Branding And Tone

- Always write the product name as `prokube.ai`.
- Do not write `ProKube`, `Prokube`, or standalone `prokube` in user-facing content.
- Use a sober, developer-friendly tone.
- Be concise, specific, and information-dense; avoid marketing filler, AI buzzword-heavy phrasing, and non-value-adding side remarks.
- Edit hard: remove throat-clearing, repetition, and sentences that do not help the reader act or decide.
- Explain operational and security implications plainly.

## Content Guidelines

- Treat docs as product documentation, not as implementation notes.
- Prefer short pages with clear headings, task-oriented sections, and concrete examples.
- Keep facts aligned with the current platform behavior.
- If facts are uncertain, verify in source repos or ask before documenting.
- Do not document planned behavior as existing behavior.
- Avoid exposing credentials, tokens, internal-only URLs, or customer-specific details.

## Source Repositories

Use sibling repositories as references when checking facts. Do not assume they are already cloned or located at a fixed absolute path.

Before relying on another repo:

- Check whether it exists next to this repository.
- If it is missing and the task requires it, clone it from the prokube GitHub organization or ask if the correct remote is unclear.
- Do not reference temporary worktrees, local-only branches, or non-persistent paths in documentation.

Useful repositories:

- `pkui`: current UI and backend behavior. Use this for user-facing feature names, API routes, UI flows, screenshots, and operational behavior exposed through pkui.
- `pkui/frontend`: React frontend modules and visible UI labels. Check this when documenting navigation, forms, pages, or screenshots.
- `pkui/backend-main`: main FastAPI backend. Check this for API semantics, auth headers, namespace/workspace behavior, and feature capabilities.
- `prokube`: platform repository for cluster components, ingress/auth/gateway configuration, and deployment facts.
- `prokube-neo`: companion repository to `prokube` for the newer platform stack and docs prototype material. Use its docs as source material, not as page structure to preserve.
- `prokube-images`: container image definitions, including sandbox images. Check this when documenting available sandbox images or image capabilities.
- `prokube-website`: public website implementation, branding assets, visual language, and Cloud Build/deployment hints.
- `prokube-sdk` and `prokube-sdk-ts`: SDK behavior, examples, auth headers, and client-side API paths.
- `sandbox-mcp`: MCP server behavior for prokube.ai Sandboxes.
- Legacy docs at `docs.prokube.ai`: reference for historical coverage and terminology. Validate before reusing any facts.

When repos disagree, prefer current shipped behavior in `pkui` and persistent platform configuration in `prokube`/`prokube-neo`. Note uncertainty rather than guessing.

## Technical Guidelines

- This is a VitePress site using content under `docs/`.
- VitePress config lives in `docs/.vitepress/config.mts`.
- Theme styling lives in `docs/.vitepress/theme/style.css`.
- Static assets should live under `docs/public/`.
- The default base path is `/docs/`; preserve this unless explicitly asked to change it.
- `cleanUrls` is disabled intentionally for static GCS-friendly `.html` links.

## Git Workflow

- Work on feature branches for non-trivial changes.
- For assigned GitHub issues, create an isolated worktree from `origin/main` before editing:

```bash
git fetch origin main
git worktree add worktrees/issue-<number> -b feature/issue-<number> origin/main
```

- Do all issue work inside the issue worktree.
- Do not work on multiple issues in the same worktree.
- Stage only files that are part of the change; never use `git add .` or `git add -A`.
- Commit with a concise, descriptive message after verifying the change.
- Push the branch after committing when working in a repo with a configured remote.
- If creating a PR, include a short summary and the verification command that was run.

## Local Commands

Use these from the repository root:

```bash
npm run dev
npm run build
npm run preview
```

Build output is written to:

```text
docs/.vitepress/dist
```

Run `npm run build` before committing changes to VitePress config, theme files, navigation, or content that may affect the site build.

## Editing Rules

- Make the smallest correct change.
- Preserve the existing VitePress structure and visual direction.
- Add pages to the sidebar/nav when they become part of the public docs flow.
- Use Markdown features supported by VitePress.
- Prefer relative links that work with the `/docs/` base path and current `.html` link style.
- Keep examples copy-pasteable and avoid placeholders where real safe examples are possible.
- Do not change package dependencies with ad-hoc commands unless the task requires it.
- If dependencies change, commit `package.json` and `package-lock.json` together.
- Do not commit generated build output from `docs/.vitepress/dist` unless explicitly requested.

## Issue Workflow

When working from a GitHub issue:

- Read the full issue before making changes.
- Check whether it is blocked by another open issue before starting.
- Claim the issue only when you are ready to work on it.
- If blocked, leave a clear issue comment describing the blocker and what decision is needed.
- Do not manually close issues that should be closed by a PR; use `Closes #<number>` in the PR body.

## Legacy Material

Legacy docs and related repos may be used to understand product behavior, terminology, and screenshots.

When using legacy material:

- Validate that the behavior still applies.
- Adapt content to this site's structure and voice.
- Replace outdated tooling, commands, screenshots, or terminology.
- Do not preserve legacy page structure just because it exists.
