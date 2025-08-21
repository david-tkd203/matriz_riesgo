// menu.js
(() => {
  'use strict';

  function closeMenu(toggle, menu) {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', 'false');
    menu.setAttribute('hidden', '');
  }

  function openMenu(toggle, menu) {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', 'true');
    menu.removeAttribute('hidden');
  }

  function setupOne(li) {
    const toggle = li.querySelector('.subnav__toggle');
    const link   = li.querySelector('a[href]');
    if (!toggle) return;

    const menuId = toggle.getAttribute('aria-controls');
    const menu   = menuId ? document.getElementById(menuId) : null;

    // 1) El LINK navega normal (no prevenir por JS)
    if (link) {
      link.addEventListener('click', (e) => {
        // Permite navegación; solo evita que el click “burbujee” al <li>
        e.stopPropagation();
        // Cierra el mega-menú si estaba abierto
        if (menu && toggle.getAttribute('aria-expanded') === 'true') {
          closeMenu(toggle, menu);
        }
      });
    }

    // 2) El BOTÓN solo abre/cierra el mega-menú
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      if (isOpen) closeMenu(toggle, menu);
      else        openMenu(toggle, menu);
    });

    // 3) Cerrar si haces click fuera
    document.addEventListener('click', (e) => {
      if (!li.contains(e.target)) closeMenu(toggle, menu);
    });

    // 4) Cerrar con ESC
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMenu(toggle, menu);
        toggle.focus();
      }
    });
  }

  function init() {
    document.querySelectorAll('.subnav__item--hasmenu').forEach(setupOne);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
