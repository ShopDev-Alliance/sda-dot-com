# SDA blog list template — build plan

Status: ready for handoff. Planner/reviewer: Claude with Taylor. Builder: a coding agent of Taylor's choosing.

This builds the blog index (`/blogs/dispatches`, its tag views and its paginated pages) to match `Planning/blog/design/blog-list.html`. The article page shipped in earlier rounds and is **out of scope**: Taylor is happy with it and does not want it changed.

## Ground rules for the builder

- **No git commands at all** (not even read-only). Taylor runs all git.
- **No browsers.** Do not open, drive or screenshot a browser. Taylor does browser QA.
- **No store writes.** No `shopify theme push`, no `shopify theme dev`, no Admin API mutations, no metafield definitions. `shopify theme check` is fine.
- Only create or edit the files listed under "Files". If you think another file must change, stop and say so in your report.
- Follow `CLAUDE.md` in the repo root. Extra house rule: gate dependent schema settings with `visible_if`.
- The design source is `Planning/blog/design/blog-list.html` only.

## Do not touch

These belong to the shipped article page. Read them for conventions, do not edit them:

`sections/sda-article.liquid`, `sections/sda-article-related.liquid`, `sections/sda-join-cta.liquid`, `snippets/sda-post-card.liquid`, `assets/section-sda-article.css`, `assets/sda-article.js`, `templates/article.json`.

Also leave Dawn's `sections/main-blog.liquid`, `snippets/article-card.liquid` and `assets/section-main-blog.css` in place (they stay for Dawn upgrades).

## Decisions already made

| Topic | Decision |
|---|---|
| Series (DEV / MER) | Comes from the existing article metafield `custom.audience` (choices `Developers`, `Merchants`). `merchants` (downcased) is MER; anything else, including blank, is DEV. There is no `dispatch_series` metafield. |
| Filter tabs | Shopify can only filter a blog listing by tag. Each post also carries a tag, `Developers` or `Merchants`, used only for the tabs. Those two tags are never shown as a topic pill. |
| Dispatch number | New article metafield `custom.dispatch_number` (integer), typed in by the author. Taylor creates the definition. A post without a number renders with no code at all. |
| Filter counts | Dropped. They would need a loop over every article. |
| Article page | Not changed this round. The new read-time and dispatch-code snippets are written so the article page can adopt them later. |
| JavaScript | None. This page is Liquid and CSS only. |

## What the theme is (verified)

- Dawn 15.0.0 with custom sections. `html` font-size is `68.75%`, so port the design's `px` values as `px`, never `rem`.
- Colors come from Dawn color schemes as RGB triplets on `.color-scheme-N`. `scheme-1` is the dark navy look (background `#0e1a2d`, text `#f7f9fc`). There are no global `--navy` / `--orange` variables.
- Heading font is Titillium Web 700 via `--font-heading-family` (only weight 700 is loaded). Body is a system mono stack via `--font-body-family`. Do not load Google Fonts.
- Dawn globals leak in: `body` letter-spacing and 75% foreground opacity, global heading letter-spacing and line-height, link styles, list styles. Reset them on the section root, the way the first rule blocks of `assets/section-sda-article.css` do.
- Reveal-on-scroll animations are on globally. Do not add `scroll-trigger` classes.
- The store's blog is `dispatches` (4 articles, 1 published, none with tags, images or excerpts yet). Comments are closed.
- Existing article metafields: `custom.author_member` (reference to a `members` metaobject: `name`, `profile_photo`), `custom.title_accent`, `custom.audience`.
- `sections/sda-join-cta.liquid` already works on non-article templates: with no `article` object it always renders. It loads `section-sda-article.css` for its own styles.

## Files

Create:

| File | Purpose |
|---|---|
| `sections/sda-blog.liquid` | Blog hero, series filters, featured post, post list, pagination, empty state |
| `snippets/sda-post-row.liquid` | One row in the post list |
| `snippets/sda-post-meta.liquid` | Author, date and read time line, shared by the featured card and the rows |
| `snippets/sda-dispatch-code.liquid` | Resolves and prints a post's dispatch code |
| `snippets/sda-read-time.liquid` | Prints "N min read" for an article |
| `assets/section-sda-blog.css` | All styles for `sda-blog` and its snippets |

Edit:

| File | Change |
|---|---|
| `templates/blog.json` | Replace `main-blog` with `sda-blog`, then `sda-join-cta` |
| `locales/en.default.json` | New storefront strings under `blogs.list` |

Every snippet starts with a `{% doc %}` block, like `snippets/sda-post-card.liquid`. Schema labels are plain English strings.

## Porting rules

1. **Prefix every class with `sda-`** and hang every selector off the section root: `.sda-blog .sda-post-row__title`, not `.post-row__title`. The design's names (`.list`, `.tag`, `.meta`, `.cover`, `.featured`, `.filters`) are too generic for this theme.
2. **No global rules.** Nothing on `*`, `html`, `body` or bare elements. Skip the design's reset and `body` block. Do not set `"class": "section"` in the schema.
3. **Tokens.** The root is `<div class="sda-blog color-{{ section.settings.color_scheme }}">`. Define the scoped variables on `.sda-blog` in the new CSS file, with the same names and values as the first rule of `assets/section-sda-article.css` (`--sda-bg`, `--sda-fg`, `--sda-ink-60/20/10/05`, `--sda-rule`, `--sda-orange`, `--sda-red-2`, `--sda-navy-3`, `--sda-surface`, `--sda-surface-2`, `--sda-note`, `--sda-gradient`). This duplicates about 20 lines on purpose so the article stylesheet is not edited. Leave a comment saying so.
4. **Drop from the design:** its header and footer (the theme has its own), the Join CTA markup (the existing section is reused), all sample content, the `[cover]` placeholder text, the per-author inline gradient styles, the filter counts.
5. **No `!important`.** No inline `style` attributes.
6. Font weights 500/600 on headings become 700. Fonts come from the two theme variables.

## Section: `sda-blog`

### Liquid at the top

One `{% liquid %}` block, defaults first, then conditional reassignment (see `CLAUDE.md`; never assign a boolean expression directly).

- `dev_tag`, `mer_tag` from section settings; `dev_handle`, `mer_handle` via `| handle`.
- `active_series` = `'all'`. Loop `current_tags`; if a tag's handle equals `dev_handle` set `'dev'`, if it equals `mer_handle` set `'mer'`.
- `is_filtered` = false; true when `current_tags` is not blank (any tag view, not only the two series).
- `title_text` = `section.settings.title`, falling back to `blog.title` when blank. `title_html` = escaped title; when `section.settings.title_accent` is set and the escaped title contains it, wrap the first occurrence in `<em>` (same technique as `title_html` in `sections/sda-article.liquid`).
- `list_label` = the "all" filter label, or the active series' label.

Everything below sits inside `{% paginate blog.articles by section.settings.posts_per_page %}`. On a tag URL Shopify already narrows `blog.articles` to that tag.

- `show_featured` = false; true when the `show_featured` setting is on, `is_filtered` is false and `paginate.current_page == 1`.

### Blog hero

- Eyebrow (`<p>`, omitted when blank), `<h1>` with `title_html`, dek (`<p>`, omitted when blank). The `em` gets the gradient text treatment from the design.
- The hero keeps the design's two radial glows and bottom rule.

### Series filters

`<nav aria-label="{{ 'blogs.list.filter_label' | t }}">` wrapping a `<ul>`:

| Tab | Link | Active when |
|---|---|---|
| All (label setting) | `{{ blog.url }}` | `active_series == 'all'` and `is_filtered` is false |
| DEV (label setting, orange dot) | `{{ blog.url }}/tagged/{{ dev_handle }}` | `active_series == 'dev'` |
| MER (label setting, light blue dot) | `{{ blog.url }}/tagged/{{ mer_handle }}` | `active_series == 'mer'` |
| RSS, pushed right | `{{ blog.url }}.atom` | never |

The active tab gets `aria-current="page"`. Dots are `aria-hidden="true"`. A series tab is omitted when its tag setting is blank. At ≤720px the row scrolls horizontally without wrapping and the RSS item hides, as in the design.

### Featured post

Rendered only when `show_featured` is true. It is the first article of page 1.

- One `<a>` wrapping the whole card, `<section aria-labelledby>` pointing at its `<h2>` title.
- Cover: `article.image` via `image_url: width: 1280` and `image_tag` with `widths: '375, 640, 960, 1280'`, `sizes: '(max-width: 960px) calc(100vw - 56px), 620px'`, `loading: 'eager'`, `fetchpriority: 'high'`, `alt: ''`. 16:10 box, `object-fit: cover`. With no image, an empty `aria-hidden="true"` box using the gradient placeholder variant.
- Label row: dispatch code pill (`render 'sda-dispatch-code', post: article, style: 'pill'`), accented "Latest" pill, topic pill (see "Topic pill").
- Title, excerpt (see "Excerpt"), then a foot row with `render 'sda-post-meta'` on the left and the "Read post" label with arrow on the right. The arrow SVG is `aria-hidden="true"`.

### Post list

- Head row: `<h2>` with `list_label`; on the right "Page X of Y", only when `paginate.pages > 1`.
- `<ul>` of `<li>`, each `render 'sda-post-row', post: article, index: forloop.index, dev_handle: dev_handle, mer_handle: mer_handle`.
- When `show_featured` is true, skip the first article in the loop (`forloop.first`).
- If the featured post was the only article, omit the whole list block (head included) rather than showing an empty list.
- Row headings are `<h3>`.

### Empty state

When `blog.articles.size == 0`: no featured block, no list. Show a short message (`blogs.list.empty`) and, when `is_filtered`, a link back to `{{ blog.url }}` (`blogs.list.view_all`). The hero and filters still render.

### Pagination

Only when `paginate.pages > 1`. `<nav aria-label="{{ 'general.pagination.label' | t }}">`.

- "Newer" links to `paginate.previous.url`, "Older" to `paginate.next.url`.
- When there is no previous or next page, render that control as a `<span aria-disabled="true">` with the disabled look, not a link.
- Page numbers from `paginate.parts`: links get `aria-label` from the existing `general.pagination.page` string; the current page is a `<span aria-current="page">`; ellipsis parts are plain spans. The numbers hide at ≤720px.

### Schema settings

| id | Type | Default | Notes |
|---|---|---|---|
| `color_scheme` | `color_scheme` | `scheme-1` | |
| `eyebrow` | `text` | none | |
| `title` | `text` | none | Info: "Leave blank to use the blog title." |
| `title_accent` | `text` | none | Info: "Part of the title to show in the gradient." `visible_if` title is not blank |
| `dek` | `textarea` | none | |
| `all_label` | `text` | `All dispatches` | |
| `dev_tag` | `text` | `Developers` | Info: "Posts with this tag appear under the developer tab." |
| `dev_label` | `text` | `DEV · For developers` | `visible_if` dev_tag is not blank |
| `mer_tag` | `text` | `Merchants` | |
| `mer_label` | `text` | `MER · For merchants` | `visible_if` mer_tag is not blank |
| `show_rss` | `checkbox` | `true` | |
| `show_featured` | `checkbox` | `true` | Label: "Feature the newest post on the first page" |
| `posts_per_page` | `range` | `10` | min 4, max 24, step 1 |

Group them with `header` settings: Hero, Filters, Posts. No presets (this is a main template section).

## Snippets

### `sda-read-time`

Param: `post`. Outputs the `blogs.article.read_minutes` string (already in the locale file) with the count computed exactly as the article page does: `post.content | strip_html | split: ' ' | size | divided_by: 225 | at_least: 1`. Trim whitespace so callers can place it inline.

### `sda-dispatch-code`

Params: `post`, `style` (`'pill'` or `'stacked'`), `class` (optional extra classes).

- `number` = `post.metafields.custom.dispatch_number.value`. When blank, **output nothing at all**.
- `series` = `'DEV'`, modifier `dev`; when `post.metafields.custom.audience.value | downcase` is `merchants`, `'MER'` and `mer`.
- Pad the number to three digits: prepend `00` under 10, `0` under 100, nothing from 100 up. Do not slice; 1000 must still print whole.
- `pill`: `<span class="sda-code-pill sda-series--mer">MER008</span>`.
- `stacked`: the two-line column from the design, series prefix over the big number.
- Both visual forms are `aria-hidden="true"`. The accessible text is handled once by the caller (below), because the row shows the code twice (column on desktop, pill on mobile).
- `.sda-series--dev` sets `--sda-series: var(--sda-orange)`; `.sda-series--mer` sets it to `var(--sda-note)` (`#8ecae6`).

### `sda-post-meta`

Param: `post`. Renders the meta line:

- Author, optional. `author_member = post.metafields.custom.author_member.value`. Name is the member's `name`, falling back to `post.author`. Avatar is the member's `profile_photo` (`image_url: width: 52`, `widths: '26, 52'`, `sizes: '26px'`, `loading: 'lazy'`, `alt: ''`), falling back to initials (first letter of first and last word, as in `sections/sda-article.liquid`) on the brand gradient. If the name is blank, omit the author item entirely and the line must still look right.
- Date: `{{ post.published_at | time_tag: format: 'date' }}`, which outputs a real `<time datetime>`.
- Read time: `render 'sda-read-time', post: post`. The clock icon from the design's featured card is optional; if used, use it in both places and mark it `aria-hidden="true"`.

### `sda-post-row`

Params: `post`, `index` (one-based), `dev_handle`, `mer_handle`.

One `<a class="sda-post-row" href="{{ post.url }}">` with three children, as in the design:

1. Code column: `render 'sda-dispatch-code', post: post, style: 'stacked'`. When the post has no code the column stays as an empty cell so titles still line up.
2. Body:
   - Kicker: a visually hidden `<span>` with `blogs.list.dispatch` ("Dispatch MER008") when the post has a code; the inline pill (`style: 'pill'`, shown only at ≤720px); the topic pill. Omit the kicker when it would be empty.
   - `<h3>` title, escaped.
   - Excerpt, clamped to 2 lines.
   - `render 'sda-post-meta', post: post`.
3. Cover: `post.image` via `image_url: width: 400`, `image_tag` with `widths: '100, 200, 300, 400'`, `sizes: '(max-width: 720px) 96px, (max-width: 960px) 150px, 200px'`, `loading: 'lazy'`, `alt: ''`. With no image, an empty `aria-hidden="true"` placeholder whose variant is `index | modulo: 4`, mapping to the design's four looks: striped default, `--grad`, `--deep`, `--ember`. 16:10 on desktop, square with the 30px top offset at ≤720px.

Pills inside the row are `<span>`s, not links: the whole row is already one link.

To build the visually hidden code text, the row needs the code as a string. Either capture the `pill` render and `strip_html`, or have the snippet accept `style: 'text'` that prints just `MER008`. Builder's choice; say which in the report.

## Shared rules

**Topic pill.** The first entry of `post.tags` whose handle is neither `dev_handle` nor `mer_handle`. Omitted when there is none. Shopify sorts tags alphabetically, so this is "first alphabetically"; that is accepted.

**Excerpt.** `post.excerpt | strip_html` when not blank, otherwise `post.content | strip_html | truncatewords: 30`. Do not add `| escape` after `strip_html`: it leaves HTML entities encoded, so escaping again would print `&amp;` literally. This matches Dawn's `article-card`.

**Must-haves on every card:** title, excerpt, date, read time. Author, image, dispatch code and topic are optional and every combination of missing ones must lay out cleanly.

## Accessibility

- One `<h1>` (hero). Featured title and list label are `<h2>`, row titles `<h3>`.
- Visible `:focus-visible` on tabs, featured card, rows, pager controls (2px orange outline, 3px offset, as in the design).
- Text never below 60% foreground opacity. The design's `.filters__count` at 70% of 66% is gone with the counts.
- Decorative SVGs and placeholder covers `aria-hidden="true"`.
- Add a `.sda-blog .sda-sr-only` rule (copy the declarations from `.sda-article .sda-sr-only`).
- Wrap hover transforms and transitions in `@media (prefers-reduced-motion: no-preference)`, or disable them under `reduce`.

## Responsive

Breakpoints from the design: 960px (featured card stacks, row columns narrow), 720px (side padding 20px, filters scroll, code column hides and the inline pill shows, square thumbnail, page numbers hide), 460px (tighter meta gap). Reason about 375, 768 and 1280. No horizontal page scroll at 375; only the filter row scrolls.

## `templates/blog.json`

```json
{
  "sections": {
    "main": {
      "type": "sda-blog",
      "settings": {
        "eyebrow": "SDA Dispatches",
        "title": "Dispatches from the Alliance",
        "title_accent": "the Alliance",
        "dek": "Two numbered series from a curated community of Shopify developers. DEV for the people building stores, MER for the merchants running them."
      }
    },
    "join": {
      "type": "sda-join-cta",
      "settings": {
        "button_link": "shopify://pages/how-to-join"
      }
    }
  },
  "order": ["main", "join"]
}
```

## Locale strings

Add `blogs.list` next to `blogs.article` in `locales/en.default.json`:

| Key | Value |
|---|---|
| `filter_label` | Filter dispatches by series |
| `rss` | RSS |
| `latest` | Latest |
| `read_post` | Read post |
| `dispatch` | Dispatch {{ code }} |
| `page_of` | Page {{ current }} of {{ total }} |
| `newer` | Newer |
| `older` | Older |
| `empty` | No dispatches here yet. |
| `view_all` | View all dispatches |

Reuse `blogs.article.read_minutes`, `general.pagination.label` and `general.pagination.page`.

## Done means

- `shopify theme check` reports nothing new versus the untouched tree (run it before starting for the baseline), and nothing in the new files.
- None of the "Do not touch" files changed.
- Every selector in `section-sda-blog.css` starts with `.sda-blog`. No `!important`, no inline styles, no JS.
- The page renders correctly, by reading the code, for: a post with no image, no excerpt, no tags, no `author_member`, no dispatch number; a blog with one article; a tag view with zero articles; page 2; a non-series tag view (`/tagged/anything`).

## Report back

Files created and changed, theme-check counts before and after, how the visually hidden dispatch text was built, and anything skipped or done differently from this plan with the reason.

## Taylor's to-dos (not the builder's)

1. Create the article metafield definition `custom.dispatch_number` (Integer, minimum 1) under Settings → Custom data → Blog posts.
2. On each post: set `custom.audience`, add the matching `Developers` or `Merchants` tag, set `custom.dispatch_number`, and add an excerpt and featured image. A topic tag (e.g. `Engineering`) is optional.
3. Rename the blog from `dispatches` to `Dispatches` (the title shows in the article breadcrumb and hero pill).
4. Publish or preview with at least 3 posts so the featured card, the list and one tab all have data.

## Later (not in this build)

- Article page adopts `sda-read-time` and `sda-dispatch-code` (code pill in the hero and on related cards).
- Merchant-specific Join CTA on the Merchants tab.
- Automatic dispatch numbering.
- Move the shared tokens into one stylesheet used by both pages.
