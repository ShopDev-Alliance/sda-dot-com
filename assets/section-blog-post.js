/* =========================================================
   ShopDev Alliance — Blog Post interactions
   Progress bar, auto-generated TOC with active tracking,
   heading anchors, copy-code, share, reactions, mobile drawer.
   ========================================================= */

(function () {
  const qs = (sel, ctx) => (ctx || document).querySelector(sel);
  const qsa = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  const root = qs('.sda-blog-post');
  if (!root) return;

  const article = qs('.article', root);
  const progress = qs('#sdaProgressBar');
  const readPct = qs('#sdaReadPct', root);
  const backToTop = qs('#sdaBackToTop', root);

  /* ---------------- Slugify + auto-generate TOC from article headings ---------------- */
  function slugify(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80) || 'section';
  }

  const headings = article ? qsa('h2, h3', article) : [];
  const usedIds = new Set();
  headings.forEach((h) => {
    let id = h.id && h.id.trim();
    if (!id) id = slugify(h.textContent || '');
    let candidate = id;
    let n = 2;
    while (usedIds.has(candidate) || document.getElementById(candidate) && document.getElementById(candidate) !== h) {
      candidate = `${id}-${n++}`;
    }
    h.id = candidate;
    usedIds.add(candidate);

    if (!h.querySelector('.heading-anchor')) {
      const a = document.createElement('a');
      a.className = 'heading-anchor';
      a.href = `#${candidate}`;
      a.setAttribute('aria-label', 'Copy link to section');
      a.textContent = '#';
      h.appendChild(a);
    }
  });

  const tocList = qs('#sdaTocList', root);
  const drawerList = qs('#sdaTocDrawerList', root);

  function buildTocInto(target, anchorExtraAttrs) {
    if (!target) return [];
    const links = [];
    let currentLi = null;
    let currentSub = null;

    headings.forEach((h) => {
      const level = h.tagName.toLowerCase();
      const text = (h.textContent || '').replace(/#\s*$/, '').trim();

      const a = document.createElement('a');
      a.href = `#${h.id}`;
      a.textContent = text;
      if (anchorExtraAttrs) {
        Object.keys(anchorExtraAttrs).forEach((k) => a.setAttribute(k, anchorExtraAttrs[k]));
      }

      if (level === 'h2') {
        currentLi = document.createElement('li');
        currentLi.appendChild(a);
        target.appendChild(currentLi);
        currentSub = null;
        links.push(a);
      } else if (level === 'h3') {
        if (!currentLi) {
          currentLi = document.createElement('li');
          target.appendChild(currentLi);
        }
        if (!currentSub) {
          currentSub = document.createElement('ul');
          currentSub.className = 'toc__sub';
          currentLi.appendChild(currentSub);
        }
        const subLi = document.createElement('li');
        subLi.appendChild(a);
        currentSub.appendChild(subLi);
        links.push(a);
      }
    });
    return links;
  }

  const railLinks = buildTocInto(tocList);
  const drawerLinks = buildTocInto(drawerList, { 'data-close': '' });

  const railIdToLink = new Map(railLinks.map((a) => [a.getAttribute('href').slice(1), a]));
  const drawerIdToLink = new Map(drawerLinks.map((a) => [a.getAttribute('href').slice(1), a]));

  /* ---------------- Progress bar + read % + back-to-top visibility ---------------- */
  const fabBar = qs('#sdaTocFabBar', root);

  function updateProgress() {
    if (!article) return;
    const rect = article.getBoundingClientRect();
    const articleTop = window.scrollY + rect.top;
    const articleBottom = articleTop + rect.height;
    const viewportBottom = window.scrollY + window.innerHeight;
    let pct = 0;
    if (viewportBottom <= articleTop) pct = 0;
    else if (viewportBottom >= articleBottom) pct = 100;
    else pct = ((viewportBottom - articleTop) / (articleBottom - articleTop)) * 100;
    pct = Math.max(0, Math.min(100, pct));
    const pctStr = pct.toFixed(1) + '%';
    if (progress) progress.style.width = pctStr;
    if (fabBar) fabBar.style.width = pctStr;
    if (readPct) readPct.textContent = Math.round(pct) + '%';

    if (backToTop) {
      if (window.scrollY > 600) backToTop.classList.add('is-visible');
      else backToTop.classList.remove('is-visible');
    }
  }
  document.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------------- Active TOC tracking ---------------- */
  function setActive(id) {
    railLinks.forEach((l) => l.classList.remove('is-active'));
    drawerLinks.forEach((l) => l.classList.remove('is-active'));
    if (!id) return;
    const r = railIdToLink.get(id);
    const d = drawerIdToLink.get(id);
    if (r) r.classList.add('is-active');
    if (d) d.classList.add('is-active');
  }

  if ('IntersectionObserver' in window && headings.length) {
    const io = new IntersectionObserver(
      () => {
        let activeId = null;
        let minTop = Infinity;
        headings.forEach((h) => {
          const r = h.getBoundingClientRect();
          if (r.top < window.innerHeight * 0.5 && r.top > -r.height) {
            if (r.top < minTop) { minTop = r.top; activeId = h.id; }
          }
        });
        if (!activeId) {
          for (let i = headings.length - 1; i >= 0; i--) {
            if (headings[i].getBoundingClientRect().top < window.innerHeight * 0.5) {
              activeId = headings[i].id;
              break;
            }
          }
        }
        setActive(activeId);
      },
      { rootMargin: '-100px 0px -55% 0px', threshold: [0, 1] }
    );
    headings.forEach((h) => io.observe(h));
  }

  /* ---------------- Rail TOC collapse ---------------- */
  const tocToggle = qs('#sdaTocToggle', root);
  if (tocToggle) {
    tocToggle.addEventListener('click', () => {
      const expanded = tocToggle.getAttribute('aria-expanded') === 'true';
      tocToggle.setAttribute('aria-expanded', String(!expanded));
    });
  }

  /* ---------------- Heading-anchor click-to-copy ---------------- */
  qsa('.heading-anchor', article).forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const href = a.getAttribute('href');
      const url = location.origin + location.pathname + href;
      history.replaceState(null, '', href);
      if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
      a.classList.add('copied');
      const orig = a.textContent;
      a.textContent = '\u2713';
      setTimeout(() => {
        a.classList.remove('copied');
        a.textContent = orig;
      }, 1200);
      const target = document.getElementById(href.slice(1));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ---------------- Copy code blocks ---------------- */
  qsa('[data-copy]', root).forEach((btn) => {
    btn.addEventListener('click', () => {
      const fig = btn.closest('figure.code');
      if (!fig) return;
      const codeEl = fig.querySelector('pre code') || fig.querySelector('pre');
      const text = codeEl ? codeEl.innerText : '';
      if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
      btn.classList.add('copied');
      const label = btn.querySelector('span');
      const orig = label ? label.textContent : '';
      if (label) label.textContent = 'Copied!';
      setTimeout(() => {
        btn.classList.remove('copied');
        if (label) label.textContent = orig;
      }, 1400);
    });
  });

  /* ---------------- Share buttons ---------------- */
  qsa('[data-share]', root).forEach((el) => {
    el.addEventListener('click', (e) => {
      const kind = el.getAttribute('data-share');
      const url = location.href;
      const title = document.title;
      if (kind === 'copy') {
        e.preventDefault();
        if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
        el.classList.add('copied');
        const label = el.querySelector('.share-copy-label');
        if (label) label.textContent = 'Copied!';
        setTimeout(() => {
          el.classList.remove('copied');
          if (label) label.textContent = 'Copy link';
        }, 1400);
      } else if (kind === 'twitter') {
        e.preventDefault();
        window.open(
          'https://twitter.com/intent/tweet?text=' + encodeURIComponent(title) +
          '&url=' + encodeURIComponent(url),
          '_blank', 'noopener'
        );
      } else if (kind === 'linkedin') {
        e.preventDefault();
        window.open(
          'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url),
          '_blank', 'noopener'
        );
      }
    });
  });

  /* ---------------- Reactions (localStorage per article) ---------------- */
  const articleKey = 'sda_reactions:' + (location.pathname || 'default');
  let reactionStore = {};
  try { reactionStore = JSON.parse(localStorage.getItem(articleKey) || '{}'); } catch (e) {}

  qsa('.reaction', root).forEach((btn) => {
    const key = btn.dataset.r;
    const countEl = btn.querySelector('[data-count]');
    const base = parseInt(countEl ? countEl.textContent : '0', 10) || 0;
    if (reactionStore[key]) {
      btn.classList.add('active');
      if (countEl) countEl.textContent = String(base + 1);
    }
    btn.addEventListener('click', () => {
      const active = btn.classList.toggle('active');
      reactionStore[key] = active;
      try { localStorage.setItem(articleKey, JSON.stringify(reactionStore)); } catch (e) {}
      if (countEl) countEl.textContent = String(base + (active ? 1 : 0));
      if (active && btn.animate) {
        btn.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }],
          { duration: 260, easing: 'ease-out' }
        );
      }
    });
  });

  /* ---------------- Mobile TOC drawer ---------------- */
  const tocFab = qs('#sdaTocFab', root);
  const tocDrawer = qs('#sdaTocDrawer', root);

  function openDrawer() {
    document.body.classList.add('sda-toc-open');
    if (tocFab) tocFab.setAttribute('aria-expanded', 'true');
    if (tocDrawer) tocDrawer.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
  }
  function closeDrawer() {
    document.body.classList.remove('sda-toc-open');
    if (tocFab) tocFab.setAttribute('aria-expanded', 'false');
    if (tocDrawer) tocDrawer.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
  }

  if (tocFab) {
    tocFab.addEventListener('click', () => {
      if (document.body.classList.contains('sda-toc-open')) closeDrawer();
      else openDrawer();
    });
  }
  if (tocDrawer) {
    tocDrawer.addEventListener('click', (e) => {
      const t = e.target;
      if (t.closest && t.closest('[data-close]')) {
        setTimeout(closeDrawer, 60);
      }
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('sda-toc-open')) closeDrawer();
  });

  qsa('[data-drawer-action]', root).forEach((btn) => {
    btn.addEventListener('click', () => {
      const act = btn.getAttribute('data-drawer-action');
      if (act === 'top') {
        closeDrawer();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (act === 'share') {
        const url = location.href;
        if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
        const label = btn.querySelector('.drawer-action-label');
        if (label) {
          const orig = label.textContent;
          label.textContent = 'Copied!';
          setTimeout(() => { label.textContent = orig; }, 1400);
        }
      }
    });
  });

  /* ---------------- Hide the rail's "Filed under" group if no tags ---------------- */
  qsa('[data-rail-empty]', root).forEach((group) => {
    if (!group.querySelector('[data-rail-content] *')) group.style.display = 'none';
  });
})();
