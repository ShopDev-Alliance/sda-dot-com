# JavaScript Patterns

Conventions for JavaScript in this Shopify theme. Anything new (theme custom JS, web components, inline `<script>` blocks in Liquid) should follow this document. Existing files that still use older patterns should be modernized when touched.

## Declarations

**Never use `var`.** Always use `const` by default and `let` only when the binding genuinely needs to be reassigned.

```js
// Good
const headings = content.querySelectorAll('h2, h3');
let activeId = null;

// Bad — never
var headings = content.querySelectorAll('h2, h3');
```

Why: `var` is function-scoped and hoisted, which creates subtle bugs with closures and loops. `const`/`let` are block-scoped and match how developers already read the code.

## Supported syntax

Target evergreen browsers (Chrome/Edge/Firefox/Safari latest + one). Use the following freely:

- Arrow functions
- Template literals
- Destructuring (object and array)
- Default parameters
- Spread / rest (`...`)
- Optional chaining (`?.`) and nullish coalescing (`??`)
- `async` / `await`
- Native `Promise`, `Map`, `Set`, `WeakMap`, `WeakSet`
- `for...of`, `Array.from`, `[...iterable]`
- `class` syntax (including `extends` for custom elements)
- Modules are **not** supported in Shopify theme assets without `type="module"` in the script tag — prefer IIFE block scoping (see below) or custom elements.

## File scoping

Shopify concatenates and serves assets as classic scripts (no ES modules by default). To avoid leaking identifiers into the global scope, wrap each file in a block:

```js
{
  'use strict';

  const init = () => {
    /* ... */
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
```

A bare `{ ... }` block is enough — everything declared with `const`/`let`/`class` inside is block-scoped. You do not need an IIFE (`(function () { ... })()`).

## DOM querying

Prefer `querySelector` / `querySelectorAll` with `data-*` hooks over classes. Classes can change for styling reasons; data hooks should only change when behavior changes.

```js
// Good
const tocEl = article.querySelector('[data-article-toc]');

// Avoid (couples JS to styling classes)
const tocEl = article.querySelector('.article-template__toc');
```

Access dataset properties via the `.dataset` accessor, not `getAttribute`:

```js
// Good
const theme = article.dataset.codeTheme;

// Avoid
const theme = article.getAttribute('data-code-theme');
```

## Events

- Use `addEventListener` with `{ passive: true }` for scroll/touch listeners that don't call `preventDefault`.
- Never use inline `onclick=""` handlers in Liquid. Attach listeners from JS. (See `CLAUDE.md` — styling changes on hover should be CSS, and complex handlers should be wired in JS.)
- For high-frequency events (scroll, mousemove, resize), throttle with `requestAnimationFrame`:

```js
let ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  window.requestAnimationFrame(() => {
    update();
    ticking = false;
  });
}, { passive: true });
```

## Custom elements (web components)

When adding new interactive widgets, prefer a custom element over a loose initializer. Matches the pattern already used across Dawn (`<sticky-header>`, `<cart-drawer>`, etc.).

```js
class PriceTicker extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', this.handleClick);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick);
  }

  handleClick = (event) => {
    /* ... */
  };
}

customElements.define('price-ticker', PriceTicker);
```

## Async + clipboard / fetch

Use `async`/`await` with `try`/`catch`. Feature-detect before using.

```js
const copy = async (text) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to fallback */
  }

  // legacy fallback using <textarea> + document.execCommand('copy')
  return false;
};
```

## Storage

Always wrap `localStorage` / `sessionStorage` access in try/catch — it throws in private browsing modes in some browsers and when quota is exceeded.

```js
const safeGet = (key) => {
  try { return window.localStorage.getItem(key); }
  catch { return null; }
};
```

## Liquid-in-JS

When a script tag is inside a `.liquid` file and needs to inject Liquid values, serialize them into a `<script type="application/json">` block and read that from real JS — don't interpolate Liquid into executable JS.

```liquid
<script type="application/json" data-article-config>
  {
    "codeTheme": {{ section.settings.code_theme | json }},
    "tocEnabled": {{ section.settings.show_toc | json }}
  }
</script>
```

```js
const configEl = document.querySelector('[data-article-config]');
const config = configEl ? JSON.parse(configEl.textContent) : {};
```

This keeps Liquid out of the code path (no injection risk) and avoids breaking the JS parser when a value is blank.

## What NOT to do

- No `var` — ever.
- No jQuery. Dawn ships without it; don't add it back.
- No inline event handlers (`onclick=""`, `onmouseover=""`) in Liquid/HTML.
- No global variables. If you truly need one, attach it to a namespaced object (e.g., `window.SDA = window.SDA || {}`).
- No `for` / `while` where a higher-order iterator reads more clearly. `forEach`, `map`, `filter`, `find`, `some`, `every`, `reduce` are all fair game.
- No blocking `<script>` tags. Use `defer` (for scripts that depend on DOM) or `async` (for independent scripts).

## File checklist before committing

- [ ] No `var` anywhere in the file
- [ ] File is wrapped in a `{ 'use strict'; ... }` block (unless it defines a custom element at module-ish scope)
- [ ] Listeners clean up after themselves where appropriate (especially custom elements' `disconnectedCallback`)
- [ ] Scroll / resize listeners use `{ passive: true }` + `requestAnimationFrame`
- [ ] Liquid data arrives via JSON script tags, not string interpolation
- [ ] No inline handlers introduced in any Liquid file touched alongside this JS
