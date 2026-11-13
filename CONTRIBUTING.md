# Contributing

This repo is the Shopify theme behind shopdevalliance.com. Changes reach the site through a pull request into `main` that a maintainer reviews and merges. Nobody, person or agent, pushes theme files to the store from their own machine.

Using an AI agent? Point it at [`AGENTS.md`](./AGENTS.md) first.

## Before you start

- Read [`CLAUDE.md`](./CLAUDE.md) for coding conventions and [`DESIGN.md`](./DESIGN.md) for colors, type and components.
- For anything bigger than a fix, check `Planning/` for an existing plan. If there isn't one, write a short plan in `Planning/<area>/` and agree it with a maintainer before building.
- Search open PRs so two people don't build the same thing.

## Branches

Branch from an up-to-date `main` and name the branch after the work:

| Prefix | For | Example |
|---|---|---|
| `feature/` | New sections, features, site changes | `feature/members-directory` |
| `blog/` | The blog and article templates | `blog/launch` |
| `update/` | Dawn version updates | `update/dawn-15-0-0` |

One concern per branch. A scrollbar tweak and a new section are two PRs.

## Local preview

You need [Shopify CLI](https://shopify.dev/docs/themes/tools/cli) and store access from a maintainer.

```sh
shopify theme dev -s shopdev-alliance
```

This serves your local files on a temporary development theme; it does not change the live theme. Don't run `shopify theme push` or `publish`. Deploys are a maintainer's call.

Merchants edit `templates/*.json` and `config/settings_data.json` in the theme editor. Before you change one, pull the current version from the live theme (ask a maintainer for its ID) and build on that, or you will undo their edits.

## Pull requests

- Open the PR against `main`. Open it as a draft while you are still working.
- Title: a short imperative sentence ("Add member benefit badges").
- Description:
  - what changed and why
  - how you checked it (`shopify theme check` compared with `main`, the pages you looked at, desktop and phone)
  - before and after screenshots for anything visible
  - any editor-owned JSON you touched, with the keys you changed
- Keep the PR small enough to review in one sitting. Split large work into a stack of PRs.
- Respond to review on the same branch; don't open a replacement PR.

## Checks before review

- `shopify theme check` adds no new offenses compared with `main`.
- Pages render with no console errors at desktop width (1080px and up) and phone width.
- Keyboard: every control can be reached and shows a focus ring.
- No secrets, passwords, tokens or member data in code, commits or screenshots.
