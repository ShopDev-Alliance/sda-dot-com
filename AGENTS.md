# AGENTS.md

Rules for AI coding agents, and for anyone driving one, in this repo. `CLAUDE.md` loads this file, so Claude Code reads it too. Other agents read it directly.

This is the Shopify theme for shopdevalliance.com: Dawn 15.0.0 plus custom sections (the blog, members, briefings, benefits, the globe). Store handle: `shopdev-alliance` (`shopify.theme.toml`).

## Where things live

| Need | File |
|---|---|
| Liquid, JS and CSS coding conventions | [`CLAUDE.md`](./CLAUDE.md) |
| Colors, type, tokens, components | [`DESIGN.md`](./DESIGN.md) |
| Branches, PRs, local preview | [`CONTRIBUTING.md`](./CONTRIBUTING.md) |
| The plan behind a feature | `Planning/<area>/` (read it before changing that area) |
| Store and preview theme | [`README.md`](./README.md) |

## Hard limits

Stop and ask a maintainer before any of these. Approval in an issue or PR comment counts; your own judgment does not.

- **No store writes.** No `shopify theme push`, `publish`, `delete` or `rename`, no Admin API mutations, no metafield or metaobject definition changes. A push to the wrong theme ID changes the live site at once. Reading (`theme pull` to a scratch folder, `theme check`) is fine.
- **No git writes to shared branches.** Never push to `main`, never force-push, never merge a PR. Work on a branch and open a PR.
- **Editor-owned JSON stays as the editor left it.** Merchants edit `templates/*.json`, `sections/*-group.json` and `config/settings_data.json` in the theme editor. A code change that rewrites them can undo that work. Change only the keys your task needs, and list each one in the PR.
- **No secrets or personal data** in files, commits, screenshots or PR text: tokens, storefront passwords, customer or member details.
- **Stay in scope.** Edit only the files the task needs. If another file has to change, say which and why before touching it.

## Building

**Extend Dawn; don't fork its shared files.** `assets/base.css`, `assets/global.js` and `layout/theme.liquid` load on every page and are what a Dawn update has to merge. Put a section's needs in that section's files.

**CSS**
- Section CSS lives in `assets/section-<name>.css`, loaded by that section with `stylesheet_tag`, as `sections/sda-article.liquid` does. Small one-off sections may keep an inline `<style>` per `CLAUDE.md`. Follow whichever pattern the file you are editing already uses.
- Scope every rule under the section's root class (`.sda-article …`). Unscoped rules leak into Dawn sections.
- Colors come from tokens (`--sda-*`) or color scheme variables (`rgb(var(--color-foreground))`). No new raw hex outside a token block. See `DESIGN.md`.
- New brand components use the `sda-` class prefix. Plain names collide with Dawn: `.section` is on every Dawn section wrapper and `.article` is used by the blog listing.
- No `!important`. Fix the selector instead.

**JavaScript**
- One custom element per component, registered behind `if (!customElements.get('name'))`, loaded with `defer` from the section that uses it (see `assets/sda-article.js`).
- `const` and `let` only, never `var`. Listeners clean up when the element reconnects (`AbortController`, as in `sda-article.js`).
- Respect `prefers-reduced-motion`: no smooth scroll or animation when it is set to `reduce`.

**Liquid**
- Follow `CLAUDE.md`: `{% liquid %}` blocks, initialise a variable and then reassign it, `.count` on metaobject lists.
- New snippets open with a `{% doc %}` block listing every `@param`, like the `snippets/sda-*.liquid` files.
- User-facing text goes through `{{ 'key' | t }}`: storefront strings in `locales/en.default.json`, editor labels in `locales/en.default.schema.json`. URLs come from `routes.*`. Escape merchant and member content.
- Dependent schema settings are gated with `visible_if`.

**Accessibility**
- Keep the visible focus ring (`:focus-visible`, 2px `--sda-orange` outline). Never remove an outline without replacing it.
- Interactive targets are at least 44px tall. Toggles carry `aria-expanded` and `aria-controls`. Decorative elements are `aria-hidden`.

## Before you call it done

1. `shopify theme check`, compared with `main`. The baseline already has offenses; your branch must not add any.
2. Theme Check does not prove `{% schema %}` JSON parses. Check any schema you touched separately.
3. Render the change on a preview theme, at desktop width (1080px and up) and at phone width, with no console errors. Tab through it with the keyboard.
4. In the PR, list what you ran and attach before and after screenshots for anything visible.

If you did not run a check, do not say it passes.
