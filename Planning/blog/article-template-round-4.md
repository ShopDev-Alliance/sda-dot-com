# SDA blog article template — round 4

Follow-up to rounds 1–3 after the first outside review. Same ground rules: no git, no browser, no store writes, follow `CLAUDE.md`, `const`/`let` only.

Files you may edit: `sections/sda-article.liquid`, `assets/section-sda-article.css`, `assets/sda-article.js`. Nothing else. No locale changes are needed.

## The feedback

1. "It might look better if the content is aligned to the header section." The article body starts about 50px to the right of the hero (title, author row).
2. "We can't see the percentage after we scroll down. Maybe move the percent to the sidebar on desktop, or a horizontal progress bar." The mobile bar is liked and stays as is.
3. "Add some padding so the arrow moves up a little." The arrow in the round back-to-top button sits below centre.

## A. Align the body with the hero

Cause: `.sda-hero` is `max-width: 1200px` and `.sda-article__layout` is `max-width: 1100px`, both centred, so the body is inset 50px on each side. At ≤1080px the layout drops to a centred 760px while the hero stays full width, so the two are misaligned there too (about 100px at 1024px wide). The comments block is also a centred 760px.

Fix, in `assets/section-sda-article.css`:

- `.sda-article__layout`: `max-width: 1200px`. Keep the `minmax(0, 1fr) 260px` grid and 56px gap, so the text's left edge lines up with the hero's left edge and the rail's right edge lines up with the hero's right edge.
- `.sda-article__column` keeps `max-width: 72ch`. Do not widen the reading measure; the extra width becomes space between the text and the rail.
- In the ≤1080px block, remove `max-width: 760px` from the layout so it keeps the 1200px container and the column stays left-aligned at 72ch.
- Comments: `.sda-comments` becomes `max-width: 1200px` with the same side padding. In `sections/sda-article.liquid`, wrap everything inside the `<section class="sda-comments">` in one `<div class="sda-comments__inner">` with `max-width: 72ch`, so comments share the article column's left edge and width.

The ≤500px padding override (20px) already applies to the hero, layout and comments together; leave it.

## B. Reading progress moves into the rail (desktop)

Today the percentage is in the hero's author row, which scrolls out of view, and the only persistent indicator on desktop is a 3px line fixed to the very top of the window, which the reviewer did not notice.

Target: one persistent indicator per viewport. Desktop gets a progress block in the sticky rail; mobile keeps the bottom reading bar unchanged.

Markup, in `sections/sda-article.liquid`:

- Remove `<div class="sda-progress">` and the `<span class="sda-meta sda-meta--progress">` in the hero author row.
- Add a progress block as the first child of `<aside class="sda-rail">`, before the contents nav. It carries the `hidden` attribute in the markup and is revealed by JS, as the old percent was. Contents:
  - One text line: the percentage (`<span data-read-percent>0%</span>`) followed by the existing `blogs.article.read` string, giving "42% read".
  - Below it, a horizontal meter: a full-width 3px track with a gradient fill. The meter is `aria-hidden="true"`; the text line is not. Do not use `role="progressbar"`.

Styles:

- Text line: percentage in `--sda-orange`, heading font, bold, about 14px; "read" in the eyebrow style (`--sda-ink-60`, uppercase, letter-spaced, about 11px). Baseline-aligned on one row.
- Track: `--sda-ink-10`, 3px tall, 2px radius, `overflow: hidden`. Fill: `--sda-gradient`, `transform: scaleX(var(--sda-progress, 0))`, `transform-origin: left`. No transition, since it follows scroll.
- The block has no top border (it is the first thing in the rail). The groups after it keep theirs.
- The rail is its own scroll container (`overflow-y: auto`) for long contents lists. Pin the progress block to the top of it (`position: sticky` inside the rail, background `--sda-bg`) so it stays visible when the list scrolls. The rail has 5px padding; make sure list items do not show through above the pinned block.
- Delete the `.sda-progress` and `.sda-meta--progress` rules, including the ≤500px `.sda-meta--progress` override.

JS, in `assets/sda-article.js`:

- Remove `this.progress` and the line that unhides it.
- `this.percent` still resolves through `[data-read-percent]`, now in the rail. Unhide the progress block instead of `this.percent.parentElement`; select it explicitly rather than relying on the parent relationship.
- `updateProgress()` is otherwise unchanged: it still sets `--sda-progress` on the host and writes the percentage to both the rail and the mobile bar. Keep to the single scroll handler.

## C. Centre the back-to-top arrow

Cause: the button's content is the text glyph `↑`, which sits on the font's baseline and so reads low in the circle. Padding would only fix it for one font.

Fix: replace the glyph with an inline SVG, matching the other icons in this section: 20×20, `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="2"`, `aria-hidden="true"`, path `M12 19V5M5 12l7-7 7 7`. Centre it in the button with flex or grid centring and `padding: 0`. Drop the now-unused `font-size`. The button keeps its `aria-label`, 44px size and position.

Watch the specificity trap: `:is(.sda-article, …) [hidden] { display: none; }` and `.sda-article .sda-back-to-top` have equal specificity and the button rule comes later, so a plain `display: flex` on the button defeats `hidden`. And `:not([hidden])` on that rule would then outrank the ≤1080px `display: none`. Write it so the button stays hidden at the top of the page on desktop and stays hidden at every scroll position at ≤1080px. The same applies to the rail progress block if you give it a `display` value.

## Done means

- Run `shopify theme check` before and after: no new offenses, none in the edited files.
- `node --check assets/sda-article.js` passes; gzipped size stays under ~4.5 KB.
- No selector outside the three section roots. No `!important`.
- No references left to `.sda-progress` or `.sda-meta--progress` in the three files.

## Report back

Files changed, theme-check counts before and after, gzipped JS size, and anything you did differently from this plan with the reason.
