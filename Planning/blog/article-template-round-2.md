# SDA blog article template — round 2

Follow-up to `Planning/blog/article-template.md` after Taylor's first browser pass. Same ground rules: no git, no browser, no store writes, follow `CLAUDE.md`, `const`/`let` only, `visible_if` for dependent settings.

Files you may edit: `sections/sda-article.liquid`, `sections/sda-join-cta.liquid`, `assets/section-sda-article.css`, `templates/article.json`, `locales/en.default.json`. Nothing else. Do not touch the other locale files; `MatchingTranslations` errors are accepted.

Context that changed since round 1:

- There is now **one blog** (`dispatches`) for both developer and merchant content. Audience is a tag on the post (`Developers`, `Merchants`, or both).
- The article metafield definitions `custom.author_member` and `custom.title_accent` now exist on the store.

## A. Visual fixes from the browser

1. **Join CTA button text is invisible.** Cause: `:is(.sda-article, .sda-related, .sda-join) a { color: inherit; }` outranks Dawn's `.button` colour, so the label inherits the light foreground on a light button. Fix: exclude `.button` from that rule (`a:not(.button)`), so Dawn's button colours apply. Check the same rule does not break any other `.button` inside the three roots.

2. **Share options are not aligned with each other.** The X and LinkedIn links are left-aligned while the Copy link button is centred. Make all three identical: full width, label centred both ways, same height.

3. **Hero meta row looks misaligned.** The date and read time are vertically centred against the two-line author block, so they sit a few pixels off both the name and the tagline and read as a mistake. Fix: bottom-align the row so the date and read time share a baseline with the author's tagline line, and give them the same font size as the tagline (11px). When there is no tagline (single-line author), they should align with the name instead; `align-items: last baseline` with a `flex-end` fallback handles both.

## B. Author follows the member everywhere

1. **Structured data.** Replace `{{ article | structured_data }}` with hand-written `BlogPosting` JSON-LD so the author reflects the member. Build every string with the `json` filter. Fields:
   - `headline`: `article.title`
   - `description`: `article.excerpt` stripped, else the first ~160 characters of stripped content
   - `image`: `article.image` at width 1200 with an `https:` prefix; omit the key when there is no image
   - `datePublished`: `article.published_at`, `dateModified`: `article.updated_at`, both ISO 8601 (`date: '%Y-%m-%dT%H:%M:%S%z'`)
   - `author`: `Person` with `name` = the resolved `author_name`; add `url` (absolute: `shop.url` + member `system.url`) only when the member has a public profile
   - `publisher`: `Organization` with `shop.name`, plus `logo` from `settings.logo` when set
   - `mainEntityOfPage`: `canonical_url`

   Keep the Liquid at the top of the file; the script tag stays at the bottom.

2. **Comment "Author" badge.** It currently compares `comment.author` with `article.author` (the staff name). Compare with the resolved `author_name` instead.

## C. Audience tags drive the accent pill

New setting on `sda-article`: `audience_tags` (text, default `Developers, Merchants`, info: "Comma-separated. Post tags in this list are shown first as accented pills.").

- In the hero pills: every post tag that matches the list (case-insensitive, trimmed) renders first with the accent style, in the order of the setting. Remaining tags follow as normal pills. All still link to `{{ blog.url }}/tagged/{{ tag | handle }}`.
- When the post has none of the audience tags, keep today's behaviour: the blog title as the single accented pill linking to `blog.url`.
- The rail's "Filed under" list is unchanged (all tags, no accent).

## D. Join CTA can be limited by tag

New settings on `sda-join-cta`:

- `only_for_tag` (text, label "Only show on posts tagged", info "Leave blank to always show.")
- `also_when_untagged` (text, label "Also show when the post has none of these tags", info "Comma-separated.", `visible_if` `only_for_tag` is not blank)

Rule, all comparisons case-insensitive and trimmed:

- No `article` object (section used on a non-article template): always render.
- `only_for_tag` blank: always render.
- Otherwise render when the post has `only_for_tag`, or when `also_when_untagged` is set and the post has none of the tags listed there.

Initialise a `show_cta` variable to `true` and reassign conditionally, per the `CLAUDE.md` assignment pattern. Render nothing at all (no wrapper, no stylesheet tag) when false.

Update `templates/article.json` to carry two CTA sections after `related`:

| Key | only_for_tag | also_when_untagged | Copy |
|---|---|---|---|
| `join` (existing) | `Developers` | `Developers, Merchants` | keep current defaults and `button_link` |
| `join_merchants` (new) | `Merchants` | blank | eyebrow "For merchants"; heading "Need a Shopify developer you can trust?"; text "Alliance members are vetted Shopify developers. Tell us what you're building and we'll connect you with the right one."; button label "Get a quote"; `button_link` `shopify://pages/get-a-quote`; `show_avatars` true |

So: a developer post shows the join CTA, a merchant post shows the quote CTA, a post tagged both shows both, and an untagged post shows the join CTA.

## Done means

- `shopify theme check`, excluding `MatchingTranslations`, still reports 2 errors and 16 warnings, none in the files above.
- `node --check assets/sda-article.js` still passes (no JS change is expected in this round; say so if you needed one).
- JSON-LD is valid JSON for a post with and without: image, excerpt, member author, member public profile.

## Report back

Files changed, theme-check counts excluding `MatchingTranslations`, and anything you did differently from this plan with the reason.
