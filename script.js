/* ==========================================================================
   Ntagawa David — Portfolio
   Interactions : thème clair/sombre, menu mobile, navigation active,
   heure locale, copie de l'e-mail, formulaire de contact.
   Aucune dépendance. Le site reste entièrement lisible sans JavaScript.
   ========================================================================== */

(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const prefersDark = matchMedia('(prefers-color-scheme: dark)');

  /* ---------- Notification ---------- */
  const toastEl = $('#toast');
  let toastTimer;

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.toggleAttribute('data-show', true);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.removeAttribute('data-show'), 2600);
  }

  /* ---------- Thème ---------- */
  const themeBtn = $('#themeToggle');

  const isDark = () =>
    root.dataset.theme === 'dark' || (root.dataset.theme === 'auto' && prefersDark.matches);

  function syncThemeLabel() {
    themeBtn?.setAttribute('aria-label', isDark() ? 'Passer au thème clair' : 'Passer au thème sombre');
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch { /* stockage indisponible */ }
    syncThemeLabel();
  }

  themeBtn?.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    if (document.startViewTransition && !reducedMotion.matches) {
      document.startViewTransition(() => applyTheme(next));
    } else {
      applyTheme(next);
    }
  });
  prefersDark.addEventListener('change', syncThemeLabel);
  syncThemeLabel();

  /* ---------- Menu mobile ---------- */
  const menuBtn = $('#menuBtn');
  const nav = $('#siteNav');
  const desktop = matchMedia('(min-width: 60em)');

  function setMenu(open) {
    menuBtn?.setAttribute('aria-expanded', String(open));
    nav?.setAttribute('data-open', String(open));
  }

  menuBtn?.addEventListener('click', () => {
    setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
  });
  nav?.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuBtn?.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuBtn.focus();
    }
  });
  desktop.addEventListener('change', (event) => { if (event.matches) setMenu(false); });

  /* ---------- En-tête : bordure après le défilement ---------- */
  const header = $('.site-header');
  const sentinel = $('#top-sentinel');
  if (header && sentinel && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      header.toggleAttribute('data-scrolled', !entry.isIntersecting);
    }).observe(sentinel);
  }

  /* ---------- Navigation : section active ---------- */
  if ('IntersectionObserver' in window && nav) {
    const links = new Map($$('a[href^="#"]', nav).map((a) => [a.hash.slice(1), a]));

    const spy = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        links.forEach((link) => link.removeAttribute('aria-current'));
        links.get(entry.target.id)?.setAttribute('aria-current', 'true');
      }
    }, { rootMargin: '-45% 0px -50% 0px' });

    links.forEach((_, id) => {
      const section = document.getElementById(id);
      if (section) spy.observe(section);
    });
  }

  /* ---------- Heure locale à Bukavu (UTC+2, sans changement d'heure) ---------- */
  const clock = $('#localTime');
  if (clock) {
    const format = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Lubumbashi',
    });
    const tick = () => {
      const now = new Date();
      clock.textContent = format.format(now);
      clock.dateTime = now.toISOString();
    };
    tick();
    setInterval(tick, 30_000);
  }

  /* ---------- Copier l'adresse e-mail ---------- */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const field = document.createElement('textarea');
      field.value = text;
      field.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.append(field);
      field.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { /* non pris en charge */ }
      field.remove();
      return ok;
    }
  }

  $$('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const ok = await copyText(button.dataset.copy);
      toast(ok ? 'Adresse e-mail copiée' : 'Copie impossible : sélectionnez l’adresse manuellement');
    });
  });

  /* ---------- Formulaire : prépare un e-mail prérempli ---------- */
  const form = $('#contactForm');

  function setInvalid(field, invalid) {
    const wrapper = field.closest('.field');
    const error = $(`#${field.id}-err`);
    wrapper?.toggleAttribute('data-invalid', invalid);
    if (error) error.hidden = !invalid;
    field.setAttribute('aria-invalid', String(invalid));
    if (error) field.setAttribute('aria-describedby', error.id);
  }

  form?.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = form.elements.name;
    const message = form.elements.message;
    const nameOk = name.value.trim().length > 0;
    const messageOk = message.value.trim().length > 0;

    setInvalid(name, !nameOk);
    setInvalid(message, !messageOk);
    if (!nameOk) return name.focus();
    if (!messageOk) return message.focus();

    const type = form.elements.type.value;
    const subject = `Projet : ${type} (${name.value.trim()})`;
    const body = [
      'Bonjour David,',
      '',
      message.value.trim(),
      '',
      `Type de projet : ${type}`,
      `Nom : ${name.value.trim()}`,
    ].join('\n');

    window.location.href =
      `mailto:${form.dataset.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast('Votre messagerie s’ouvre avec le message prérempli');
  });

  form?.addEventListener('input', (event) => {
    if (event.target.matches('[required]') && event.target.value.trim()) setInvalid(event.target, false);
  });

  /* ---------- Année du pied de page ---------- */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
