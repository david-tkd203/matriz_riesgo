(() => {
    'use strict';

    const M = window.DS44_MANIFEST || {};
    const ALL_KEYS = Object.keys(M);

    /* ========= Helpers básicos ========= */
    const getParam = (name) => {
        const url = new URL(window.location.href);
        const v = url.searchParams.get(name);
        return v ? decodeURIComponent(v) : '';
    };

    const escapeHTML = (s) => String(s || '').replace(/[&<>"']/g, (m) => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'
    }[m]));

    const fileExt = (p) => (p?.match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();
    const extBadge = (ext) => ext ? `<span class="ext-badge">${ext}</span>` : '';

    const encodeLink = (rawPath) =>
        encodeURI(rawPath).replace(/#/g, '%23').replace(/\?/g, '%3F').replace(/\+/g, '%2B');

    const stripDiacritics = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normalizeKey = (s) => stripDiacritics(String(s || '')
        .replace(/[\\/]+/g, '/')
        .replace(/N[°º]/gi, 'N')     // N°/Nº -> N
        .replace(/\s+/g, ' ')
        .replace(/\/+$/,'')
        .trim()
        .toLowerCase()
    );

    const buildCrumbs = (key) =>
        key.split('/').map(p => `<span>${escapeHTML(p)}</span>`).join(' <span aria-hidden="true">/</span> ');

    const FOLDER_SVG = `
    <svg class="folder-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#F9A41E" d="M10 4l2 2h6a2 2 0 012 2v1H4V6a2 2 0 012-2h4z"></path>
    <path fill="#FFC766" d="M4 9h16a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V9z"></path>
    <path fill="rgba(0,0,0,.08)" d="M4 9h16v1H4z"></path>
    </svg>`;

    /* ========= Resolución de claves robusta ========= */
    // Índice por forma normalizada (incluye variantes N°/Nº)
    const NORM_INDEX = new Map();
    for (const k of ALL_KEYS) {
        const forms = [k, k.replace(/N°/g,'Nº'), k.replace(/Nº/g,'N°')];
        for (const f of forms) {
        const nk = normalizeKey(f);
        if (!NORM_INDEX.has(nk)) NORM_INDEX.set(nk, k);
        }
    }

    function resolveKey(inputKey) {
        const raw = String(inputKey || '').replace(/[\\/]+/g, '/').replace(/\/+$/,'');
        if (M[raw]) return raw;

        const want = normalizeKey(raw);

        // 1) exacta normalizada
        if (NORM_INDEX.has(want)) return NORM_INDEX.get(want);

        // 2) comparar contra último segmento (normalizado)
        const wantTail = want.split('/').pop();
        let best = null, bestDepth = -1;
        for (const k of ALL_KEYS) {
        const nk = normalizeKey(k);
        const tail = nk.split('/').pop();
        if (tail === wantTail || nk.endsWith('/' + wantTail)) {
            const depth = k.split('/').length;
            if (depth > bestDepth) { best = k; bestDepth = depth; }
        }
        }
        if (best) return best;

        return 'DS44_Root';
    }

    /* ========= SOLO hijas directas =========
        Devuelve una lista de claves (keys) que son exactamente un nivel
        por debajo de parentKey. Si no existe la clave del hijo directo,
        apunta al primer descendiente más cercano que empiece por ese tramo.
    */
    function getDirectChildrenKeys(parentKey) {
        const parent = String(parentKey).replace(/[\\/]+/g, '/').replace(/\/+$/,'');
        const prefix = parent + '/';
        const parentDepth = parent.split('/').length;

        const bySegment = new Map(); // seg -> bestKey

        for (const fullKey of ALL_KEYS) {
        if (!fullKey.startsWith(prefix)) continue;
        const parts = fullKey.split('/');
        if (parts.length <= parentDepth) continue;

        // segmento inmediato (solo el siguiente nivel)
        const seg = parts[parentDepth];

        // preferimos una clave EXACTA del hijo directo (depth = parentDepth+1)
        const directKey = prefix + seg;
        let candidate = null;

        if (M[directKey]) {
            candidate = directKey;
        } else {
            // buscar el descendiente más cercano que empiece por directKey + '/'
            let best = null, bestDepth = Infinity;
            for (const k of ALL_KEYS) {
            if (k === directKey) { best = k; break; }
            if (k.startsWith(directKey + '/')) {
                const d = k.split('/').length;
                if (d < bestDepth) { best = k; bestDepth = d; }
            }
            }
            candidate = best || fullKey; // fallback
        }

        // guardar el mejor por segmento (preferir menor profundidad)
        if (!bySegment.has(seg) || bySegment.get(seg).split('/').length > candidate.split('/').length) {
            bySegment.set(seg, candidate);
        }
        }

        // Únicos y orden natural (1.9 < 1.10 correctamente)
        const keys = Array.from(bySegment.values());
        keys.sort(naturalSectionSort);
        return keys;
    }

    function visibleLabelFrom(key) {
        return key.split('/').pop().replace(/\s{2,}/g, ' ').trim();
    }
    function indexArray(title) {
        const t = visibleLabelFrom(title);
        const m = t.match(/^\s*(\d+(?:\.\d+)*)(?:\s|$)/);
        return m ? m[1].split('.').map(n => parseInt(n, 10)) : [9999];
    }
    function naturalSectionSort(a, b) {
        const A = indexArray(a), B = indexArray(b);
        for (let i = 0; i < Math.max(A.length, B.length); i++) {
        const da = A[i] ?? 0, db = B[i] ?? 0;
        if (da !== db) return da - db;
        }
        return visibleLabelFrom(a).localeCompare(visibleLabelFrom(b), 'es', { numeric:true, sensitivity:'base' });
    }

    /* ========= Apertura de archivos ========= */
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

    /* ========= Render carpetas (solo hijas directas) ========= */
    function renderFolders(currentKey) {
        const host = document.getElementById('folder-list');
        if (!host) return;
        host.innerHTML = '';

        const childrenKeys = getDirectChildrenKeys(currentKey);
        if (!childrenKeys.length) {
        host.style.display = 'none';
        return;
        }
        host.style.display = 'flex';

        const frag = document.createDocumentFragment();
        for (const ck of childrenKeys) {
        const label = visibleLabelFrom(ck);
        const a = document.createElement('a');
        a.className = 'folder-chip';
        a.href = `file.html?k=${encodeURIComponent(ck)}&title=${encodeURIComponent(label)}`;
        a.innerHTML = `${FOLDER_SVG}<strong>${escapeHTML(label)}</strong>`;
        frag.appendChild(a);
        }
        host.appendChild(frag);
    }

    /* ========= Render archivos ========= */
    function renderFiles(node) {
        const host = document.getElementById('file-list');
        const note = document.getElementById('page-note');
        if (!host) return;

        host.innerHTML = '';

        const files = Array.isArray(node?.files) ? node.files : [];
        if (!files.length) {
        const empty = document.createElement('div');
        empty.className = 'muted';
        empty.textContent = 'No hay archivos en esta sección.';
        host.appendChild(empty);
        if (note) {
            note.style.display = 'block';
            note.textContent = 'Sugerencia: agrega o corrige rutas en ds44_manifest.js si falta contenido.';
        }
        return;
        }

        if (note) note.style.display = 'none';

        const frag = document.createDocumentFragment();
        for (const f of files) {
        const card = document.createElement('article');
        card.className = 'file-card';

        const left = document.createElement('div');
        const h = document.createElement('h4');
        h.className = 'file-title';
        const ext = fileExt(f.path || f.name);
        h.innerHTML = `${escapeHTML(f.name || (f.path ? f.path.split('/').pop() : 'Archivo'))} ${extBadge(ext)}`;

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
        a.href = candidates[0];
        a.target = '_blank'; a.rel = 'noopener';

        a.addEventListener('click', async (ev) => {
            ev.preventDefault();
            const ok = await tryOpenSameOrigin(candidates);
            if (!ok) {
            alert(`No se pudo abrir:\n${f.name || f.path}\n\nVerifica la ruta en el proyecto:\n${f.path}`);
            }
        });

        right.appendChild(a);
        card.appendChild(left);
        card.appendChild(right);
        frag.appendChild(card);
        }
        host.appendChild(frag);
    }

    /* ========= Render principal ========= */
    function render() {
        if (!ALL_KEYS.length) {
        const host = document.getElementById('file-list');
        if (host) {
            const warn = document.createElement('div');
            warn.className = 'muted';
            warn.innerHTML = `No se cargó <code>ds44_manifest.js</code>. Inclúyelo <em>antes</em> de <code>file_view.js</code>.`;
            host.appendChild(warn);
        }
        return;
        }

        const rawK = (getParam('k') || 'DS44_Root').replace(/[\\/]+/g, '/').replace(/\/+$/,'');
        const rKey = resolveKey(rawK);
        const node = M[rKey];

        // Títulos y breadcrumbs
        const safeTitle = getParam('title') || rKey.split('/').pop() || 'Decreto Supremo N° 44';
        const pageTitle    = document.getElementById('page-title');
        const sectionTitle = document.getElementById('section-title');
        const pageSub      = document.getElementById('page-subtitle');
        const desc         = document.getElementById('page-desc');
        const crumbs       = document.getElementById('breadcrumbs');

        if (pageTitle)    pageTitle.textContent    = `Decreto Supremo N°44 — ${safeTitle}`;
        if (sectionTitle) sectionTitle.textContent = `Decreto Supremo N°44 — ${safeTitle}`;
        if (pageSub)      pageSub.textContent      = 'Archivos y documentos';
        if (crumbs)       crumbs.innerHTML         = `Decreto Supremo N°44 / ${buildCrumbs(rKey)}`;
        if (desc)         desc.textContent         = node?.desc || '';

        // Carpetas (solo hijas directas) + archivos
        renderFolders(rKey);
        renderFiles(node || {});
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render);
    } else {
        render();
    }
})();