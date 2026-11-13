# DESIGN.md

How ShopDev Alliance looks on the site, and the rules for keeping new work consistent. Every token and class named here exists in the files cited; if it isn't listed, it doesn't exist yet. Build rules are in [`AGENTS.md`](./AGENTS.md).

**Character:** a dark navy technical journal. Monospace body text, bold Titillium Web headings, one warm orange-to-red accent. The accent marks state and emphasis; the navy and the type carry the rest.

## Type

Set in the theme editor (`config/settings_data.json`), exposed as CSS variables:

| Role | Setting | Variable |
|---|---|---|
| Headings | `type_header_font`: `titillium_web_n7` (Titillium Web 700) | `--font-heading-family` |
| Body | `type_body_font`: `mono` (system monospace) | `--font-body-family` |

- Use the variables, never a font name. Don't add a webfont: it costs load time on every page.
- Labels and eyebrows use the heading font, bold, uppercase, 11–12px, with letter-spacing 0.14em (articles: `.sda-eyebrow`, `.sda-rail__read`) or 0.18em (blog listing: `.sda-blog .sda-eyebrow`).

## Color schemes

The site's colors come from the five schemes in `config/settings_data.json`. Sections pick one with a `color_scheme` setting, and the scheme sets `--color-background` and `--color-foreground`.

| Scheme | Background | Text | Use |
|---|---|---|---|
| `scheme-1` | `#0e1a2d` navy | `#f7f9fc` | Default. Blog and articles. |
| `scheme-2` | `#fff4ec` cream | `#0e1a2d` | Light sections. |
| `scheme-3` | orange-to-red gradient | `#0e1a2d` | Feature bands. |
| `scheme-4` | `#fd814f` orange | `#0e1a2d` | Accent bands. |
| `scheme-5` | `#1e3556` navy 3 | `#ffffff` | Raised navy bands. |

Use a scheme before writing colors into a section. A new scheme is a theme-editor change for a maintainer.

## Brand tokens (`--sda-*`)

Defined at the top of `assets/section-sda-article.css` (on `.sda-article`, `.sda-related`, `.sda-join`) and copied into `assets/section-sda-blog.css` (on `.sda-blog`). If you change or add a token, change both blocks. Section CSS uses these tokens, never raw hex.

| Token | Value | Use it for |
|---|---|---|
| `--sda-bg`, `--sda-fg` | the scheme's background and text | Page ground and body text |
| `--sda-ink-60` | text at 60% | Meta, labels, captions (6.6:1 on navy) |
| `--sda-ink-20`, `--sda-ink-10`, `--sda-ink-05` | text at 22%, 10%, 6% | Borders, tracks, faint fills. Never text. |
| `--sda-rule` | text at 14% | Dividers and card borders |
| `--sda-surface` | `#152539` | Cards: author card, callouts, table headers, form fields |
| `--sda-surface-2` | `#1b2c45` | Floating controls: back-to-top, the mobile reading bar |
| `--sda-code-bg` | `#0a1322` | Code blocks, and text sitting on the gradient |
| `--sda-orange` | `#fd814f` | Links on hover, current state, focus ring, list markers, eyebrows (7.0:1 on navy) |
| `--sda-gradient` | `#fd814f` → `#dc2a3c` at 184deg | Filled emphasis only (below) |
| `--sda-note`, `--sda-tip`, `--sda-red-2` | `#8ecae6`, `#7fd99a`, `#e5414d` | Callout borders: note, tip, warning |
| `--sda-navy-3` | `#1e3556` | Navy placeholder fill (`.sda-post-card__image--1`) |
| `--sda-red` | `#dc2a3c` | Defined but unused in section CSS today; the red reaches the page through `--sda-gradient` |

What gets which accent:

```
Is it a state (current page, current TOC item, hover, focus)?
 ├── Yes → --sda-orange as text, underline or border
 └── No
      ├── Is it a small filled badge or marker (accent tag, avatar fallback, h2 marker, comment badge, progress fill)?
      │    └── Yes → --sda-gradient fill, --sda-code-bg text on it
      └── Default → --sda-fg or --sda-ink-60. No accent.
```

Text on the gradient is always `--sda-code-bg`, never white: 7.5:1 on the orange end, 3.9:1 on the red end. Keep that text bold and short. Never set body text in orange or on the gradient.

## Components

Sections (each loads its own stylesheet):

- `sections/sda-blog.liquid`: the blog listing (featured post, filters, rows, pager). Styles in `section-sda-blog.css`.
- `sections/sda-article.liquid`: the article page (hero, body, sticky rail with progress and "On this page", mobile reading bar). Behaviour in `assets/sda-article.js` (`<sda-article>`).
- `sections/sda-article-related.liquid`: related articles grid under an article.
- `sections/sda-join-cta.liquid`: the join call to action under an article.

Snippets (all start with a `{% doc %}` block listing their params):

- `sda-post-row`: one row in the blog list. `sda-post-card`: one card in the related grid. Use the row for lists, the card for grids.
- `sda-post-meta`: author, date, reading time. `sda-read-time`: reading time alone.
- `sda-author-card`, `sda-avatar`: author blocks. The avatar falls back to initials on the gradient when there's no photo.
- `sda-dispatch-code`: the dispatch number, as `pill`, `stacked` or `text`. Series come from the article's `custom.audience` metafield: `DEV` (developers, orange) and `MER` (merchants, `--sda-note` blue). No other series exist.

Article body extras, added by `sda-article.js`:

- A blockquote whose first line is `[!NOTE]`, `[!TIP]`, `[!WARNING]`, `[!IMPORTANT]` or `[!CAUTION]` becomes a callout (`.sda-callout--note`, `--tip`, `--warning`). IMPORTANT renders as note and CAUTION as warning.
- Code blocks get a language label and a copy button. h2 and h3 build the "On this page" list. The list hides when there are fewer than 2 headings.

## Shape, layout, motion

- Radii: 10px for cards and callouts, 6px for buttons and pager controls (`buttons_radius` is 6), 4px for focus outlines on links, 40px (a pill) for `.sda-tag`, 50% for avatars and dots.
- The article rail shows at 1080px and up. Below that it is hidden and the mobile reading bar opens the contents. Other breakpoints in the SDA stylesheets: 960, 820, 720, 500, 460px. Reuse one of these before adding a new one.
- Focus: `outline: 2px solid var(--sda-orange)` with a 3–4px offset on every link, button and field. Don't remove it.
- Motion stays off under `prefers-reduced-motion: reduce`, and smooth scrolling becomes instant (`sda-article.js`). New animation follows the same rule.
