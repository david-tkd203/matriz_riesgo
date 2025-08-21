// descargar_imagenes.js
(() => {
    'use strict';

    // Cargamos html2canvas dinámicamente
    const CDN = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    function ensureHtml2Canvas() {
        if (window.html2canvas) return Promise.resolve();
        return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = CDN; s.async = true; s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
        });
    }

    const $cards = document.getElementById('vp-cards');

    // Botón global "Descargar todas"
    function addGlobalButton() {
        if (document.getElementById('dl-all-btn') || !$cards) return;
        const panel = $cards.closest('.panel') || $cards.parentElement;
        const bar = document.createElement('div');
        bar.style.display = 'flex';
        bar.style.justifyContent = 'flex-end';
        bar.style.margin = '0 0 10px';

        const btn = document.createElement('button');
        btn.id = 'dl-all-btn';
        btn.className = 'btn';
        btn.type = 'button';
        btn.textContent = 'Descargar todas';

        btn.addEventListener('click', async () => {
        await ensureHtml2Canvas();
        const cards = [...$cards.querySelectorAll('.risk-card')];
        for (let i = 0; i < cards.length; i++) {
            await downloadCard(cards[i], makeFilename(cards[i], i + 1));
            // pequeña pausa para que el navegador no bloquee descargas sucesivas
            await new Promise(r => setTimeout(r, 120));
        }
        });

        bar.appendChild(btn);
        panel.insertBefore(bar, panel.firstElementChild === $cards ? $cards : panel.children[0].nextSibling);
    }

    // Botón por tarjeta
    function addPerCardButtons() {
        if (!$cards) return;
        $cards.querySelectorAll('.risk-card').forEach((card, i) => {
        if (card.querySelector('.dl-card-btn')) return;

        // aseguramos posicionamiento
        if (!card.style.position) card.style.position = 'relative';

        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'dl-card-btn';
        b.textContent = 'Descargar';

        // estilo inline para no tocar tu CSS
        Object.assign(b.style, {
            position: 'absolute', top: '10px', right: '10px',
            padding: '6px 10px', borderRadius: '8px',
            border: '1px solid #d0d7de', background: '#ffffff',
            cursor: 'pointer', fontSize: '12px', boxShadow: '0 1px 2px rgba(0,0,0,.08)'
        });

        b.addEventListener('click', async (e) => {
            e.stopPropagation();
            await ensureHtml2Canvas();
            await downloadCard(card, makeFilename(card, i + 1));
        });

        card.appendChild(b);
        });
    }

    // Nombre de archivo sugerido: 01_Proceso_Actividad.png
    function makeFilename(card, index) {
        const get = (sel, prefix) => {
        const el = card.querySelector(sel);
        if (!el) return '';
        return el.textContent.replace(prefix, '').trim();
        };
        const proceso = get('.chip-proc', 'Proceso:');
        const actividad = get('.chip-act', 'Actividad/Infra.:');
        const base = `${String(index).padStart(2,'0')}_${proceso || 'Proceso'}_${actividad || 'Actividad'}`;
        const safe = base.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .replace(/[^\w\- ]+/g,'').replace(/\s+/g,'_');
        return `${safe}.png`;
    }

    async function downloadCard(card, filename) {
        const canvas = await window.html2canvas(card, {
        backgroundColor: '#ffffff', // fondo blanco
        scale: 2,                   // mejor calidad
        useCORS: true
        });
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url; a.download = filename || 'tarjeta.png';
        document.body.appendChild(a);
        a.click();
        requestAnimationFrame(() => a.remove());
    }

    function setup() {
        if (!$cards) return;
        addGlobalButton();
        addPerCardButtons();

        // cuando cambian los resultados (por filtros), reinsertar botones
        const obs = new MutationObserver(() => addPerCardButtons());
        obs.observe($cards, { childList: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
    } else {
        setup();
  }
})();
