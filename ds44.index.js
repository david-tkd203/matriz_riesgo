// ds44_index.js
(() => {
    'use strict';

    const JSON_URL = 'ds44.json';
    const TOC_EL   = document.getElementById('ds44-toc');

    const esc = (s) => String(s || '').replace(/[&<>"']/g, m => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'
    }[m]));
    const linkToFile = (slug) => `file.html#/${encodeURIComponent(slug)}`;

    function buildSectionCard(node) {
        const wrap = document.createElement('article');
        wrap.className = 'section-card';

        const h = document.createElement('h3');
        h.innerHTML = `<a href="${linkToFile(node.page || node.slug)}">${esc(node.title)}</a>`;
        wrap.appendChild(h);

        if (Array.isArray(node.children) && node.children.length) {
        const box = document.createElement('div');
        box.className = 'children';

        const ul = document.createElement('ul');
        ul.className = 'toc';
        node.children.forEach(ch => ul.appendChild(buildChildItem(ch)));
        box.appendChild(ul);
        wrap.appendChild(box);
        }
        return wrap;
    }

    function buildChildItem(node) {
        const li = document.createElement('li');
        const a  = document.createElement('a');
        a.className = 'file-link';
        a.href = linkToFile(node.slug);
        a.textContent = node.title;
        li.appendChild(a);

        if (node.children && node.children.length) {
        const ul = document.createElement('ul');
        node.children.forEach(grand => ul.appendChild(buildChildItem(grand)));
        li.appendChild(ul);
        }
        return li;
    }

    async function init() {
        try {
        const r = await fetch(JSON_URL, { cache: 'no-store' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();

        // Portada (enlace a file.html con 'ds44-root')
        const portada = document.createElement('article');
        portada.className = 'section-card';
        portada.innerHTML = `
            <h3><a href="${linkToFile(data.meta?.rootSlug || 'ds44-root')}">Portada / Documento general</a></h3>
            <p class="muted small">Acceso al documento marco del DS 44.</p>
        `;
        TOC_EL.appendChild(portada);

        (data.nav || []).forEach(top => {
            TOC_EL.appendChild(buildSectionCard(top));
        });
        } catch (e) {
        console.error(e);
        TOC_EL.innerHTML = `<p class="muted">No se pudo cargar el índice.</p>`;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
