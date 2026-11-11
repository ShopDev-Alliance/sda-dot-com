# SDA blog article template — round 3

Follow-up to rounds 1 and 2 after Taylor's mobile pass. Same ground rules: no git, no browser, no store writes, follow `CLAUDE.md`, `const`/`let` only, `visible_if` for dependent settings.

Files you may edit: `sections/sda-article.liquid`, `sections/sda-join-cta.liquid`, `assets/section-sda-article.css`, `assets/sda-article.js`, `templates/article.json`, `locales/en.default.json`. Nothing else. Do not touch the other locale files; `MatchingTranslations` errors are accepted.

## A. Breadcrumb breaks on phones

At ≤500px the crumb links are allowed to shrink (`flex-shrink: 1`) and the root sets `overflow-wrap: anywhere`, so "Home" and the blog title collapse to one character per line.

Fix:

- Crumb links and separators never shrink and never wrap: `flex-shrink: 0; white-space: nowrap;` at every width. Remove the ≤500px `flex-shrink: 1` override.
- The current-page crumb takes the remaining width and truncates: `flex: 1 1 0; min-width: 0;` with the existing ellipsis rules.

## B. Mobile reading bar replaces the floating Contents pill

Problem: at ≤1080px the rail (contents, share, tags) disappears, and the small floating "Contents" pill that replaces it is easy to miss and offers only the contents list and copy link.

Replace the pill with a slim bar docked to the bottom of the screen that opens a tray.

**Bar** (≤1080px only; desktop is unchanged):

- Fixed to the bottom, full width, about 52px tall plus `env(safe-area-inset-bottom)`. Background `--sda-surface-2`, 1px top border in `--sda-ink-20`. The reading progress shows as a 2px gradient line along its top edge (reuse `--sda-progress`).
- The whole bar is one `<button>` (`aria-expanded`, `aria-controls` the tray). Left to right: a list icon; a label that shows the heading of the section currently being read, truncated with an ellipsis (falls back to the "Contents" string before the first heading and when the post has fewer than 2 headings); the read percentage; an up chevron. Icons are inline SVG with `aria-hidden="true"`. Give the button an `aria-label` such as "Open contents and sharing".
- Visibility: shown from page load while the article section is on screen, hidden once the bottom of the article body has scrolled above the header, and hidden while the tray is open. Hide by sliding it down (`transform: translateY(100%)`, ~200ms) and set `inert` while hidden so it can't be focused. No transition under `prefers-reduced-motion`.
- It must appear even when the post has fewer than 2 headings (share and back-to-top are still useful).

**Tray** (the existing `<dialog>`, restyled as a bottom sheet):

- Slides up on open (~250ms; use a keyframe animation on `dialog[open]`; none under `prefers-reduced-motion`). Backdrop tap, Esc and the close button all close it, as now.
- Contents, in order:
  1. "On this page" list (the existing cloned TOC). Hidden when fewer than 2 headings.
  2. "Share" row: X, LinkedIn and Copy link as three equal-width controls in one row. Same URLs and behaviour as the rail; shown only when `show_share` is on.
  3. "Filed under" tags, when the post has tags.
  4. Back to top.
- Choosing a contents link closes the tray and scrolls, as now.

Remove the old pill's markup, styles and JS. Keep the desktop back-to-top button desktop-only.

Keep to one scroll handler; the current-section label updates inside the existing `updateActive()`.

## C. Audience becomes a metafield, not tags

Taylor prefers an explicit switch over tag conventions. Round 2's tag-based logic is replaced.

New article metafield (Taylor/Claude create the definition; you only read it): `custom.audience`, single line text limited to the choices `Developers` and `Merchants`. Blank means Developers.

In `sections/sda-article.liquid`:

- Remove the `audience_tags` setting and its logic.
- Resolve `audience` at the top: default `'developers'`, set to `'merchants'` when the metafield value, downcased, is `merchants`.
- Hero pills: the first, accented pill is the blog title linking to `blog.url` (as in round 1). When the metafield is set, add a second accented pill with the audience label ("For developers" / "For merchants", new locale strings) as a `<span>`, not a link. Then all tags as normal pills.

In `sections/sda-join-cta.liquid`:

- Remove `only_for_tag` and `also_when_untagged` and their logic.
- Add a select `audience` (label "Show on"): `all` "All posts" (default), `developers` "Developer posts", `merchants` "Merchant posts".
- Rule: render when the setting is `all`, when there is no `article` object, or when the setting matches the post's resolved audience (blank metafield counts as developers). Keep the `show_cta` default-then-reassign pattern and render nothing when false.

In `templates/article.json`: keep both CTA sections and their copy; set `join` to `developers` and `join_merchants` to `merchants`, and remove the old tag settings. Every post then shows exactly one CTA.

## D. Small fix

JSON-LD dates: use `%Y-%m-%dT%H:%M:%S%:z` so the offset has a colon (`-05:00`).

## Done means

- `shopify theme check`, excluding `MatchingTranslations`, still reports 2 errors and 16 warnings, none in the edited files.
- `node --check assets/sda-article.js` passes; gzipped size stays under ~4.5 KB.
- No selector outside the three section roots. No `!important`.

## Report back

Files changed, theme-check counts excluding `MatchingTranslations`, gzipped JS size, and anything you did differently from this plan with the reason.
