// menu.js
(() => {
  'use strict';

  // Asegura que #matriz exista (apunta al panel de resultados de tarjetas)
  function ensureMatrizAnchor() {
    const anchor = document.getElementById('matriz');
    if (!anchor) {
      const resultsPanel = document.querySelector('#vp-cards')?.closest('.panel');
      if (resultsPanel) resultsPanel.id = 'matriz';
    }
  }

  // Inicializa comportamiento del/los mega-menú(s)
  function initSubnav() {
    const nav = document.querySelector('.subnav');
    if (!nav) return; // si aún no insertaste el HTML del navbar, no hacemos nada

    const items = Array.from(nav.querySelectorAll('.subnav__item--hasmenu'));
    if (!items.length) return;

    // Estado: solo 1 menú abierto a la vez
    let openItem = null;

    const openMenu = (item) => {
      const btn = item.querySelector('.subnav__toggle');
      const menu = item.querySelector('.mega');
      if (!btn || !menu) return;
      // Cierra el que esté abierto
      if (openItem && openItem !== item) closeMenu(openItem);

      item.classList.add('subnav__item--open');
      btn.setAttribute('aria-expanded', 'true');
      menu.hidden = false;
      openItem = item;
    };

    const closeMenu = (item) => {
      const btn = item.querySelector('.subnav__toggle');
      const menu = item.querySelector('.mega');
      if (!btn || !menu) return;
      item.classList.remove('subnav__item--open');
      btn.setAttribute('aria-expanded', 'false');
      menu.hidden = true;
      if (openItem === item) openItem = null;
    };

    const toggleMenu = (item) => {
      const btn = item.querySelector('.subnav__toggle');
      if (!btn) return;
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      expanded ? closeMenu(item) : openMenu(item);
    };

    // Wire-up por item
    items.forEach((item) => {
      const btn = item.querySelector('.subnav__toggle');
      const menu = item.querySelector('.mega');
      if (!(btn && menu)) return;

      // Estado inicial
      btn.setAttribute('aria-expanded', 'false');
      menu.hidden = true;

      // Toggle por click
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu(item);
      });

      // Teclado en botón (Enter o Space)
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleMenu(item);
        }
      });

      // Cierra al hacer click en cualquier enlace dentro del mega
      menu.addEventListener('click', (e) => {
        const a = e.target.closest('a[href]');
        if (a) closeMenu(item);
      });
    });

    // Click fuera => cierra
    document.addEventListener('click', (e) => {
      if (!openItem) return;
      if (!openItem.contains(e.target)) closeMenu(openItem);
    });

    // ESC => cierra
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && openItem) {
        closeMenu(openItem);
        // Devuelve foco al botón que lo abrió (accesibilidad)
        const btn = openItem.querySelector('.subnav__toggle');
        if (btn) btn.focus();
      }
    });

    // Mejora: si se redimensiona y el menú queda fuera de pantalla, lo mantenemos visible
    const reposition = () => {
      items.forEach((item) => {
        const menu = item.querySelector('.mega');
        if (!menu || menu.hidden) return;
        // Restringe el ancho al contenedor visual
        menu.style.maxWidth = 'min(100vw, 1100px)';
      });
    };
    window.addEventListener('resize', reposition);
  }

  function init() {
    ensureMatrizAnchor();
    initSubnav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
