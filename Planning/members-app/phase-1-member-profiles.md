# SDA Members App: Phase 1, Self-Serve Member Profiles

> Local planning doc. Not committed. Owner: Taylor Page. Created 2026-11-06.
> Build target: **new sibling repo `../sda-members-app`** (`/Users/taylorpage/ShopDevAlliance/sda-members-app`).
> Coding agents: **do not run git commands and do not open browsers.** Taylor runs git and does browser QA.

---

## 1. Context

Today a member fills out a separate **Tally form**, then Taylor builds a `members` metaobject entry by hand (207 exist). This is manual, error-prone, and members can't update their own info.

**Goal:** replace Tally with a profile form **inside Shopify customer accounts** (shopdevalliance.com/account). An approved member logs in, creates or edits their profile, and chooses whether they get a **public profile page**.

This is the first feature of a broader SDA Members App (see the Roadmap in section 9). It ships first as a **custom app on the SDA store via the Dev Dashboard**. We build it so it can later become a public App Store app without a rewrite.

### Visibility rule (important)
- **Every active member is always shown in the members directory.** Being listed is part of membership and is **not** member-controlled.
- The only member-controlled visibility setting is the existing **`profile` boolean**:
  - `profile = true`: their name in the directory links to their public page at `/pages/members/<handle>`.
  - `profile = false`: their name shows with no link, and the page renders nothing.
- The theme already enforces this: `sections/page-members.liquid` links only when `metaobject.profile`, and `sections/custom-member.liquid` renders only when `show_profile`. **No theme changes in Phase 1.**
- Metaobject entries stay **ACTIVE** (publishable status) at all times so they appear in the directory.
- No `listed` field. (A possible future option is noted in the Roadmap. Do not build it.)

---

## 2. What already exists (verified 2026-11-06)

### `members` metaobject definition (store: `shopdev-alliance.myshopify.com`)
- Publishable: on. Online store URL handle: `members` (pages at `/pages/members/<handle>`). 207 entries.
- Template: `templates/metaobject/members.json` → `sections/custom-member.liquid`.
- Fields (`*` = required):

| key | type | notes | member-editable? |
|---|---|---|---|
| `name`* | single_line_text | | yes |
| `profile`* | boolean | public page on/off | **yes** (the visibility toggle) |
| `role`* | single_line_text | choices: Founder / Founding Member / Member | **no** (admin) |
| `email` | single_line_text | | no (set from customer) |
| `build_award_winner` | boolean | | **no** (admin) |
| `profile_photo` | file_reference | Image/Video | yes |
| `open_to_work` | boolean | | yes |
| `tagline` | single_line_text | | yes |
| `working_hours` | single_line_text | | yes |
| `languages` | list.single_line_text | choices | yes |
| `website` | url | | yes |
| `twitter` | url | allowed: twitter.com, x.com | yes |
| `linked_in` | url | allowed: linkedin.com, www.linkedin.com | yes |
| `github` | url | allowed: github.com | yes |
| `you_tube` | url | allowed: youtube.com, www.youtube.com | yes |
| `alternative_contact` | url | | yes |
| `description` | rich_text | | yes |
| `primary_service` | single_line_text | | yes |
| `services` | list.single_line_text | choices | yes |
| `additional_services` | rich_text | | yes |
| `technologies` | list.single_line_text | choices | yes |
| `skills_and_technologies_additional_notes` | rich_text | | yes |
| `portfolio_sites` | rich_text | | yes |
| `reviews` | list.metaobject_reference | | **no** (admin) |
| `other_links` | rich_text | | yes |
| `industry_experience` | list.single_line_text | choices | yes |
| `city` | single_line_text | | yes |
| `state` | single_line_text | | yes |
| `coordinates` | single_line_text | used by globe | **no** (admin/derived) |

- **Customer metafield definitions: none exist.** This is a clean start.

### Known gotcha
- `metaobjectUpsert`/`metaobjectCreate` creates entries as **DRAFT**. Always set `capabilities.publishable.status: ACTIVE` or the entry won't render.

### Related systems
- `../SDA-Invites`: Cloudflare Worker (KV, Stripe Checkout, Resend email, Slack shared invite). Handles approval → payment → Slack invite. `/webhook/stripe` in `worker.js` is where "member is paid and active" happens.
- `../member-app`: empty and abandoned. **Do not use it as a base.**
- Store CLI access: `shopify store execute --store shopdev-alliance.myshopify.com [--allow-mutations]`.

---

## 3. Architecture

```
Customer Accounts (shopdevalliance.com/account)
  └─ Customer Account UI extension "member-profile"
       • full page:  customer-account.page.render       (the profile editor)
       • block:      customer-account.profile.block.render (card linking to the editor)
       │ reads  sda.member / sda.member_status via Customer Account API
       │ writes via fetch(APP_URL/…, Authorization: Bearer <sessionToken>)
       ▼
Cloudflare Worker backend (../sda-members-app/worker, Hono)
  • verifies customer-account session token (JWT, app secret; sub = customer GID, dest = shop)
  • holds offline Admin API token (wrangler secret / KV)
  • GET  /api/profile         → field config + current values + live choices
  • POST /api/profile         → validate + allowlist → create/update members entry, link customer
  • POST /api/profile/photo   → stagedUploadsCreate → (client uploads) → fileCreate → set profile_photo
```

- **Approval in v1 happens in the native Shopify admin.** A customer metafield of type `metaobject_reference → members` shows a picker on the customer page, and `member_status` is editable there. No admin extension is needed yet.
- **Hosting:** Cloudflare Workers, the same platform as SDA-Invites, so Slack, Stripe, and Resend logic can be shared later.

---

## 4. Data model changes (one-time, via Admin API)

1. **Customer metafield definitions** (namespace `sda`, owner CUSTOMER). Give both `access.customerAccount: READ` so the extension can read them, and keep admin writable:
   - `sda.member`: `metaobject_reference`, validation → `members` definition. Its presence means "this customer owns this profile."
   - `sda.member_status`: `single_line_text_field`, choices `approved | active | lapsed`.
     - `approved`: may create a profile (no entry yet).
     - `active`: has a profile and may edit.
     - `lapsed`: read-only, with a renewal message. (Lapsed handling of the directory listing is a future decision; see Roadmap.)
2. **`members` definition**: add one field:
   - `customer`: `customer_reference` (reverse link; lets admin jump from member to customer).
3. Do **not** add `listed`. Do **not** change the existing fields' types or validations.

Deliver this as an idempotent script in the new repo (`scripts/setup-definitions.mjs` or `.graphql` files run with `shopify store execute`), with a `--dry-run` mode that prints planned changes.

---

## 5. Repo & stack (`../sda-members-app`)

```
sda-members-app/
  shopify.app.toml                  # Dev Dashboard app config
  extensions/member-profile/        # customer account UI extension (Preact + Polaris web components)
    shopify.extension.toml          # targets above; [extensions.capabilities] network_access = true, api_access = true
    src/
  worker/                           # Cloudflare Worker (Hono, TypeScript)
    wrangler.jsonc
    src/index.ts
    src/auth.ts                     # session-token verification
    src/admin.ts                    # Admin GraphQL client
    src/profile-fields.ts           # SINGLE source of truth: editable keys, labels, input types, sections
    src/richtext.ts                 # plain text <-> Shopify rich-text JSON
  scripts/
    setup-definitions.mjs
    backfill-customers.mjs
  README.md                         # setup, secrets, dev, deploy
  CLAUDE.md                         # conventions (let/const only, never var; no git; no browser)
```

- **Scaffold** with `shopify app init` (extension-only / no embedded admin UI for now), then `shopify app generate extension` (customer account UI extension).
- **Scopes:** `read_customers, write_customers, read_metaobjects, write_metaobjects, read_metaobject_definitions, write_files`, plus customer-account metafield read access as needed. Validate with `shopify app config validate --json`.
- **Admin token:** look up the current Shopify docs for the right way to get an offline Admin token for a Dev Dashboard custom app installed on our own store (client-credentials grant if supported, otherwise a one-time OAuth install route that stores the offline token in a wrangler secret or KV). Record the choice in README.
- **Field config is defined once** in `worker/src/profile-fields.ts` and served by `GET /api/profile`, so the extension renders the form from config instead of hard-coding fields twice. **Pull `choices` validations live from the definition** so new services, technologies, or languages appear automatically.
- **JS conventions:** `let`/`const` only, never `var`; modern syntax.
- **Shopify API version:** use the current stable Admin API version and validate GraphQL with the Shopify dev MCP / `validate` tooling.

---

## 6. Extension UX (the Tally replacement)

State machine, driven by `sda.member_status` + `sda.member`:

| State | UI |
|---|---|
| no status | "Member profiles are for active ShopDev Alliance members." + link to join page. |
| `approved`, no `sda.member` | "Create your member profile" → the full form. On submit: create `members` entry (handle from name, uniquified; `role: Member`; `email` + `customer` set; status **ACTIVE**), set `sda.member`, set `member_status = active`. |
| `active` + `sda.member` | Profile editor pre-filled with current values. |
| `lapsed` | Read-only view + renewal message. |

**Form sections** (render from config):
1. **Basics:** name, tagline, profile photo, city, state, working hours, languages, open to work
2. **Services:** primary service, services, additional services
3. **Skills:** technologies, skills & technologies notes, industry experience
4. **Links:** website, Twitter/X, LinkedIn, GitHub, YouTube, alternative contact, portfolio sites, other links
5. **About:** description
6. **Public profile page:** a single toggle bound to `profile`, with helper text: "You'll always appear in the members directory. Turn this on to give your name a link to a full public profile page." When on, show the live URL (`https://shopdevalliance.com/pages/members/<handle>`).

**Field handling:**
- Rich text fields: edit as plain multi-line text. Backend converts paragraphs (blank-line separated) and line breaks to Shopify rich-text JSON, and flattens existing rich text to plain text for editing. Note in README that formatting such as links/bold in existing entries is flattened on save. *(Open item: confirm with Taylor whether any existing entries rely on rich formatting; the agent should report how many entries have rich-text content with links/bold during backfill dry-run.)*
- URL fields: validate client- and server-side against the definition's `allowed_domains`. Normalize a missing `https://`.
- List fields with choices: multi-select (checkbox group) from live choices.
- Photo: drop zone → `POST /api/profile/photo` → staged upload → `fileCreate` → wait for READY → set `profile_photo`. Images only, with a reasonable size cap.
- Show success and error banners, and disable save while a request is in flight.
- Accessibility: every input labeled; errors tied to fields.

---

## 7. Backend rules (security)

- Every `/api/*` request must carry a valid customer-account session token. Reject missing, expired, or bad-signature tokens with 401, and check `dest` matches our shop.
- The customer GID comes **only** from the token `sub`, never from the request body.
- A customer may only read or write the entry referenced by **their own** `sda.member`. Re-read it server-side on every write.
- **Allowlist:** only member-editable keys (section 2 table) are accepted. `role`, `build_award_winner`, `reviews`, `coordinates`, and `email` are ignored or rejected if sent.
- On every write, keep publishable status **ACTIVE**.
- CORS: allow only the customer-account extension origin(s) Shopify uses. Handle OPTIONS.
- No secrets in the extension bundle.

---

## 8. Build order (Phase 1)

1. **Repo scaffold:** `shopify app init` in `../sda-members-app`, Dev Dashboard app created and linked, extension generated, Worker skeleton, README + CLAUDE.md. *(Taylor creates the Dev Dashboard app and installs it on the store if a manual step is needed; the agent lists exactly what to click or run.)*
2. **Definitions:** `scripts/setup-definitions.mjs` (dry-run, then apply), creating `sda.member`, `sda.member_status`, and `members.customer`.
3. **Backfill** (`scripts/backfill-customers.mjs`, dry-run by default):
   - For each of the 207 `members` entries with an `email`, find the Shopify customer by email. If none exists, create one with **no invite email**.
   - Set `sda.member` → entry, `sda.member_status = active`, and `members.customer` → customer.
   - Write a CSV report to `scripts/out/backfill-report.csv` (matched / created / no email / duplicate).
   - Also report the count of entries whose rich-text fields contain links or formatting (see section 6 open item).
4. **Auth + read path:** session-token verification, `GET /api/profile`, extension renders state + read-only values.
5. **Write path:** `POST /api/profile` edit, the `profile` toggle, and the create-new flow.
6. **Photo upload.**
7. **Approval hook (separate change in `../SDA-Invites`; do last and keep isolated):** in `worker.js` `/webhook/stripe` on successful checkout, upsert the Shopify customer by email, set `sda.member_status = approved`, and include "Create your member profile at shopdevalliance.com/account" in the confirmation email. This retires the Tally form.

**Out of scope for Phase 1:** theme changes, admin UI extension, Slack, subscriptions, public-app packaging.

---

## 9. Roadmap (keep this; it's the vision for a future public app)

### Phase 1: Member profiles (this doc)
Self-serve profile create/edit in customer accounts, `profile` public-page toggle, customer ↔ member linking, Tally retired, Stripe approval hook.

### Phase 2: Admin & approval tooling
- Admin UI extension on the customer page: "Approve as member", "Link/unlink member profile", status at a glance.
- Approval queue (embedded admin page): pending applicants → approve → triggers invite (SDA-Invites) + sets `approved`.
- Audit trail of profile edits (who changed what, when), stored in KV/D1.
- Optional: content moderation flag before profile changes go live.

### Phase 3: Membership status sync (Stripe)
- Stripe subscription webhooks → `sda.member_status` (`active` / `lapsed`), with a grace period.
- Decide what "lapsed" means for the directory (hide entry? keep but unlink? a "former member" state?).
- Member-facing billing link (Stripe customer portal) from the customer account extension.

### Phase 4: Slack integration
- Verify Slack membership/active status (`users.lookupByEmail`, presence/last active) and show it in admin.
- Auto-invite/deactivate in Slack based on membership status.
- Slack profile ↔ member profile sync (photo, title, links).
- "Members-only content unlocked" gating tied to Slack + Shopify status.

### Phase 5: Member benefits & gated content
- Members-only resources/benefits (`member_benefits` metaobject) visible in customer accounts.
- Members managing their own `member_benefits` entries (offers they provide to the community).
- Member-only pages/content gated by `sda.member_status` in the theme.

### Phase 6: Native subscriptions
- Move membership billing from Stripe into Shopify (subscription app / selling plans) or build our own subscription option.
- Migration path for existing Stripe subscribers.

### Phase 7: Public app
- Generalize for any community or membership merchant: configurable profile schema, directory sections, approval flow, Slack/Discord connectors, billing.
- App Store review requirements (network access approval for customer account extensions, GDPR webhooks, billing API).
- Business structure decision: SDA vs. The Pages Media as publisher. Revenue could fund community ventures and paid community contributors, and build partnerships.

### Parking lot / ideas
- `listed` (directory opt-out) field: **intentionally not built**. Revisit only if there is a real need (e.g., privacy requests).
- Auto-geocode city/state → `coordinates` for the globe.
- Profile completeness meter + nudges.
- Reviews/testimonials submitted by other members (moderated).
- Member search/filter by service, technology, language, open-to-work.

---

## 10. Verification (agent self-checks before handing back)

- `shopify app config validate --json` passes. Extension builds with no type errors. Worker typechecks (`tsc --noEmit`) and runs under `wrangler dev`.
- Unit tests (Vitest) for: session-token verification (valid / expired / wrong signature / wrong dest), field allowlist, rich-text conversion round-trip, URL domain validation.
- Definitions and backfill scripts run in **dry-run** mode and print planned changes. **Do not apply mutations to the live store without Taylor's go-ahead**; ask first.
- Provide Taylor a manual QA checklist for the browser:
  - test customer in each state (none / approved / active / lapsed) sees the correct UI
  - edit fields → visible on `/pages/members/<handle>`
  - toggle `profile` → directory link appears/disappears on `/pages/members`, and the page renders/blanks
  - photo upload works
  - forged request to `/api/profile` → 401
- Final report: files created, commands Taylor needs to run (Dev Dashboard, installs, secrets, deploy), and any open questions.

---

## 11. Review log
_(Taylor + Claude fill this in after each agent pass.)_

### Pass 1: 2026-11-06 (Claude code review)

**Agent report:** 59 tests pass, typecheck + Worker dry build + extension build pass, all 15 Admin ops validated against the 2026-10 schema. No deploys and no live mutations. Backfill dry-run is blocked because the CLI token lacks `read_customers`. Scan results: 207 entries, 30 with no email, 36 with rich-text formatting.

**Looks good**
- Auth: HS256 session token verified with audience, exp/nbf, and `dest` = our shop. The customer GID comes only from `sub`.
- Ownership: every read and write re-checks `sda.member` and the reverse `members.customer` link. Writes are blocked unless status is `approved`/`active`.
- Editable-field allowlist matches spec. `role`, `build_award_winner`, `reviews`, `coordinates`, and `email` are rejected.
- Entries are kept ACTIVE on every write. `profile` is the only visibility toggle and there is no `listed` field.
- Edits send only changed fields, so untouched formatted rich text is preserved.
- Photo flow: signed upload tickets, type/size checks before and after processing, and only JPEG/PNG/WebP up to 5 MiB.
- Wildcard CORS (`*`) is **correct**. Shopify extensions run with a `null` origin, and auth is bearer-token only (no cookies or credentials).
- Scripts default to dry-run, refuse to overwrite conflicting definitions, and create customers without sending invites.

**Must fix (sent to agent as pass 2)**
1. **Clearing a rich-text field leaves an empty paragraph.** `toRichText('')` returns a root with an empty text node, which is not `blank` in Liquid. `custom-member.liquid` (`== blank` guards on lines 104/133/146/152/181) would then render empty section headings. Return `''` for blank or whitespace-only input.
2. **Links are lost when members edit `portfolio_sites` / `other_links`.** Plain-text editing flattens link nodes, so URLs on the public page stop being clickable. Auto-link URLs in `toRichText` (`{type:'link', url, children:[{type:'text', value}]}`), and treat single newlines as separate paragraphs so one-URL-per-line lists render properly.
3. **Admin token is minted on every request** (client-credentials call + ~4–10 Admin calls per request). Cache it in Durable Object storage until `expires_in` minus a safety margin, and refresh on 401.

**Decisions for Taylor**
4. **New-member URL handle** is currently `name-<13-digit customer id>` (e.g. `/pages/members/jane-doe-8123456789012`). Recommendation: a clean `jane-doe`, falling back to `jane-doe-2` on collision. Reserve handles globally (single DO name), not per customer.
5. Drop `write_metaobject_definitions` from the app scopes. Only the CLI setup script needs it, and that uses Taylor's CLI auth.

**Minor**
6. Ownership-mismatch and invalid-link errors fall into the generic 502 message. Return 409 with the friendly "contact SDA" text so members see something actionable.

**Taylor's action items (unchanged from agent HANDOFF.md)**
- Re-auth the CLI with customer scopes, then rerun the dry runs.
- Create the Dev Dashboard app in the store's org and fill in the client ID/secret.
- Decide owners for the 30 no-email entries.
