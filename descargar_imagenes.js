// descargar_imagenes.js
(() => {
    'use strict';

    const CDN = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    // Rutas de los logos (mismo directorio que tu index.html -> /static/img/...)
    const LOGO_CENCO = 'static/img/logo_cencosud.png';
    const LOGO_IST   = 'static/img/logo_ist.png';

    const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

    function ensureHtml2Canvas() {
        if (window.html2canvas) return Promise.resolve();
        return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = CDN; s.async = true; s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
        });
    }

    function waitForEl(selector) {
        return new Promise(resolve => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        const obs = new MutationObserver(() => {
            const el2 = document.querySelector(selector);
            if (el2) { obs.disconnect(); resolve(el2); }
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
        });
    }

    function waitForImages(scope, timeout = 10000) {
        const imgs = Array.from(scope.querySelectorAll('img'))
        .filter(img => !img.complete || img.naturalWidth === 0);
        if (!imgs.length) return Promise.resolve();
        return new Promise(resolve => {
        let left = imgs.length, done = false;
        const finish = () => { if (!done) { done = true; resolve(); } };
        const t = setTimeout(finish, timeout);
        imgs.forEach(img => {
            img.addEventListener('load',  () => { if (--left === 0) { clearTimeout(t); finish(); } }, { once:true });
            img.addEventListener('error', () => { if (--left === 0) { clearTimeout(t); finish(); } }, { once:true });
        });
        });
    }

    async function setup() {
        const $cards = await waitForEl('#vp-cards');
        addGlobalButton($cards);
        addPerCardButtons($cards);

        // Re-inyecta botones si cambian las tarjetas por filtros
        const obs = new MutationObserver(() => addPerCardButtons($cards));
        obs.observe($cards, { childList: true });

        // refuerzo inicial (por si render es lento)
        for (let i=0;i<6;i++){ await sleep(300); addPerCardButtons($cards); }
    }

    function addGlobalButton($cards) {
        if (document.getElementById('dl-all-btn')) return;

        const panel = $cards.closest('.panel') || $cards.parentElement;
        const toolbar = document.createElement('div');
        toolbar.id = 'dl-toolbar';
        toolbar.style.display = 'flex';
        toolbar.style.justifyContent = 'flex-end';
        toolbar.style.margin = '0 0 10px';

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
            await sleep(140);
        }
        });

        toolbar.appendChild(btn);

        const title = panel.querySelector('.panel-title');
        if (title && title.parentElement === panel) {
        panel.insertBefore(toolbar, title.nextElementSibling || $cards);
        } else {
        panel.insertBefore(toolbar, panel.firstChild);
        }
    }

    function addPerCardButtons($cards) {
        $cards.querySelectorAll('.risk-card').forEach((card, i) => {
        if (card.querySelector('.dl-card-btn')) return;

        if (!card.style.position) card.style.position = 'relative';

        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'dl-card-btn';
        b.textContent = 'Descargar';
        Object.assign(b.style, {
            position: 'absolute', top: '10px', right: '10px',
            padding: '6px 10px', borderRadius: '8px',
            border: '1px solid #d0d7de', background: '#ffffff',
            cursor: 'pointer', fontSize: '12px', boxShadow: '0 1px 2px rgba(0,0,0,.08)', zIndex: 3
        });

        b.addEventListener('click', async (e) => {
            e.stopPropagation();
            await ensureHtml2Canvas();
            await downloadCard(card, makeFilename(card, i + 1));
        });

        card.appendChild(b);
        });
    }

    function makeFilename(card, index) {
        const get = (sel, prefix) => {
        const el = card.querySelector(sel);
        if (!el) return '';
        return el.textContent.replace(prefix, '').trim();
        };
        const proceso   = get('.brand-title', 'RIESGO PROCESO') || get('.chip-proc', 'Proceso:');
        const actividad = get('.chip-act', 'Actividad/Infra.:');
        const base = `${String(index).padStart(2,'0')}_${proceso || 'Proceso'}_${actividad || 'Actividad'}`;
        const safe = base.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .replace(/[^\w\- ]+/g,'').replace(/\s+/g,'_');
        return `${safe}.png`;
    }

    // Extrae el texto del proceso desde la tarjeta visible
    function extractProceso(card) {
        const procEl = card.querySelector('.brand-title') || card.querySelector('.chip-proc');
        if (!procEl) return '—';
        const raw = procEl.textContent.trim();
        const m = raw.match(/proceso\s*:?\s*(.*)$/i);
        return m ? m[1].trim() : raw.replace(/^\s*Proceso:\s*/i,'').trim();
    }

    async function downloadCard(card, filename) {
        // Espera a que carguen las imágenes existentes en la tarjeta
        await waitForImages(card);

        // Oculta botón durante la captura
        const btn = card.querySelector('.dl-card-btn');
        const prevVis = btn ? btn.style.visibility : '';
        if (btn) btn.style.visibility = 'hidden';

        // Marcamos la tarjeta para localizarla en el DOM clonado
        card.setAttribute('data-exporting', '1');
        const procesoText = extractProceso(card); // usado en el clon

        const canvas = await window.html2canvas(card, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: false,
        imageTimeout: 15000,
        ignoreElements: (el) => {
            const id = el.id || '';
            const cls = el.classList ? Array.from(el.classList) : [];
            // No dibujar los botones
            return id === 'dl-all-btn' || cls.includes('dl-card-btn');
        },
        onclone: (doc) => {
            // 1) Ocultar botones en el clon por si acaso
            const style = doc.createElement('style');
            style.textContent = `
            #dl-all-btn, .dl-card-btn { display:none !important; }
            .card-brandbar {
                display:flex; align-items:center; justify-content:space-between; gap:12px;
                padding:8px 10px; background:#ffffff; border:1px solid #e5e7eb;
                border-radius:12px; box-shadow:0 1px 2px rgba(0,0,0,.04); margin-bottom:10px;
            }
            .card-brandbar .brand-mini { height:28px; width:auto; max-width:120px; object-fit:contain; }
            .card-brandbar .brand-title {
                flex:1; text-align:center; font-size:14px; font-weight:700; letter-spacing:.06em;
                text-transform:uppercase; color:#007CC1; padding:0 8px; word-break:break-word;
            }
            `;
            doc.head.appendChild(style);

            // 2) Ubicar la tarjeta clonada
            const clonedCard = doc.querySelector('.risk-card[data-exporting="1"]');
            if (!clonedCard) return;

            // 3) Asegurar encabezado con logos + título en el clon
            let brandbar = clonedCard.querySelector('.card-brandbar');
            if (!brandbar) {
            brandbar = doc.createElement('div');
            brandbar.className = 'card-brandbar';
            brandbar.innerHTML = `
                <img src="${LOGO_CENCO}" alt="Cencosud" class="brand-mini" />
                <div class="brand-title">RIESGO PROCESO ${procesoText || '—'}</div>
                <img src="${LOGO_IST}" alt="IST" class="brand-mini" />
            `;
            clonedCard.insertBefore(brandbar, clonedCard.firstChild);
            } else {
            // Si existe, forzar src correctos y título
            const [imgL, title, imgR] = [
                brandbar.querySelector('img:nth-of-type(1)'),
                brandbar.querySelector('.brand-title'),
                brandbar.querySelector('img:nth-of-type(2)')
            ];
            if (imgL) imgL.setAttribute('src', LOGO_CENCO);
            if (imgR) imgR.setAttribute('src', LOGO_IST);
            if (title) title.textContent = `RIESGO PROCESO ${procesoText || '—'}`;
            }

            // 4) Quitar cualquier atributo crossorigin en el clon
            brandbar.querySelectorAll('img').forEach(img => img.removeAttribute('crossorigin'));
        }
        });

        // Restaurar estado
        if (btn) btn.style.visibility = prevVis;
        card.removeAttribute('data-exporting');

        // Descargar
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url; a.download = filename || 'tarjeta.png';
        document.body.appendChild(a);
        a.click();
        requestAnimationFrame(() => a.remove());
    }

    // start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
    } else {
        setup();
    }
})();
