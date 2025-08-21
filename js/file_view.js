// file_view.js (versión robusta: normaliza clave k, soporta N°/Nº, acentos y espacios)
(() => {
    'use strict';

    const M = window.DS44_MANIFEST || {};

    // ===== Helpers =====
    const getParam = (name) => {
        const url = new URL(window.location.href);
        const v = url.searchParams.get(name);
        return v ? decodeURIComponent(v) : '';
    };

    const escapeHTML = (s) => String(s || '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
    const fileExt = (p) => (p.match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();
    const extBadge = (ext) => (ext ? `<span class="ext-badge">${ext}</span>` : '');

    // No tocar las barras /, pero codificar el resto
    const encodeLink = (rawPath) =>
        encodeURI(rawPath).replace(/#/g, '%23').replace(/\?/g, '%3F').replace(/\+/g, '%2B');

    // Genera candidatos de URL: N°/Nº + NFC/NFD
    function makePathCandidates(path) {
        const set = new Set();
        const add = (p) => set.add(encodeLink(p));

        add(path);
        if (path.includes('N°')) add(path.replace(/N°/g, 'Nº'));
        if (path.includes('Nº')) add(path.replace(/Nº/g, 'N°'));
        try {
        const nfc = path.normalize('NFC');
        const nfd = path.normalize('NFD');
        add(nfc); add(nfd);
        if (nfc.includes('N°')) add(nfc.replace(/N°/g, 'Nº'));
        if (nfc.includes('Nº')) add(nfc.replace(/Nº/g, 'N°'));
        if (nfd.includes('N°')) add(nfd.replace(/N°/g, 'Nº'));
        if (nfd.includes('Nº')) add(nfd.replace(/Nº/g, 'N°'));
        } catch {}
        return Array.from(set);
    }

    async function tryOpenSameOrigin(urls) {
        for (const u of urls) {
        try {
            const res = await fetch(u, { method: 'HEAD' });
            if (res.ok) { window.open(u, '_blank', 'noopener'); return true; }
        } catch {}
        }
        return false;
    }

    // ==== Resolución de clave robusta (espacios, acentos, N°/Nº) ====
    const stripDiacritics = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const norm = (s) => stripDiacritics(String(s || '')
        .replace(/N[°º]/gi, 'N')      // N°/Nº -> N (para comparar)
        .replace(/\s+/g, ' ')         // colapsa espacios
        .trim()
        .toLowerCase());

    function resolveKey(inputKey) {
        if (M[inputKey]) return inputKey;

        const want = norm(inputKey);
        const keys = Object.keys(M);

        // 1) Igualdad normalizada
        let found = keys.find(k => norm(k) === want);
        if (found) return found;

        // 2) Terminación (útil cuando solo pasas la hoja final)
        found = keys.find(k => norm(k).endsWith(want));
        if (found) return found;

        // 3) Coincidencia por inclusión
        found = keys.find(k => norm(k).includes(want));
        if (found) return found;

        // 4) Fallback raíz
        return 'DS44_Root';
    }

    const buildCrumbs = (key) =>
        key.split('/').map(p => `<span>${escapeHTML(p)}</span>`).join(' <span aria-hidden="true">/</span> ');

    // ===== Render =====
    function render() {
        // Lee parámetros (puedes venir sin k)
        const rawK  = getParam('k') || 'DS44_Root';
        const rKey  = resolveKey(rawK);
        const title = getParam('title') || rKey.split('/').slice(-1)[0] || 'Decreto Supremo N° 44';

        const node = M[rKey];

        // Referencias UI
        const pageTitle    = document.getElementById('page-title');
        const sectionTitle = document.getElementById('section-title');
        const pageSub      = document.getElementById('page-subtitle');
        const desc         = document.getElementById('page-desc');
        const crumbs       = document.getElementById('breadcrumbs');
        const note         = document.getElementById('page-note');
        const fileList     = document.getElementById('file-list');
        const folderList   = document.getElementById('folder-list');

        if (pageTitle)    pageTitle.textContent    = `Decreto Supremo N°44 — ${title}`;
        if (sectionTitle) sectionTitle.textContent = `Decreto Supremo N°44 — ${title}`;
        if (pageSub)      pageSub.textContent      = 'Archivos y documentos';
        if (crumbs)       crumbs.innerHTML         = `Decreto Supremo N°44 / ${buildCrumbs(rKey)}`;
        if (desc)         desc.textContent         = node?.desc || '';

        if (folderList) folderList.innerHTML = '';
        if (fileList)   fileList.innerHTML   = '';

        // Si el manifiesto no cargó
        if (!Object.keys(M).length) {
        const warn = document.createElement('div');
        warn.className = 'muted';
        warn.innerHTML = `No se cargó <code>ds44_manifest.js</code>. Revisa que el archivo exista y esté incluido <em>antes</em> de <code>file_view.js</code>.`;
        fileList?.appendChild(warn);
        return;
        }

        if (!node) {
        const warn = document.createElement('div');
        warn.className = 'muted';
        warn.innerHTML = `No se encontró la sección <code>${escapeHTML(rawK)}</code>.<br>Usando <code>${escapeHTML(rKey)}</code>. Vuelve al <a href="ds44.html">índice DS44</a> si lo necesitas.`;
        fileList?.appendChild(warn);
        return;
        }

        // ---- Subcarpetas
        const children = Array.isArray(node.children) ? node.children : [];
        if (children.length && folderList) {
        const frag = document.createDocumentFragment();
        children.forEach((childKey) => {
            const a = document.createElement('a');
            a.className = 'folder-chip';
            a.href = `file.html?k=${encodeURIComponent(childKey)}&title=${encodeURIComponent(childKey.split('/').slice(-1)[0])}`;
            a.innerHTML = `
            <svg class="folder-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#F9A41E" d="M10 4l2 2h6a2 2 0 012 2v1H4V6a2 2 0 012-2h4z"/>
                <path fill="#FFC766" d="M4 9h16a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V9z"/>
                <path fill="rgba(0,0,0,.08)" d="M4 9h16v1H4z"/>
            </svg>
            <strong>${escapeHTML(childKey.split('/').slice(-1)[0])}</strong>`;
            frag.appendChild(a);
        });
        folderList.appendChild(frag);
        }

        // ---- Archivos
        const files = Array.isArray(node.files) ? node.files : [];
        if (!files.length) {
        const empty = document.createElement('div');
        empty.className = 'muted';
        empty.textContent = 'No hay archivos en esta sección.';
        fileList?.appendChild(empty);
        if (note) {
            note.style.display = 'block';
            note.textContent = 'Sugerencia: agrega o corrige rutas en ds44_manifest.js si falta contenido.';
        }
        return;
        }

        if (note) note.style.display = 'none';
        const frag = document.createDocumentFragment();

        files.forEach((f) => {
        const card = document.createElement('article');
        card.className = 'file-card';

        const left = document.createElement('div');
        const h    = document.createElement('h4');
        h.className = 'file-title';
        const ext  = fileExt(f.path);
        h.innerHTML = `${escapeHTML(f.name || f.path.split('/').pop())} ${extBadge(ext)}`;

        const p = document.createElement('p');
        p.className = 'file-desc';
        p.textContent = f.desc || '';

        left.appendChild(h);
        left.appendChild(p);

        const right = document.createElement('div');
        right.className = 'file-cta';

        const a = document.createElement('a');
        a.className = 'btn';
        a.textContent = 'Abrir';

        const candidates = makePathCandidates(f.path);
        a.href = candidates[0]; // por si el HEAD está bloqueado
        a.target = '_blank'; a.rel = 'noopener';

        a.addEventListener('click', async (ev) => {
            ev.preventDefault();
            const ok = await tryOpenSameOrigin(candidates);
            if (!ok) {
            alert(`No se pudo abrir:\n${f.name}\n\nVerifica la ruta en el proyecto:\n${f.path}`);
            }
        });

        right.appendChild(a);
        card.appendChild(left);
        card.appendChild(right);
        frag.appendChild(card);
        });

        fileList?.appendChild(frag);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render);
    } else {
        render();
    }
})();
