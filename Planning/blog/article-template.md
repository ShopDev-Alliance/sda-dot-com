# SDA blog article template — build plan (phase 1)

Status: ready for handoff. Planner/reviewer: Claude with Taylor. Builder: a coding agent of Taylor's choosing.

## Ground rules for the builder

- **No git commands at all** (not even read-only). Taylor runs all git and has already put the working tree on the right branch.
- **No browsers.** Do not open, drive or screenshot a browser. Taylor does browser QA.
- **No store writes.** No `shopify theme push`, no `shopify theme dev`, no Admin API mutations, no metafield or metaobject definitions. `shopify theme check` is fine.
- Only create or edit the files listed under "Files". If you think another file must change, stop and say so in your report.
- Follow `CLAUDE.md` in the repo root. Two extra house rules: never use `var` in JS (`const`/`let` only), and gate dependent schema settings with `visible_if`.
- The design source is `Planning/blog/design/blog-post.html` only. An earlier handoff also shipped an extracted `styles.css` and `app.js`; they were stale and are deliberately not included.

## Decision: native blog, with metaobjects filling the gaps

Posts are native Shopify **articles**. We are not modelling posts as metaobjects.

Why: articles give us `/blogs/...` URLs, the Atom feed, sitemap entries, tags and tag pages, scheduling, SEO fields, `article | structured_data`, storefront search and native comments for free. A metaobject post would need every one of those rebuilt by hand. The store has two blogs (`news`, `shopify-development`) and zero published articles, so there is nothing to migrate.

Where metaobjects earn their place:

| Gap in a native article | How we fill it |
|---|---|
| Author is only a staff name string | Article metafield `custom.author_member`, a reference to the existing `members` metaobject (photo, tagline, bio, socials, profile page) |
| Title is plain text, design wants an accent phrase | Article metafield `custom.title_accent` (single line text) |
| Callouts, code blocks, pullquotes | Authoring conventions inside `article.content` (below). These are what GitHub-flavored Markdown produces, so posts written in Markdown publish cleanly |

Rejected: the design's `post_block` idea (a list of typed metaobject entries replacing `article.content`). It empties the article body, which breaks the feed, search indexing and excerpts, and it turns every post into dozens of loose entries in one global pool.

Both metafields are **optional at render time**. Taylor creates the definitions; the template must look right with neither set.

## What the theme actually is (verified)

- Dawn 15.0.0 with custom sections. No `.theme-check.yml`.
- `templates/article.json` uses Dawn's stock `main-article` section. Leave `sections/main-article.liquid` and `assets/section-blog-post.css` untouched (they stay for Dawn upgrades).
- Colors come from Dawn color schemes, exposed as RGB triplets on `.color-scheme-N`:
  - `scheme-1`: background `#0e1a2d`, text `#f7f9fc`, button `#f7f9fc` on label `#0e1a2d`, shadow `#e5414d`. This is the dark look the article ships in.
  - `scheme-3` carries the brand gradient `linear-gradient(184deg, #fd814f 3.09%, #dc2a3c 93.28%)`; `scheme-5` is `#1e3556`.
  - There are **no** global `--navy`, `--orange` etc. variables. The only custom one is `--sda-orange: #FB8A5E` in `layout/theme.liquid`, which is not the design's `#fd814f`. Use the design value, scoped.
- Fonts: heading is Titillium Web 700 via `--font-heading-family`. Body is Shopify's **system mono stack** via `--font-body-family`, not JetBrains Mono. Use the theme variables. Do not load Google Fonts or any new font. Only weight 700 of Titillium is loaded, so design weights 500/600 on headings become 700.
- `html` font-size is `68.75%` (1rem = 11px). Port the design's `px` values as `px`. Do not convert to `rem`.
- Dawn globals that will leak in and must be reset on the article root: `body` `letter-spacing: 0.06rem` and 75% foreground opacity, global `h1`–`h5` letter-spacing/line-height, `blockquote`, link styles. Do not put Dawn's `rte` class on the content.
- Header is sticky "on scroll up" and sets `--header-height` on `:root`. An announcement bar sits above it.
- Reveal-on-scroll animations are on globally. Do not add `scroll-trigger` classes to anything in these sections.
- Member data: `shop.metaobjects.members` (211 entries). Useful fields: `name`, `role`, `tagline`, `profile` (boolean, has a public profile), `profile_photo`, `description` (rich text), `twitter`, `linked_in`, `github`, `website`. Profile URL is `member.system.url`. There is no member-number field.
- Member gating pattern already in use: `customer.metafields.custom.sda_member == true` (see `sections/custom-briefing-page.liquid`).
- A real-photo avatar stack with a live member count already exists inside `sections/rich-text.liquid` (the `avatar-stack` block, lines ~90–119) with CSS in `assets/custom-styles.css`.

## Files

Create:

| File | Purpose |
|---|---|
| `sections/sda-article.liquid` | Progress bar, breadcrumbs, hero, article body + rail, author card, comments, mobile contents button and sheet, back-to-top, JSON-LD |
| `sections/sda-article-related.liquid` | "Keep reading" grid |
| `sections/sda-join-cta.liquid` | Join CTA, reusable on other templates |
| `snippets/sda-post-card.liquid` | One related-post card (use a `{% doc %}` block like `snippets/card-member.liquid`) |
| `assets/section-sda-article.css` | All styles for the three sections |
| `assets/sda-article.js` | All behavior, loaded with `defer` |

Edit:

| File | Change |
|---|---|
| `templates/article.json` | Replace `main-article` with the three new sections, in order |
| `locales/en.default.json` | New storefront strings under `blogs.article` (reuse the existing comment keys) |

Schema labels in the new sections are plain English strings, matching the other custom sections.

## Porting rules

1. **Collapse the two CSS layers.** The design HTML has a base stylesheet and then a second `<style>` block, "Layout v2", that overrides it with `!important`. Final layout is v2: two columns (article + 260px right rail holding the TOC), and at ≤1080px a single column with the rail hidden and a floating "Contents" button opening a bottom sheet. Write one clean ruleset with no `!important`. Drop the dead v1 pieces: the left-column `.toc` block, `#tocLabel` logic, the 3-column grid.
2. **Prefix every class with `sda-`** (`.sda-hero__title`, `.sda-rail`, `.sda-toc-list`). The design's names collide with Dawn: `.section` is on every Dawn section wrapper, `.article` is used by the blog listing, and `.hero`, `.tag`, `.share`, `.comment` are too generic. Do not set `"class": "section"` in the new schemas.
3. **No global rules.** Nothing on `*`, `html`, `body` or bare elements. Skip the design's reset, `html { scroll-behavior; scroll-padding-top }` and `body` rules. Everything hangs off the section roots.
4. **Tokens.** Each section root gets `class="color-{{ section.settings.color_scheme }}"` (setting type `color_scheme`, default `scheme-1`) and defines scoped variables derived from Dawn's:
   - `--sda-bg: rgb(var(--color-background))`, `--sda-fg: rgb(var(--color-foreground))`
   - `--sda-ink-60/20/10/05` and `--sda-rule` as `rgba(var(--color-foreground), α)` with the design's dark-mode alphas
   - Brand constants not in the theme, defined once on the root: orange `#fd814f`, red `#dc2a3c`, red-2 `#e5414d`, navy-3 `#1e3556`, surface `#152539`, surface-2 `#1b2c45`, the gradient above
   - Fonts: `var(--font-heading-family)` and `var(--font-body-family)`
5. **Dark only, 15px reading size.** Bake in the design's `body[data-mode="dark"]` values and `--reading-size: 15px`. No light set, no size toggle.
6. **Drop entirely:** the Tweaks panel and its script, `__TWEAK_DEFAULTS`, the `postMessage` bridge, reactions, the design's own header and footer, every placeholder (`::after` "[hero image …]" text, striped boxes, sample names, fake comments, gradient-initial avatars in the CTA).
7. **Rewrite the JS, don't port it.** The design script has a bug that disables TOC highlighting (`const headings = qs(...)` returns one element, so `headings.length` is undefined), dead variables in `updateProgress`, and `innerHTML.replace` label swaps. Structure: one custom element `<sda-article>` wrapping the main section markup, set up in `connectedCallback` so it re-initialises in the theme editor. One passive scroll listener throttled with `requestAnimationFrame`. Event delegation for clicks. Target ≤ ~4 KB gzipped, no dependencies.

## Fixes the design needs in dark mode

The design was drawn light-first; several pieces disappear on navy.

- Code block background is navy on navy. Use a darker surface (`#0a1322`) with the existing border.
- Back-to-top and the Contents button are navy on navy. Use `--sda-surface-2` with a visible border.
- Comment submit button is navy on navy. Use Dawn's `.button` class (already paper-on-navy with the red offset shadow in scheme-1). Same for the CTA button.
- `.callout--note` uses navy-3 for its border and icon. Lighten to a readable blue (`#8ecae6`, already in the design's syntax palette).
- Anything at 40% foreground opacity fails 4.5:1 on navy (about 3.4:1). Text must be ≥ 60% opacity. This affects TOC numerals and code line numbers; 40% is fine only for decoration.
- The drop cap uses `background-clip: text` on `::first-letter`, which renders an invisible letter in some browsers. Use solid orange.
- Inline `code` has `white-space: nowrap`, which overflows on phones. Use `overflow-wrap: anywhere`.
- Heading anchors are `opacity: 0` until hover. Also reveal on `:focus-visible`.
- Honor `prefers-reduced-motion` for smooth scrolling and transitions.

## Section 1: `sda-article`

Order of markup: progress bar, breadcrumbs, hero, two-column layout (body + rail), comments, contents button + sheet, back-to-top.

**Liquid at the top (one `{% liquid %}` block, defaults first, then conditional reassignment):**

- `author_member` = `article.metafields.custom.author_member.value`
- Author fallback chain for name / photo / role / bio / link:
  1. member metaobject: `name`, `profile_photo`, `tagline`, `description`, link to `system.url` only when `profile` is true, socials from `twitter`, `linked_in`, `github`, `website`
  2. `article.user`: `name`, `image`, `bio`, `homepage`
  3. `article.author` string with an initials avatar on the gradient
- `read_minutes` = words in `article.content | strip_html` divided by 225, minimum 1. No metafield.
- `title_html`: escaped title; if `custom.title_accent` is set and the escaped title contains it, wrap the first occurrence in `<em>`.

**Breadcrumbs:** Home / `blog.title` (link) / article title (`aria-current="page"`, truncated with CSS). `<nav aria-label="Breadcrumb">`.

**Hero:**

- Pills: first pill is `blog.title`, accented, linking to `blog.url`. Then each `article.tags` entry linking to `{{ blog.url }}/tagged/{{ tag | handle }}`. Shopify sorts tags alphabetically, so "first tag" is not a meaningful category; the blog is. No "N min read" pill (it duplicates the meta row).
- `<h1>` outputs `title_html`.
- Dek: `article.excerpt` when not blank, otherwise omitted. It is HTML; render it in a `div` and style inner `p`.
- Meta row: author (avatar, name, role line), date via `time_tag`, read time, live "% read" pushed right. `flex-wrap` on small screens.
- Image: `article.image` with `image_url` + `image_tag`, `widths`, `sizes`, `loading: 'eager'`, `fetchpriority: 'high'`, 16:7 box, `object-fit: cover`. Section setting `no_image_style` (`gradient` | `none`): gradient band, or no media with the larger "type" title from the design.

**Article body:** `<div class="sda-article__body">{{ article.content }}</div>`. Styles must cover plain rich-text output: `p`, `h2`–`h4`, `ul`/`ol`, links, `strong`/`em`, inline `code`, `pre`, `blockquote`, `hr`, `img`, `figure`/`figcaption`, `table` (wrap-free horizontal scroll), `iframe`/`video` (responsive 16:9). The design has no table, h4 or embed styles; add sensible ones in the same visual language.

- Lead paragraph + drop cap applies to `.sda-article__body > p:first-child`. Section checkbox `show_drop_cap`, default true.
- Un-enhanced state must already look right: `pre` styled as the dark code surface, `blockquote` styled as the pullquote. JS then upgrades.

**Authoring conventions the JS upgrades** (all DOM built with `createElement`/`textContent`, never by concatenating HTML):

| Author writes | Becomes |
|---|---|
| `<pre><code class="language-liquid">` | `figure` code shell: header with filename, language label, Copy button with "Copied!" state; line numbers by splitting on newlines. Language from the `language-*` class. Filename from `data-file` on the `pre`, falling back to `title`. No header label when neither is present |
| Blockquote whose first line starts `[!NOTE]`, `[!TIP]` or `[!WARNING]` (also accept `[!IMPORTANT]` → note, `[!CAUTION]` → warning) | Callout of that variant. Rest of the first line is the title; default titles "Note" / "Tip" / "Warning" |
| Any other blockquote | Pullquote. If its last paragraph starts with "—" or "--", that paragraph becomes the `<cite>` |
| `h2`, `h3` | Gets an `id` (keep an existing one; otherwise slugify, de-duplicate with `-2`, `-3`) and a hover/focus `#` link that copies the URL. `aria-label="Copy link to section: {heading text}"` |

After ids are assigned, if `location.hash` matches one, scroll to it. Native hash navigation runs before the ids exist.

No syntax highlighting in phase 1 (see Later).

**Author card** after the body: photo or initials, name, bio (member `description` or `article.user.bio`, stripped to text and truncated ~240 chars), social icon links that exist. Whole card links to the member profile when available.

**Rail** (sticky, `top: 100px`):

- "On this page": TOC built by JS from h2/h3 (h3 nested), collapsible button with `aria-expanded`, active section via `IntersectionObserver`. If there are fewer than 2 headings, hide the group and the mobile Contents button.
- Share: X and LinkedIn are plain links built in Liquid with `url_encode`, `target="_blank" rel="noopener"`. Copy link is a `<button>` with a "Copied!" state and an `aria-live` region.
- "Filed under": tags again, small. Hidden when there are no tags.

**Mobile (≤1080px):** rail hidden; floating Contents button with the mini progress bar, shown only while the article body is in view. It opens the TOC in a native `<dialog>` styled as a bottom sheet (`showModal()` gives focus trapping, Esc and focus return; no hand-rolled `role="dialog"`). The sheet holds the same TOC (clone it) plus Copy link and Back to top. Back-to-top FAB is desktop only.

**Comments**, rendered only when `blog.comments_enabled?`:

- Start from the logic in `sections/main-article.liquid` (it handles pending comment, errors, success, moderated). Keep its behavior, restyle to the design, paginate by 20 with `#comments` anchor.
- Each comment: initials avatar, author, date via `time_tag`, body. "Author" badge when `comment.author == article.author`. No member-number badge (no such data).
- Section checkbox `comments_members_only`, default true. When on: a logged-in member (`customer.metafields.custom.sda_member == true`) sees a single textarea with name and email sent as hidden inputs from `customer`; everyone else sees a short prompt with links to log in (`routes.account_login_url`) and to the join page. When off: Dawn's name / email / comment fields.
- Add a Liquid comment noting this is display gating only; the comment endpoint itself is public, so the blog should stay moderated.

**Other:** keep `<script type="application/ld+json">{{ article | structured_data }}</script>`. Section settings: `color_scheme`, `no_image_style`, `show_drop_cap`, `show_author_card`, `show_share`, `comments_members_only` (visible only if comments make sense: add a paragraph setting explaining it depends on the blog's comment setting).

## Section 2: `sda-article-related`

- Three cards. First pass over `blog.articles` (Liquid returns up to 50): articles sharing at least one tag with the current one, excluding it. Second pass: fill remaining slots with most recent, excluding the current one and those already picked. Track picked handles in a delimited string.
- Render nothing at all when no other article exists.
- Card (`sda-post-card`): image via `image_url`/`image_tag` with `loading: 'lazy'`, 16:10; when missing, cycle the design's gradient / dark / plain variants by index. Meta line "{blog title} · N min read", title, excerpt stripped and truncated. Whole card is one link.
- Settings: `color_scheme`, eyebrow ("Keep reading"), heading ("More from the Alliance"), `show_all_link` + label ("All posts") linking to `blog.url`.

## Section 3: `sda-join-cta`

- Settings: `color_scheme`, eyebrow, heading, text, button label, button link (`url`), `show_avatars`.
- Heading supports a `[count]` placeholder replaced with the live member count, e.g. "Ship better with [count] other Shopify devs".
- Avatars: real member photos and the "+N" bubble, same data logic as the `avatar-stack` block in `sections/rich-text.liquid` (paginate members by 250, founding members, limit 5 here). Reuse the existing `.avatar-stack` classes from `assets/custom-styles.css`. Do **not** edit `rich-text.liquid`; it drives the live homepage. Leave a TODO to extract a shared snippet later.
- Presets entry so it can be added to other templates from the theme editor.

## Accessibility and responsive checks

- Real `<button>`s for actions, links for navigation. `aria-label` on icon-only controls, `aria-hidden="true"` on decorative SVGs, progress bar `aria-hidden`.
- Visible `:focus-visible` on every interactive element.
- One `<h1>`. Section headings inside comments / related / CTA are `h2`.
- Widths to reason about: 375, 768, 1080 (rail switch), 1280. No horizontal page scroll at 375; code blocks and tables scroll inside themselves.

## Done means

- `shopify theme check` reports nothing new versus the untouched tree (run it before starting to get the baseline).
- Article renders correctly with: no image, no excerpt, no tags, no headings, neither metafield, comments disabled, and only one article in the blog.
- No selector in `section-sda-article.css` can match outside the three section roots.
- `Planning/blog/fixture-article.html` is the test body Taylor pastes into a draft article; every element in it should be styled.

## Report back

List of files created/changed, theme-check before/after counts, anything skipped or decided differently from this plan and why, and any place Shopify stripped or altered fixture markup if you could tell from the code alone (you likely can't; say so).

## Taylor's to-dos (not the builder's)

1. Create two article metafield definitions (Settings → Custom data → Blog posts):
   - `custom.author_member`: Metaobject reference → Members, one entry
   - `custom.title_accent`: Single line text
2. Decide whether comments are on for `news` and `shopify-development` (Blog → Comments). If on, choose "moderated".
3. Create a draft article in each blog using the fixture body, with tags, an excerpt and a featured image, so there is something to preview and "related" has data.

## Later (not in this build)

- Syntax highlighting: vendor a small Prism build as a theme asset, lazy-load only when a `language-*` code block exists, map its token classes to the design's palette.
- Blog index (`main-blog`) redesign so the listing matches the post.
- Image captions from the editor without HTML view (e.g. an italic-only paragraph directly after an image).
- Structured extras that reuse existing metaobjects: "Related briefing" (`sda_briefings` reference) and "Benefits mentioned" (`member_benefits` list) rendered in the rail or after the body.
- Extract the avatar stack into a shared snippet used by the homepage and the CTA.
