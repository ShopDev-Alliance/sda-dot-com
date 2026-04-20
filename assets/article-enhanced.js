/* =========================================================================
   Article enhancements: TOC + scrollspy, reading progress, code block
   polish (language label + copy + Prism highlighting), heading anchors.
   ========================================================================= */
{
  'use strict';

  const PRISM_VERSION = '1.29.0';
  const PRISM_CDN = `https://cdnjs.cloudflare.com/ajax/libs/prism/${PRISM_VERSION}`;
  const TOC_STORAGE_KEY = 'sda_article_toc_collapsed';

  let initialized = false;

  const init = () => {
    if (initialized) return;
    const article = document.querySelector('[data-article]');
    if (!article) return;
    initialized = true;

    const content = article.querySelector('[data-article-content]');
    if (!content) return;

    enhanceHeadings(content);
    enhanceCodeBlocks(content, article.dataset.codeTheme || 'dark');

    buildTOC(article, content);
    setupReadingProgress(article);
  };

  /* -------------------- Headings: slug + anchor link -------------------- */
  const enhanceHeadings = (content) => {
    const headings = content.querySelectorAll('h2, h3, h4');
    const seenIds = new Set();

    headings.forEach((h) => {
      if (!h.id) {
        h.id = uniqueSlug(h.textContent ?? '', seenIds);
      } else {
        seenIds.add(h.id);
      }

      if (h.querySelector('.heading-anchor')) return;
      const link = document.createElement('a');
      link.className = 'heading-anchor';
      link.href = `#${h.id}`;
      link.setAttribute('aria-label', 'Link to this section');
      link.textContent = '#';
      h.insertBefore(link, h.firstChild);
    });
  };

  const uniqueSlug = (text, seen) => {
    const base =
      text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-') || 'section';
    let slug = base;
    let n = 2;
    while (seen.has(slug)) {
      slug = `${base}-${n++}`;
    }
    seen.add(slug);
    return slug;
  };

  /* -------------------- Table of contents -------------------- */
  const buildTOC = (article, content) => {
    const tocEl = article.querySelector('[data-article-toc]');
    if (!tocEl) return;

    const navEl = tocEl.querySelector('[data-article-toc-nav]');
    const emptyEl = tocEl.querySelector('[data-article-toc-empty]');
    const toggleBtn = tocEl.querySelector('[data-article-toc-toggle]');
    const reopenBtn = tocEl.querySelector('[data-article-toc-reopen]');

    const headings = [...content.querySelectorAll('h2, h3')];

    if (headings.length < 2) {
      tocEl.setAttribute('data-empty', 'true');
      if (emptyEl) emptyEl.hidden = false;
      return;
    }

    const ul = document.createElement('ul');
    headings.forEach((h) => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${h.id}`;
      link.textContent = (h.textContent ?? '').replace(/^#\s*/, '').trim();
      link.dataset.level = h.tagName === 'H3' ? '3' : '2';
      link.dataset.targetId = h.id;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        smoothScrollTo(h);
        history.replaceState(null, '', `#${h.id}`);
      });
      li.appendChild(link);
      ul.appendChild(li);
    });
    navEl.replaceChildren(ul);

    const defaultCollapsed = article.dataset.tocDefaultCollapsed === 'true';
    const saved = safeGet(TOC_STORAGE_KEY);
    const collapsed = saved === null ? defaultCollapsed : saved === 'true';
    applyCollapsed(tocEl, toggleBtn, collapsed);

    const toggle = (nextState) => {
      const state =
        typeof nextState === 'boolean'
          ? nextState
          : tocEl.getAttribute('data-collapsed') !== 'true';
      applyCollapsed(tocEl, toggleBtn, state);
      safeSet(TOC_STORAGE_KEY, state ? 'true' : 'false');
    };

    toggleBtn?.addEventListener('click', () => toggle());
    reopenBtn?.addEventListener('click', () => toggle(false));

    setupScrollspy(navEl, headings);
  };

  const applyCollapsed = (tocEl, toggleBtn, collapsed) => {
    tocEl.setAttribute('data-collapsed', collapsed ? 'true' : 'false');
    if (!toggleBtn) return;
    toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    toggleBtn.setAttribute(
      'title',
      collapsed ? 'Expand table of contents' : 'Collapse table of contents'
    );
  };

  const setupScrollspy = (navEl, headings) => {
    const links = navEl.querySelectorAll('a[data-target-id]');
    const linkById = new Map();
    links.forEach((a) => linkById.set(a.dataset.targetId, a));

    const update = () => {
      const headerOffset = getHeaderOffset() + 24;
      const scrollY = window.scrollY;
      let activeId = null;

      for (const h of headings) {
        const top = h.getBoundingClientRect().top + scrollY;
        if (top - headerOffset <= scrollY) {
          activeId = h.id;
        } else {
          break;
        }
      }

      if (!activeId && headings.length) activeId = headings[0].id;

      links.forEach((a) => a.classList.remove('is-active'));
      if (activeId && linkById.has(activeId)) {
        linkById.get(activeId).classList.add('is-active');
      }
    };

    let ticking = false;
    window.addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
          update();
          ticking = false;
        });
      },
      { passive: true }
    );

    update();
  };

  /* -------------------- Smooth scroll with header offset -------------------- */
  const smoothScrollTo = (target) => {
    const headerOffset = getHeaderOffset() + 20;
    const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  const getHeaderOffset = () => {
    const val = getComputedStyle(document.documentElement)
      .getPropertyValue('--header-height')
      .trim();
    const n = parseInt(val, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  /* -------------------- Reading progress -------------------- */
  const setupReadingProgress = (article) => {
    const bar = document.querySelector('[data-article-progress-bar]');
    if (!bar) return;

    const update = () => {
      const rect = article.getBoundingClientRect();
      const viewport = window.innerHeight;
      const total = rect.height - viewport;
      const scrolled = Math.max(0, -rect.top);
      const pct = total > 0 ? Math.min(1, scrolled / total) : 0;
      bar.style.width = `${(pct * 100).toFixed(2)}%`;
    };

    let ticking = false;
    window.addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
          update();
          ticking = false;
        });
      },
      { passive: true }
    );
    window.addEventListener('resize', update);

    update();
  };

  /* -------------------- Code block enhancements -------------------- */
  const enhanceCodeBlocks = (content, theme) => {
    const pres = content.querySelectorAll('pre');
    if (!pres.length) return;

    const neededLangs = new Set();

    pres.forEach((pre) => {
      let code = pre.querySelector('code');
      if (!code) {
        code = document.createElement('code');
        code.textContent = pre.textContent;
        pre.replaceChildren(code);
      }

      const lang = inferLanguage(code);
      if (lang) {
        [...code.classList].forEach((c) => {
          if (c.startsWith('language-')) code.classList.remove(c);
        });
        code.classList.add(`language-${lang}`);
        neededLangs.add(lang);
      }

      if (pre.parentElement?.classList.contains('code-block')) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'code-block';

      const header = document.createElement('div');
      header.className = 'code-block__header';

      const langLabel = document.createElement('span');
      langLabel.className = 'code-block__lang';
      langLabel.textContent = lang || 'text';

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'code-block__copy';
      copyBtn.innerHTML =
        '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.2" d="M4 2h6v8M2 4h6v6H2z"/></svg>' +
        '<span class="code-block__copy-label">Copy</span>';
      copyBtn.addEventListener('click', () => copyCode(copyBtn, code));

      header.appendChild(langLabel);
      header.appendChild(copyBtn);

      pre.parentElement.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);

      Object.assign(pre.style, {
        background: 'transparent',
        border: 'none',
        borderRadius: '0',
        margin: '0',
      });
    });

    if (neededLangs.size) loadPrism([...neededLangs], theme);
  };

  const LANG_ALIASES = {
    js: 'javascript',
    ts: 'typescript',
    html: 'markup',
    xml: 'markup',
    shell: 'bash',
    sh: 'bash',
    yml: 'yaml',
  };

  const normalizeLang = (lang) => {
    const lower = (lang ?? '').toLowerCase();
    return LANG_ALIASES[lower] ?? lower;
  };

  const inferLanguage = (codeEl) => {
    const match = /language-([a-zA-Z0-9_+-]+)/.exec(codeEl.className || '');
    if (match) return normalizeLang(match[1]);

    const text = codeEl.textContent ?? '';
    const directive = /^\s*(?:\/\/|#|<!--)\s*lang:\s*([a-zA-Z0-9_+-]+)/.exec(text);
    if (directive) {
      codeEl.textContent = text.replace(/^[^\n]*\n?/, '');
      return normalizeLang(directive[1]);
    }

    if (/^\s*[{<]/.test(text.replace(/\n/g, ''))) return 'markup';
    return null;
  };

  const copyCode = async (btn, codeEl) => {
    const text = codeEl.textContent ?? '';
    const label = btn.querySelector('.code-block__copy-label');
    const original = label?.textContent ?? 'Copy';

    const flashCopied = () => {
      if (label) label.textContent = 'Copied';
      btn.classList.add('is-copied');
      setTimeout(() => {
        if (label) label.textContent = original;
        btn.classList.remove('is-copied');
      }, 1600);
    };

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        flashCopied();
        return;
      }
    } catch {
      /* fall through to fallback */
    }

    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      flashCopied();
    } catch {
      /* no-op */
    }
    document.body.removeChild(ta);
  };

  /* -------------------- Prism loader (dynamic) -------------------- */
  let prismReady = null;

  const loadScript = (src) =>
    new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = src;
      s.defer = true;
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });

  const loadPrism = (langs, theme) => {
    if (!prismReady) {
      prismReady = (async () => {
        if (window.Prism) return;
        window.Prism = window.Prism || {};
        window.Prism.manual = true;

        const loaded = await loadScript(`${PRISM_CDN}/prism.min.js`);
        if (!loaded) return;

        await loadScript(`${PRISM_CDN}/plugins/autoloader/prism-autoloader.min.js`);
        if (window.Prism?.plugins?.autoloader) {
          window.Prism.plugins.autoloader.languages_path = `${PRISM_CDN}/components/`;
        }
      })();
    }

    prismReady.then(() => {
      if (!window.Prism) return;
      document
        .querySelectorAll('[data-article-content] pre code')
        .forEach((code) => {
          try {
            window.Prism.highlightElement(code);
          } catch {
            /* no-op */
          }
        });
    });
  };

  /* -------------------- Safe localStorage -------------------- */
  const safeGet = (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const safeSet = (key, val) => {
    try {
      window.localStorage.setItem(key, val);
    } catch {
      /* no-op */
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
