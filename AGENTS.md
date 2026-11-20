# AGENTS.md

Rules for AI coding agents, and for anyone driving one, in this repo. `CLAUDE.md` loads this file, so Claude Code reads it too. Other agents read it directly.

This is the Shopify theme for shopdevalliance.com: Dawn 15.0.0 plus custom sections (the blog, members, briefings, benefits, the globe). Store handle: `shopdev-alliance` (`shopify.theme.toml`).

## Where things live

| Need | File |
|---|---|
| Liquid, JS and CSS coding conventions | [`CLAUDE.md`](./CLAUDE.md) |
| Colors, type, tokens, components | [`DESIGN.md`](./DESIGN.md) |
| Branches, PRs, local preview | [`CONTRIBUTING.md`](./CONTRIBUTING.md) |
| The plan behind a feature | An area folder (`Planning/blog/`) or a single file (`Planning/sda-globe.md`); read it before changing that area |
| Store and preview theme | [`README.md`](./README.md) |

## Who leads

The person driving the agent leads. Their instructions in the session come before this file's defaults. Follow narrower rules they set, such as no git commands, no browser, no dev server or no checks.

Do not start checks, follow-up tasks or cleanup on your own initiative. Do what was asked, then report. This file never widens what the person allowed. The hard limits below still apply unless a maintainer approves an exception.

## Hard limits

Stop and ask a maintainer before any of these. A direct instruction from a maintainer in the working session, or approval in an issue or PR comment, counts; your own judgment does not. Approval covers the specific action asked for, not later ones. A maintainer is the repo owner or someone the owner has given merge rights.

- **No store writes.** No `shopify theme push`, `publish`, `delete` or `rename`, no Admin API mutations, no metafield or metaobject definition changes. A push to the wrong theme ID changes the live site at once. Reading (`theme pull` to a scratch folder, `theme check`) is fine.
  - **Store data with permission.** Creating or editing store data, such as metaobject entries through `shopify store execute`, is a store write. It is allowed only when a maintainer has asked for that specific change in the session.
  - Before running it, show the exact command or mutation and what it will change, and wait for a yes. Afterwards, report what was created or changed.
  - One approval covers one change; a later change needs a new yes.
  - Theme `push`, `publish`, `delete` and `rename`, and metafield or metaobject definition changes, stay off limits unless a maintainer approves that specific action the same way.
- **No git writes to shared branches.** Never push to `main`, never force-push, never merge a PR. Work on a branch and open a PR.
- **Editor-owned JSON stays as the editor left it.** Merchants edit `templates/*.json`, `sections/*-group.json` and `config/settings_data.json` in the theme editor. A code change that rewrites them can undo that work. Change only the keys your task needs, and list each one in the PR.
- **No secrets or personal data** in files, commits, screenshots or PR text: tokens, storefront passwords, customer or member details.
- **Stay in scope.** Edit only the files the task needs. If another file has to change, say which and why before touching it.

## Building

**Extend Dawn; don't fork its shared files.** `assets/base.css`, `assets/global.js` and `layout/theme.liquid` load on every page and are what a Dawn update has to merge. Put a section's needs in that section's files.

These rules apply to all new code and any code you change. Some older files break them: `sections/alliance-globe.liquid` uses `!important` and `var`; that is known cleanup debt. Do not copy those patterns or expand a task to mass-fix them; flag them instead.

**CSS**
- Section CSS lives in `assets/section-<name>.css`, loaded by that section with `stylesheet_tag`, as `sections/sda-article.liquid` does. Small one-off sections may keep an inline `<style>` per `CLAUDE.md`. Follow whichever pattern the file you are editing already uses.
- Scope every rule under the section's root class (`.sda-article …`). Unscoped rules leak into Dawn sections.
- Colors come from tokens (`--sda-*`) or color scheme variables (`rgb(var(--color-foreground))`). No new raw hex outside a token block. See `DESIGN.md`.
- New brand components use the `sda-` class prefix. Plain names collide with Dawn: `.section` is on every Dawn section wrapper and `.article` is used by the blog listing.
- No `!important`. Fix the selector instead.

**JavaScript**
- Component behaviour lives in a custom element asset; a small one-off section may keep an inline `<script>` at the bottom per `CLAUDE.md`. Follow the pattern the file already uses.
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

## Before a change merges

These are the checks a change needs before it merges, not a list the agent runs automatically. Run a check only when the person driving the agent has asked for checks; many people run them themselves.

1. `shopify theme check`, compared with `main`. The baseline already has offenses; your branch must not add any.
2. Theme Check does not prove `{% schema %}` JSON parses. For any schema you touched, copy the JSON between `{% schema %}` and `{% endschema %}` and parse it (for example with `python3 -m json.tool`).
3. Render the change on a preview theme, at desktop width (wider than 1080px: 1081px and up) and at phone width, with no console errors; 1080px and below gets the mobile layout. Tab through it with the keyboard. This step needs a browser and a dev server, so it needs explicit permission.
4. In your report, list what you ran and mark each check you did not run as "not run". The PR author adds before and after screenshots for anything visible.

If you did not run a check, do not say it passes.
