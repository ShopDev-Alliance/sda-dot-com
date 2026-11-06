# Build Award Winner Badge — Directory + Profile

**Status:** Ready for handoff
**Date:** 2026-11-06
**Scope:** Theme only (Liquid/CSS). No metaobject definition changes.

---

## Goal

Surface the existing `build_award_winner` boolean on `members` metaobjects:

1. **Member directory** (`/pages/members`) — small diamond icon next to the member's name. Icon only, no text.
2. **Member profile page** (metaobject template `members`) — diamond icon + full text **"Shopify Build Award Winner"**.

## Data (verified against live store, 2026-11-06)

- Metaobject type: `members`
- Field key: **`build_award_winner`** — type `boolean`, name "Build Award Winner"
- Access: `metaobject.build_award_winner.value` (true / false / nil when unset)
- Currently flagged `true` (7) — useful for QA because they cover every render path:

| handle | role | profile | Directory render path |
|---|---|---|---|
| taylor-page | Founder | true | `card-member` snippet |
| harshdeep-singh-hura | Founding Member | false | `card-member` snippet (div, no link) |
| jordan-f | Member | true | `<a class="members-row__member-link">` |
| patrick-jakubik | Member | true | `<a class="members-row__member-link">` |
| dennis-cessan | Member | false | `<h5 class="members-row__member">` |
| ruben-bristian | Member | false | `<h5 class="members-row__member">` |
| sam-forde | Member | false | `<h5 class="members-row__member">` |

Profiles with pages to check: `taylor-page`, `jordan-f`, `patrick-jakubik`.

## Files

| File | Change |
|---|---|
| `snippets/icon-diamond.liquid` | **New.** Inline SVG diamond/gem icon |
| `snippets/badge-build-award.liquid` | **New.** Renders the badge in `icon` or `full` variant; owns its CSS |
| `snippets/card-member.liquid` | Accept new `build_award` param, render icon badge inside the name `<h3>` |
| `sections/page-members.liquid` | Pass `build_award` to `card-member`; render icon badge inside the Member-row link / h5 |
| `sections/custom-member.liquid` | Render full badge in `.profile-left--info` under the tagline |

## Implementation

### 1. `snippets/icon-diamond.liquid` (new)

**Style: outline / line-art diamond** (the classic "Shopify diamond" shape — flat top, horizontal girdle line, pointed bottom, triangular crown facets). Stroke only, no fill. Deliberately *not* the blue filled gem used for Shopify's "Built for Shopify" badge, so the two don't read as the same thing; the text label on the profile does the rest of the disambiguation.

Use exactly this SVG (geometry traced from the reference shape, normalized to a 24×24 box):

```html
<svg class="icon icon-diamond" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="1.5"
     stroke-linecap="round" stroke-linejoin="round"
     aria-hidden="true" focusable="false">
  <path d="M5.9 3.7H18.1L22 9L12 20.3L2 9Z"/>
  <path d="M2 9H22"/>
  <path d="M5.9 3.7L7.9 9L12 20.3"/>
  <path d="M12 3.7L7.9 9"/>
  <path d="M12 3.7L16.1 9"/>
  <path d="M18.1 3.7L16.1 9L12 20.3"/>
</svg>
```

- Outline: flat top edge → right girdle point → bottom point → left girdle point.
- Girdle: horizontal line across the widest point.
- Crown: two inner girdle points (7.9, 16.1) joined up to the top corners and the top center, forming the triangle facets.
- Pavilion: lines from those inner girdle points down to the bottom point.
- `stroke-width` may be bumped to `2` at very small sizes if it looks too thin — adjust in CSS via `.build-award-badge--icon .icon-diamond { stroke-width: 2; }` rather than duplicating the SVG.

### 2. `snippets/badge-build-award.liquid` (new)

Params: `variant` — `'icon'` (default) or `'full'`.

Structure (order per CLAUDE.md: liquid → style → markup):

```liquid
{% liquid
  assign badge_variant = 'icon'
  if variant == 'full'
    assign badge_variant = 'full'
  endif
%}

<style> … </style>  {%- comment -%} or move styles to assets/custom-styles.css — see note {%- endcomment -%}

{% if badge_variant == 'full' %}
  <p class="build-award-badge build-award-badge--full">
    {% render 'icon-diamond' %}
    <span>Shopify Build Award Winner</span>
  </p>
{% else %}
  <span class="build-award-badge build-award-badge--icon" title="Shopify Build Award Winner">
    {% render 'icon-diamond' %}
    <span class="visually-hidden">Shopify Build Award Winner</span>
  </span>
{% endif %}
```

Styling:
- Define a single CSS variable for the gem color, `--build-award-color`, on `.build-award-badge`, defaulting to `currentColor` (the diamond matches the surrounding text color, like the black line-art reference). The icon's `stroke` inherits via `color: var(--build-award-color)`. One place to change it if we later want a tint.
- **Icon variant:** `display: inline-flex; vertical-align: middle;` sized relative to text (`width/height: 0.9em`), small left margin (`margin-left: 0.4rem`). Must sit inline with the name and not wrap onto its own line in the narrow directory grid.
- **Full variant:** `display: inline-flex; align-items: center; gap: 0.75rem;` matching the visual weight of the existing `badge-dot` "Open to work" pill (rounded border `30px`, border in `--build-award-color`, padding similar to `.badge-dot`, bold text ~`1.25rem`, `margin: 0`). Icon ~`1.6rem`.
- Since the snippet renders many times on the directory page, **put the CSS in `assets/custom-styles.css`** (already loaded site-wide and already holds `.members-row--*` / `.member-card` styles) rather than a `<style>` block inside the snippet, to avoid ~N duplicate style blocks. Leave a Liquid comment in the snippet pointing to where styles live.
- No JS. No hover effects required.

### 3. `snippets/card-member.liquid`

- Add param `build_award` (boolean).
- Inside the existing `<h3 class="member-card__name h5">`, after `{{ name }}`:
  ```liquid
  {% if build_award %}{% render 'badge-build-award', variant: 'icon' %}{% endif %}
  ```
- Keep whitespace tight so there's no stray gap/underline weirdness on the hover state of `a.member-card:hover .member-card__name`.
- Verify the `.member-card h3` styles (custom-styles.css ~line 130) don't force the icon onto a new line; if the name is centered, the icon should travel with the name.

### 4. `sections/page-members.liquid`

At the top of the loop body, assign once per member (CLAUDE.md pattern — init then reassign):

```liquid
{% liquid
  assign is_build_award_winner = false
  if metaobject.build_award_winner.value == true
    assign is_build_award_winner = true
  endif
%}
```

Then:
- `card-member` render call: add `build_award: is_build_award_winner`.
  - While here, remove the **duplicate** `profile_photo:` arg (currently passed twice — first as the field object, then as `.value`; the second wins). Keep `profile_photo: metaobject.profile_photo.value`.
- Member rows (`role == 'Member'`): inside both the `<a class="members-row__member-link h5">` and the `<h5 class="members-row__member h5">`, after `{{ metaobject.name.value }}`:
  ```liquid
  {% if is_build_award_winner %}{% render 'badge-build-award', variant: 'icon' %}{% endif %}
  ```
- Check the `.members-row__member-link` underline/hover styles (custom-styles.css ~lines 59–72) — the icon should not get a text-decoration underline gap. If needed, `text-decoration: none` on `.build-award-badge`.

### 5. `sections/custom-member.liquid`

- In the top `{% liquid %}` block, add:
  ```liquid
  assign is_build_award_winner = false
  if metaobject.build_award_winner.value == true
    assign is_build_award_winner = true
  endif
  ```
- In `.profile-left--info`, render **after the tagline and before the "Open to work" badge**:
  ```liquid
  {% if is_build_award_winner %}
    {% render 'badge-build-award', variant: 'full' %}
  {% endif %}
  ```
- If a member has both the award and Open to work, the two pills stack in `.profile-left--info` — make sure there's vertical spacing between them (small `margin-bottom` on the full badge, or gap on the container if it's flex).

## Out of scope (note for later)

- **Award year.** Future: add a `build_award_year` (integer or list) field to the definition and render "Shopify Build Award Winner 2026" / tooltip on the icon. Snippet is built so a `year` param can be added without touching call sites much.
- Homepage "Founding Members" carousel (`sections/members-metaobjects.liquid`) and `/pages/for-the-merchants` simple list (`sections/member-list-simple.liquid`) — **not** getting the badge in this pass.
- Customer-account members app (sibling repo `sda-members-app`) — no changes.

## Acceptance checklist

Directory `/pages/members`:
- [ ] Diamond shows next to the name for all 7 flagged members, across Founder card, Founding Member card, Member link, and Member plain-text rows.
- [ ] No diamond for members without the flag (including where the field is unset/nil).
- [ ] Icon stays inline with the name on mobile (narrow grid) and desktop.
- [ ] Hovering a linked name/card still behaves as before; no odd underline under the icon.
- [ ] Screen reader text "Shopify Build Award Winner" present on each icon; `title` tooltip on hover.
- [ ] "For hire" filter (`body.for-hire`) still works.

Profile pages (`taylor-page`, `jordan-f`, `patrick-jakubik`):
- [ ] Full pill "◆ Shopify Build Award Winner" under the tagline.
- [ ] Spacing is clean when Open to work badge also shows.
- [ ] Non-winner profile shows no badge.

General:
- [ ] No console errors. `shopify theme check` passes for touched files (no new offenses).
- [ ] Follows CLAUDE.md: liquid → CSS → markup ordering, init-then-reassign booleans, no `var`.

## Rules for the coding agent

- **No git commands** (no commit, branch, push, stash, etc.). Taylor runs all git.
- **No browser automation.** Taylor does browser QA.
- Don't modify the metaobject definition or any metaobject entries.
- Don't edit `templates/*.json` (auto-generated by the theme editor).
- When done, list every file changed/created with a one-line summary.
