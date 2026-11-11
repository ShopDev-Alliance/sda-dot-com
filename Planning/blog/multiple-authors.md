# SDA blog — multiple authors

A post can currently credit one author. This adds co-authors everywhere an author is shown. Same ground rules as the earlier blog rounds: no git, no browser, no store writes, follow `CLAUDE.md`, `const`/`let` only.

## How authors work today

- Article metafield `custom.author_member` is a single reference to a `members` metaobject entry (`name`, `profile_photo`, `tagline`, `description`, `profile`, `twitter`, `linked_in`, `github`, `website`).
- `sections/sda-article.liquid` resolves one author at the top of the file with the fallback chain member → `article.user` → `article.author`, then uses it in five places: the hero meta row, the author card after the body, the comment "Author" badge, the `BlogPosting` JSON-LD, and the initials avatar.
- `snippets/sda-post-meta.liquid` resolves the same author again (name and photo only) for the blog list. It is rendered by `sections/sda-blog.liquid` (featured card) and `snippets/sda-post-row.liquid`.
- The related-posts section and `sda-post-card` show no author. Leave them alone.

## Data model

Keep `custom.author_member` as the lead author. Add one new article metafield for everyone else:

| Metafield | Type | Meaning |
| --- | --- | --- |
| `custom.author_member` (exists) | Metaobject reference → Members, one entry | Lead author. Unchanged. |
| `custom.co_authors` (new) | Metaobject reference → Members, **list of entries** | Additional authors, in the order they should be credited. |

Why not turn `author_member` into a list: Shopify does not let a definition change from single to list, so it would mean deleting the definition and re-entering every post, with authors missing on the live site in between. With a separate field, existing posts need no changes and render exactly as they do now.

The `custom.co_authors` definition already exists on the store. The code must not depend on it existing: a missing definition or an empty list is the single-author case.

Co-authors are always `members` entries. A co-author who is not a member is out of scope.

## Resolving the author list

The ordered author list is: the lead author (today's fallback chain, unchanged), then each entry in `article.metafields.custom.co_authors.value`.

- Skip a co-author whose `name` is blank.
- Skip a co-author that is the same entry as the lead (`system.handle` matches `author_member.system.handle`), so picking the same person in both fields does not credit them twice.
- A co-author resolves the way the lead member does: name `name.value`, photo `profile_photo.value`, role `tagline.value`, bio `description | metafield_text`, link `system.url` only when `profile.value == true`, socials from the four social fields.
- If there is no lead at all (no member, no staff user, blank `article.author`) but there are co-authors, the first co-author is simply first. Nothing should render an empty slot.
- Per `CLAUDE.md`, use `.count` for the size of the metaobject list, and the initialise-then-reassign pattern for flags.

"Multi-author" below means the resolved list has two or more people.

Liquid cannot build an array of mixed objects, so the practical pattern is "render the lead, then loop the co-authors". To keep that from tripling the markup, extract shared pieces into snippets (suggested, adjust if something cleaner falls out):

- `snippets/sda-avatar.liquid`: params `name`, `photo`, `size` (px), `loading`, optional `class`. Outputs the `span.sda-avatar` with either the image (`image_url` at 2× `size`, `widths` of 1× and 2×, `sizes` of `size`px, `alt: ''`) or the initials. This replaces the three copies of the avatar markup and the two copies of the initials logic. The comment avatars can stay as they are.
- `snippets/sda-author-card.liquid`: params `name`, `photo`, `bio`, `url`, `member` (may be blank). Outputs one card, including the socials block when `member` is present. Rendered once for the lead with its resolved values and once per co-author.

Each snippet needs a `{% doc %}` block like the existing `sda-*` snippets.

## A. Article hero meta row

Single author: output stays as it is today (whole block is a link when the author has a URL, avatar + name + tagline).

Multi-author:

- The wrapper is a `div.sda-author.sda-author--multi`, not a link.
- Avatars overlap in a stack, lead first, 42px each, each later one pulled left about 12px. The existing 2px `var(--sda-bg)` border on `.sda-avatar` is the separator ring. The Join CTA's avatar row is the existing overlap pattern to match.
- Names on one line in `.sda-author__name`: "A and B", "A, B and C". Each name is its own `<a>` to that member's profile when they have one, otherwise plain text. Links look like the name does today (no underline until hover/focus, visible focus ring).
- No tagline line in multi-author mode. Because the date and read time are baseline-aligned to the author block's last line (`align-items: last baseline`), check they now align with the names line.
- The row already wraps; at 375px wide three long names must wrap inside the author block without pushing the date and read time off-screen or overlapping the avatars.

The word "and" comes from a new locale key `blogs.article.authors_and` ("and") in `locales/en.default.json`. Commas are literal.

## B. Author card(s) after the body

- One card per author, lead first, stacked with a 16px gap inside a wrapper `div.sda-author-cards`. The 60px top margin moves from the card to the wrapper.
- Each card is exactly today's card: avatar, name as `h2`, bio truncated to 240 characters, socials, whole card clickable to the profile via the stretched `::after` link when the member has one. Each card needs `position: relative` of its own so the stretched links do not cover each other.
- `show_author_card` still turns the whole block on or off. No new section settings.

## C. Blog list meta line (`snippets/sda-post-meta.liquid`)

Runs inside links (featured card and rows), so still no nested links.

- One author: unchanged.
- Two authors: two overlapping 26px avatars, text "A and B".
- Three or more: the first three avatars overlapping, text "A and 2 others" from a new locale key `blogs.list.authors_more` with `name` and `count` variables, plural forms `one` ("{{ name }} and {{ count }} other") and `other` ("{{ name }} and {{ count }} others"). The count is always 2 or more here, so `one` is not reachable today; include it anyway so the key is correct if the two-author case changes later.
- Reuse `blogs.article.authors_and` for "and".
- `.sda-blog .sda-avatar` has no border today. Overlapping avatars need a 2px ring in the colour of whatever is behind them (the featured card and the rows may differ, and rows change background on hover if they do so today: check). The ring must not change the size or position of a lone avatar.
- The author item must still truncate or wrap cleanly on a 375px row next to the date and read time (`.sda-meta__item { min-width: 0 }` is already there).

## D. Structured data

In the `BlogPosting` JSON-LD in `sections/sda-article.liquid`:

- One author: unchanged (a single `Person` object).
- Multi-author: `author` is an array of `Person` objects in credit order, each with `name` and, only when that member has a public profile, an absolute `url` (`shop.url` + `system.url`).
- Every string still goes through the `json` filter. Watch the commas: the output must be valid JSON for 1, 2 and 3 authors, with and without profile URLs.

## E. Comment "Author" badge

Today the badge shows when `comment.author == author_name`. Show it when the commenter's name equals any resolved author's name. Match whole names, not substrings: for example build a delimited string such as `|Taylor Page|Karim Tarek|` and test for `|name|`, so "Tay" does not match "Taylor Page".

## F. Large groups (four or more authors)

A contributor-style post (for example a BFCM playbook with eight developers) must not turn the hero into a paragraph of names or put eight full-size cards under the article. When the resolved list has four or more people, sections A and B change as follows. Two or three authors behave as described above.

Hero meta row:

- Show the first four avatars in the stack. No "+N" bubble.
- The names line is "A and 7 others" from a new locale key `blogs.article.authors_more` (`name` and `count` variables, `one` and `other` forms). The lead's name links to their profile as usual; "7 others" is a link to `#authors`, the contributor block after the body. If `show_author_card` is off, "7 others" is plain text.

Contributor block after the body:

- The `div.sda-author-cards` wrapper gets `id="authors"`, the modifier `sda-author-cards--grid`, and an `h2` heading above the cards from a new locale key `blogs.article.contributors` ("Contributors"). Because the block now has an `h2`, the names inside the compact cards become `h3`.
- Cards are compact: 56px avatar, name, and the member's tagline in place of the bio. No socials. Whole card still links to the profile when the member has one.
- Two columns on desktop, one column at the existing mobile breakpoint. An odd count leaves the last cell empty; do not stretch the last card.
- The anchor target must not land under the sticky header: give the wrapper a `scroll-margin-top` consistent with how the article's heading anchors are already offset.
- If the table of contents in `assets/sda-article.js` is built from every `h2` inside the article, make sure it only picks up headings in `.sda-article__body`, or say in the report that "Contributors" now appears in the contents.

Blog list and JSON-LD need nothing extra: the list already collapses to "A and 7 others", and the JSON-LD lists every author.

Add to the "Done means" read-through cases: lead + 3 co-authors (the threshold), and 8 authors where some have no photo, no tagline or no public profile.

## Files

| File | Change |
| --- | --- |
| `sections/sda-article.liquid` | Author list resolution, hero meta, author cards, JSON-LD, comment badge |
| `snippets/sda-post-meta.liquid` | Multi-author meta line |
| `snippets/sda-avatar.liquid` (new) | Shared avatar |
| `snippets/sda-author-card.liquid` (new) | One author card |
| `assets/section-sda-article.css` | Avatar stack, multi-author names, card wrapper |
| `assets/section-sda-blog.css` | Avatar stack and ring in the meta line |
| `locales/en.default.json` | `blogs.article.authors_and`, `blogs.article.authors_more`, `blogs.article.contributors`, `blogs.list.authors_more` |

Nothing else. No JS changes are expected; if `assets/sda-article.js` selects anything inside the author block or card, say so in the report rather than editing around it silently.

## Done means

- A post with only `custom.author_member` set, and a post with no member at all, produce the same HTML as before in the hero, card, list meta line and JSON-LD, apart from whitespace and any markup that moved into a snippet unchanged.
- By reading the code, these all lay out and output correctly: lead + 1 co-author; lead + 2 co-authors; co-authors but no lead member (staff author as lead); co-authors and no lead of any kind; a co-author with no photo (initials); a co-author with no public profile (plain text name, no card link, no JSON-LD `url`); the same member in both fields; the `custom.co_authors` definition not existing.
- `shopify theme check` before and after: no new offenses, none in the edited or new files.
- No selector outside the existing section roots (`.sda-article`, `.sda-blog`). No `!important`. No inline styles or inline event handlers.
- Liquid follows `CLAUDE.md`: assignments at the top in `{% liquid %}` blocks, defaults first then conditional reassignment, no boolean expressions in `assign`.

## Report back

Files changed, theme-check counts before and after, the snippet structure you ended up with, and anything you did differently from this plan with the reason.

## For Taylor (not the coding agent)

1. Done 2026-11-11: the `custom.co_authors` definition exists on the store ("Co-authors", list of Members entries, `gid://shopify/MetafieldDefinition/510806851825`). Pick co-authors on a post under its Metafields section.
2. Browser QA once a post has co-authors: the hero row at desktop and 375px, the stacked cards, the blog list featured card and rows, a single-author post for regressions, and the JSON-LD in Google's Rich Results Test.
