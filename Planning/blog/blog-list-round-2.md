# SDA blog list template — round 2

Follow-up to `Planning/blog/blog-list.md` after code review. Taylor's browser pass had no notes. Three small fixes.

Same ground rules: no git, no browser, no store writes, follow `CLAUDE.md`.

Files you may edit: `sections/sda-blog.liquid`, `snippets/sda-post-row.liquid`, `assets/section-sda-blog.css`. Nothing else. No locale changes are needed. The article page files stay untouched.

Not changing: the "Latest" pill keeps its dark text on the gradient.

## A. Mobile thumbnail sits low on rows with no kicker

Cause: at ≤720px `.sda-blog .sda-post-row .sda-cover` has `margin-top: 30px` so the square thumbnail lines up with the title, below the kicker line (code pill and topic pill). A post with neither a dispatch code nor a topic tag has no kicker, so the thumbnail starts 30px below the title.

Fix:

- In `snippets/sda-post-row.liquid`, add a `has_kicker` variable at the top (default `false`, set to `true` when `dispatch_code != blank or topic != blank`). Use it for the existing kicker condition, and add the class `sda-post-row--no-kicker` to the row's `<a>` when it is false.
- In `assets/section-sda-blog.css`, inside the ≤720px block and after the existing cover rule, set `margin-top: 4px` on the cover for `.sda-post-row--no-kicker`.

Desktop is unaffected: the cover has no top margin there.

## B. Focus ring changes the corner radius

Cause: `.sda-blog a:focus-visible` sets `border-radius: 4px`. It outranks `.sda-blog .sda-post-row` (10px) and `.sda-blog .sda-pager__btn` (6px), so those change shape while focused.

Fix, in `assets/section-sda-blog.css`, directly after the generic focus rule:

- `.sda-blog .sda-post-row:focus-visible` and `.sda-blog .sda-featured__card:focus-visible`: `border-radius: 10px`.
- `.sda-blog .sda-pager__btn:focus-visible` and `.sda-blog .sda-pager__pages a:focus-visible`: `border-radius: 6px`.

Leave the generic rule as it is for the filter tabs and other links.

## C. List heading on non-series tag views

Cause: on a tag view that is not one of the two series (for example `/blogs/dispatches/tagged/engineering`), `list_label` stays at the "All dispatches" setting although the list is filtered.

Fix, in the top `{% liquid %}` block of `sections/sda-blog.liquid`: when `is_filtered` is true and `active_series == 'all'`, set `list_label` to `current_tags | join: ', '`. Keep the default-then-reassign pattern. The label is already escaped where it is output; do not escape it twice.

The series tabs and the "All" tab's `aria-current` logic do not change.

## Done means

- `shopify theme check`: same counts as before this round (1,574 errors, 16 warnings), nothing in the edited files.
- Every selector still starts with `.sda-blog`. No `!important`, no inline styles, no JS.
- Only the three files above changed.

## Report back

Files changed, theme-check counts before and after, and anything done differently from this plan with the reason.
