// file_view.js
(() => {
    'use strict';

    const JSON_URL = 'ds44.json';

    const TITLE_EL = document.getElementById('page-title');
    const SEC_EL   = document.getElementById('section-title');
    const DESC_EL  = document.getElementById('page-desc');
    const NOTE_EL  = document.getElementById('page-note');
    const LIST_EL  = document.getElementById('file-list');
    const BREAD_EL = document.getElementById('breadcrumbs');

    let DATA = null;
    let PAGES = null;

    const enc = (s) => encodeURI(s);
    const esc = (s) => String(s || '').replace(/[&<>"']/g, m => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'
    }[m]));

    function getSlugFromHash() {
        const raw = (location.hash || '').replace(/^#\/?/, '');
        try { return decodeURIComponent(raw || '').trim(); }
        catch { return raw || ''; }
    }

    function setTitles(folderTitle) {
        const t = folderTitle ? `Decreto Supremo N°44 — ${folderTitle}` : 'Decreto Supremo N°44';
        document.title = t;
        if (TITLE_EL) TITLE_EL.textContent = t;
        if (SEC_EL) SEC_EL.textContent = t;
    }

    function findTrail(slug) {
        if (!DATA) return null;
        if (!slug || slug === DATA.meta?.rootSlug) {
        return [{ slug: DATA.meta?.rootSlug || 'ds44-root', title: 'Portada' }];
        }
        // Busca en árbol nav
        function walk(nodes, trail) {
        for (const n of nodes) {
            const curr = [...trail, n];
            if (n.slug === slug) return curr;
            if (Array.isArray(n.children)) {
            const r = walk(n.children, curr);
            if (r) return r;
            }
        }
        return null;
        }
        return walk(DATA.nav || [], []) || null;
    }

    function renderBreadcrumb(slug) {
        const trail = findTrail(slug);
        if (!BREAD_EL) return;
        if (!trail) { BREAD_EL.textContent = ''; return; }
        const html = trail.map((n, i) => {
        if (i === trail.length - 1) return `<strong>${esc(n.title)}</strong>`;
        return `<a href="ds44.html#/${encodeURIComponent(n.slug)}">${esc(n.title)}</a>`;
        }).join(' › ');
        BREAD_EL.innerHTML = html;
    }

    function renderPage(slug) {
        const page = PAGES[slug] || PAGES[DATA.meta?.rootSlug] || {};
        const titleFolder = page.title || 'Documentos';
        setTitles(titleFolder);
        renderBreadcrumb(slug);

        if (DESC_EL) DESC_EL.textContent = page.desc || '';
        if (NOTE_EL) {
        if (page.note) { NOTE_EL.style.display = ''; NOTE_EL.textContent = page.note; }
        else { NOTE_EL.style.display = 'none'; NOTE_EL.textContent = ''; }
        }

        if (!LIST_EL) return;
        LIST_EL.innerHTML = '';
        const files = page.files || [];
        if (!files.length) {
        LIST_EL.innerHTML = '<p class="muted">No hay archivos listados en esta sección.</p>';
        return;
        }

        const frag = document.createDocumentFragment();
        files.forEach(f => {
        const card = document.createElement('article');
        card.className = 'file-card';
        card.innerHTML = `
            <div class="file-main">
            <h4 class="file-title">${esc(f.label)}</h4>
            <p class="file-desc">${esc(f.desc || '')}</p>
            </div>
            <div class="file-cta">
            <a class="btn" target="_blank" rel="noopener" href="${enc(f.path)}">Abrir</a>
            </div>
        `;
        frag.appendChild(card);
        });
        LIST_EL.appendChild(frag);
    }

    async function init() {
        try {
        const r = await fetch(JSON_URL, { cache: 'no-store' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        DATA = await r.json();
        PAGES = DATA.pages || {};

        const render = () => renderPage(getSlugFromHash() || DATA.meta?.rootSlug || 'ds44-root');
        render();
        window.addEventListener('hashchange', render);
        } catch (e) {
        console.error('No se pudo cargar ds44.json', e);
        if (LIST_EL) LIST_EL.innerHTML = '<p class="muted">No se pudo cargar el contenido.</p>';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
