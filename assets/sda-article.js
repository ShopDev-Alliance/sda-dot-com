if (!customElements.get('sda-article')) {
  customElements.define('sda-article', class extends HTMLElement {
    connectedCallback() {
      this.controller?.abort();
      this.controller = new AbortController();
      const { signal } = this.controller;
      this.body = this.querySelector('.sda-article__body');
      if (!this.body) return;
      this.dialog = this.querySelector('dialog');
      this.contentsButton = this.querySelector('.sda-reading-bar');
      this.contentsLabel = this.querySelector('[data-contents-label]');
      this.contentsFallback = this.contentsFallback || this.contentsLabel.textContent;
      this.barPercent = this.querySelector('[data-bar-percent]');
      this.progress = this.querySelector('.sda-progress');
      this.percent = this.querySelector('[data-read-percent]');
      this.topButton = this.querySelector('.sda-back-to-top');
      this.status = this.querySelector('[data-status]');
      this.dialogStatus = this.querySelector('[data-dialog-status]');
      this.timers = new Set();
      this.codeText = this.codeText || new WeakMap();
      this.enhanceCode();
      this.enhanceQuotes();
      this.buildContents();
      this.progress.hidden = false;
      this.percent.parentElement.hidden = false;
      for (const button of this.querySelectorAll('[data-action="copy-link"]')) button.hidden = false;
      this.addEventListener('click', (event) => this.handleClick(event), { signal });
      this.dialog.addEventListener('close', () => {
        this.contentsButton.setAttribute('aria-expanded', 'false');
        this.updateProgress();
      }, { signal });
      window.addEventListener('scroll', () => this.scheduleProgress(), { passive: true, signal });
      window.addEventListener('resize', () => this.scheduleProgress(), { signal });
      window.addEventListener('hashchange', () => this.followHash(), { signal });
      if ('ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver(() => this.scheduleProgress());
        this.resizeObserver.observe(this.body);
      }
      this.updateProgress();
      this.followHash();
    }

    disconnectedCallback() {
      this.controller?.abort();
      this.resizeObserver?.disconnect();
      cancelAnimationFrame(this.frame);
      this.frame = null;
      for (const timer of this.timers || []) clearTimeout(timer);
      if (this.dialog?.open) this.dialog.close();
    }

    /** Create enhancement markup without parsing HTML strings. */
    element(tag, className, text) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }

    enhanceCode() {
      for (const pre of this.body.querySelectorAll('pre')) {
        if (pre.closest('.sda-code')) continue;
        let code = pre.querySelector('code');
        if (!code) {
          code = this.element('code', '', pre.textContent);
          pre.replaceChildren(code);
        }
        const source = code.textContent.replace(/\r?\n$/, '');
        const language = Array.from(code.classList).find((name) => name.startsWith('language-'))?.slice(9);
        const filename = pre.dataset.file || pre.getAttribute('title');
        const shell = this.element('figure', 'sda-code');
        const header = this.element('div', 'sda-code__header');
        if (filename) header.append(this.element('span', 'sda-code__file', filename));
        if (language) header.append(this.element('span', 'sda-code__language', language));
        const button = this.element('button', 'sda-code__copy', this.dataset.copy);
        button.type = 'button';
        button.dataset.action = 'copy-code';
        header.append(button);
        pre.before(shell);
        shell.append(header, pre);
        this.codeText.set(shell, source);
        code.replaceChildren();
        const lines = source.split('\n');
        for (const [index, line] of lines.entries()) {
          const span = this.element('span', 'sda-code__line', line);
          span.dataset.line = String(index + 1);
          code.append(span);
          if (index < lines.length - 1) code.append(document.createTextNode('\n'));
        }
        pre.tabIndex = 0;
      }
      for (const table of this.body.querySelectorAll('table')) table.tabIndex = 0;
    }

    enhanceQuotes() {
      for (const quote of this.body.querySelectorAll('blockquote')) {
        if (quote.dataset.sdaEnhanced) continue;
        quote.dataset.sdaEnhanced = 'true';
        const first = quote.querySelector('p') || quote;
        // A Range removes only the marker/title line, preserving links and inline markup below it.
        const walker = document.createTreeWalker(first, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        let line = '';
        let endpoint = null;
        let offset = 0;
        let breakNode = null;
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (node.nodeName === 'BR') { breakNode = node; break; }
          if (node.nodeType !== Node.TEXT_NODE) continue;
          const newline = node.textContent.indexOf('\n');
          offset = newline < 0 ? node.textContent.length : newline;
          line += node.textContent.slice(0, offset);
          endpoint = node;
          if (newline >= 0) break;
        }
        const marker = line.trim().match(/^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*(.*)$/i);
        if (marker && endpoint) {
          const type = { NOTE: 'note', IMPORTANT: 'note', TIP: 'tip', WARNING: 'warning', CAUTION: 'warning' }[marker[1].toUpperCase()];
          const range = document.createRange();
          range.setStart(first, 0);
          range.setEnd(endpoint, offset);
          range.deleteContents();
          breakNode?.remove();
          if (first !== quote && !first.textContent.trim() && !first.querySelector('img, video, iframe')) first.remove();
          const content = this.element('div', 'sda-callout__body');
          content.append(this.element('p', 'sda-callout__title', marker[2] || this.dataset[type]));
          content.append(...Array.from(quote.childNodes));
          const icon = this.element('span', 'sda-callout__icon', type === 'tip' ? '✓' : type === 'note' ? 'i' : '!');
          icon.setAttribute('aria-hidden', 'true');
          quote.classList.add('sda-callout', `sda-callout--${type}`);
          quote.append(icon, content);
        } else {
          const last = quote.lastElementChild;
          if (last?.tagName === 'P' && /^(—|--)\s*/.test(last.textContent.trim())) {
            const cite = this.element('cite', 'sda-pullquote__cite');
            cite.append(...Array.from(last.childNodes));
            last.replaceWith(cite);
          }
        }
      }
    }

    buildContents() {
      this.headings = Array.from(this.body.querySelectorAll('h2, h3'));
      this.headingLabels = new Map();
      const used = new Set(Array.from(document.querySelectorAll('[id]'), (node) => node.id));
      const list = this.querySelector('[data-toc]');
      list.replaceChildren();
      let parentItem = null;
      let nestedList = null;
      for (const heading of this.headings) {
        heading.querySelector('.sda-heading-anchor')?.remove();
        const text = heading.textContent.trim();
        this.headingLabels.set(heading, text);
        if (!heading.id) {
          const base = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'section';
          let id = base;
          let suffix = 2;
          while (used.has(id)) id = `${base}-${suffix++}`;
          heading.id = id;
          used.add(id);
        }
        heading.tabIndex = -1;
        const anchor = this.element('a', 'sda-heading-anchor', '#');
        anchor.href = `#${encodeURIComponent(heading.id)}`;
        anchor.dataset.action = 'copy-heading';
        anchor.setAttribute('aria-label', `${this.dataset.headingLabel} ${text}`);
        heading.append(anchor);
        const item = this.element('li');
        const link = this.element('a', '', text);
        link.href = anchor.getAttribute('href');
        link.dataset.headingId = heading.id;
        item.append(link);
        if (heading.tagName === 'H3' && parentItem) {
          if (!nestedList) {
            nestedList = this.element('ol', 'sda-toc-list__sub');
            parentItem.append(nestedList);
          }
          nestedList.append(item);
        } else {
          list.append(item);
          parentItem = item;
          nestedList = null;
        }
      }
      const clone = list.cloneNode(true);
      clone.removeAttribute('id');
      clone.removeAttribute('data-toc');
      clone.hidden = false;
      this.querySelector('[data-mobile-toc]').replaceChildren(clone);
      this.links = Array.from(this.querySelectorAll('[data-heading-id]'));
      this.querySelector('[data-toc-group]').hidden = this.headings.length < 2;
      this.querySelector('[data-mobile-toc-group]').hidden = this.headings.length < 2;
    }

    scheduleProgress() {
      if (this.frame) return;
      this.frame = requestAnimationFrame(() => { this.frame = null; this.updateProgress(); });
    }

    updateProgress() {
      const rect = this.body.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / Math.max(1, rect.height)));
      this.style.setProperty('--sda-progress', String(progress));
      this.percent.textContent = `${Math.round(progress * 100)}%`;
      this.barPercent.textContent = this.percent.textContent;
      const visible = this.getBoundingClientRect().top < window.innerHeight && rect.bottom > this.headerOffset() && !this.dialog.open;
      this.contentsButton.dataset.visible = String(visible);
      this.contentsButton.inert = !visible;
      this.topButton.hidden = window.scrollY <= 600;
      this.updateActive();
    }

    headerOffset() {
      return (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 80) + 24;
    }

    updateActive() {
      let active = null;
      const offset = this.headerOffset();
      for (const heading of this.headings) {
        if (heading.getBoundingClientRect().top <= offset + 20) active = heading;
        else break;
      }
      this.contentsLabel.textContent = this.headings.length >= 2 && active
        ? this.headingLabels.get(active)
        : this.contentsFallback;
      for (const link of this.links) {
        if (link.dataset.headingId === active?.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    }

    followHash() {
      let id;
      try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
      const heading = this.headings.find((node) => node.id === id);
      if (heading) this.scrollToHeading(heading, false);
    }

    scrollToHeading(heading, focus = true) {
      heading.scrollIntoView({ behavior: this.scrollBehavior(), block: 'start' });
      if (focus) heading.focus({ preventScroll: true });
    }

    scrollBehavior() {
      return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    }

    async copy(text, control) {
      const status = this.dialog.open ? this.dialogStatus : this.status;
      try {
        await navigator.clipboard.writeText(text);
        if (!this.isConnected) return;
        status.textContent = this.dataset.copied;
        if (!control.dataset.originalLabel) control.dataset.originalLabel = control.textContent;
        control.textContent = control.dataset.action === 'copy-heading' ? '✓' : this.dataset.copied;
        const timer = setTimeout(() => {
          control.textContent = control.dataset.originalLabel;
          status.textContent = '';
          this.timers.delete(timer);
        }, 1600);
        this.timers.add(timer);
      } catch {
        status.textContent = this.dataset.copyError;
      }
    }

    handleClick(event) {
      if (event.target === this.dialog) {
        this.dialog.close();
        return;
      }
      const control = event.target.closest('[data-action], [data-heading-id]');
      if (!control || !this.contains(control)) return;
      const action = control.dataset.action;
      if (control.dataset.headingId || action === 'copy-heading') {
        event.preventDefault();
        const url = new URL(control.href);
        const heading = this.headings.find((node) => node.id === decodeURIComponent(url.hash.slice(1)));
        if (!heading) return;
        if (this.dialog.open) this.dialog.close();
        history.replaceState(null, '', url.hash);
        this.scrollToHeading(heading);
        if (action === 'copy-heading') this.copy(url.href, control);
      } else if (action === 'toggle-toc') {
        const expanded = control.getAttribute('aria-expanded') === 'true';
        control.setAttribute('aria-expanded', String(!expanded));
        this.querySelector('[data-toc]').hidden = expanded;
      } else if (action === 'open-contents') {
        this.dialog.showModal();
        control.setAttribute('aria-expanded', 'true');
        this.updateProgress();
      } else if (action === 'close-contents') {
        this.dialog.close();
      } else if (action === 'top') {
        if (this.dialog.open) this.dialog.close();
        const title = this.querySelector('h1');
        title.tabIndex = -1;
        title.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: this.scrollBehavior() });
      } else if (action === 'copy-link') {
        this.copy(location.href, control);
      } else if (action === 'copy-code') {
        const shell = control.closest('.sda-code');
        this.copy(this.codeText.get(shell) ?? shell.querySelector('code').textContent, control);
      }
    }
  });
}
