// descargar_imagenes.js
(() => {
    'use strict';

    const CDN = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
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

    function waitForImages(scope, timeout = 15000) {
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
        addGlobalButtons($cards);
        addPerCardButtons($cards);

        const obs = new MutationObserver(() => addPerCardButtons($cards));
        obs.observe($cards, { childList: true });

        for (let i=0;i<6;i++){ await sleep(300); addPerCardButtons($cards); }
    }

    function addGlobalButtons($cards) {
        if (document.getElementById('dl-toolbar')) return;

        const panel = $cards.closest('.panel') || $cards.parentElement;
        const toolbar = document.createElement('div');
        toolbar.id = 'dl-toolbar';
        Object.assign(toolbar.style, {
            display:'flex', gap:'8px', justifyContent:'flex-end', margin:'0 0 10px'
        });

        const mkBtn = (id, label) => {
            const b = document.createElement('button');
            b.id = id; b.className = 'btn'; b.type = 'button'; b.textContent = label;
            return b;
        };

        const btnAllCards  = mkBtn('dl-all-cards',  'Descargar todas (tarjetas)');
        const btnAllReport = mkBtn('dl-all-report', 'Descargar todas (informes)');

        btnAllCards.addEventListener('click', async () => {
            await ensureHtml2Canvas();
            const cards = [...$cards.querySelectorAll('.risk-card')];
            for (let i = 0; i < cards.length; i++) {
                await downloadCard(cards[i], makeFilename(cards[i], i + 1, 'tarjeta'), 'card');
                await sleep(140);
            }
        });

        btnAllReport.addEventListener('click', async () => {
            await ensureHtml2Canvas();
            const cards = [...$cards.querySelectorAll('.risk-card')];
            for (let i = 0; i < cards.length; i++) {
                await downloadCard(cards[i], makeFilename(cards[i], i + 1, 'informe'), 'informe');
                await sleep(160);
            }
        });

        toolbar.appendChild(btnAllCards);
        toolbar.appendChild(btnAllReport);

        const title = panel.querySelector('.panel-title');
        if (title && title.parentElement === panel) {
            panel.insertBefore(toolbar, title.nextElementSibling || $cards);
        } else {
            panel.insertBefore(toolbar, panel.firstChild);
        }
    }

    function addPerCardButtons($cards) {
        $cards.querySelectorAll('.risk-card').forEach((card, i) => {
            if (!card.style.position) card.style.position = 'relative';

            // Crear contenedor .dl-actions si no existe
            let actions = card.querySelector('.dl-actions');
            if (!actions) {
            actions = document.createElement('div');
            actions.className = 'dl-actions';
            card.appendChild(actions);
            }

            // Migrar botones viejos (absolutos) si existen
            card.querySelectorAll('button.dl-card-btn, button.dl-card-btn.card, button.dl-card-btn.report')
            .forEach(btn => {
                // Quitar estilos inline heredados (position absolute, etc.)
                btn.removeAttribute('style');
                // Normalizar clases
                if (btn.classList.contains('report')) {
                btn.className = 'dl-report-btn';
                } else {
                btn.className = 'dl-card-btn';
                }
                // Mover al contenedor
                actions.appendChild(btn);
            });

            // Crear botón "Descargar informe" si falta
            if (!actions.querySelector('.dl-report-btn')) {
            const b2 = document.createElement('button');
            b2.type = 'button';
            b2.className = 'dl-report-btn';
            b2.textContent = 'Descargar informe';
            b2.addEventListener('click', async (e) => {
                e.stopPropagation();
                await ensureHtml2Canvas();
                await downloadCard(card, makeFilename(card, i + 1, 'informe'), 'informe');
            });
            actions.appendChild(b2);
            }
        });
    }

    function styleSmallBtn(b){
        Object.assign(b.style, {
            position: 'absolute', top: '10px',
            padding: '6px 10px', borderRadius: '8px',
            border: '1px solid #d0d7de', background: '#ffffff',
            cursor: 'pointer', fontSize: '12px',
            boxShadow: '0 1px 2px rgba(0,0,0,.08)', zIndex: 3
        });
    }

    function makeFilename(card, index, mode) {
        const get = (sel, prefix) => {
            const el = card.querySelector(sel);
            if (!el) return '';
            return el.textContent.replace(prefix, '').trim();
        };
        const proceso   = get('.brand-title', 'RIESGO') || get('.chip-proc', 'Proceso:');
        const actividad = get('.chip-act', 'Actividad/Infra.:');
        const base = `${String(index).padStart(2,'0')}_${proceso || 'Proceso'}_${actividad || 'Actividad'}_${(mode||'card')}`;
        const safe = base.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
            .replace(/[^\w\- ]+/g,'').replace(/\s+/g,'_');
        return `${safe}.png`;
    }

    function extractProceso(card) {
        const procEl = card.querySelector('.brand-title') || card.querySelector('.chip-proc');
        if (!procEl) return '—';
        const raw = procEl.textContent.trim();
        const m = raw.match(/proceso\s*:?\s*(.*)$/i);
        return m ? m[1].trim() : raw.replace(/^\s*Proceso:\s*/i,'').trim();
    }

    // ------ INFORME off-screen para evitar cortes ------
    function buildReportNodeFromCard(card) {
        const procesoText = extractProceso(card);
        const actividad = (card.querySelector('.chip-act')?.textContent || '')
                          .replace(/^Actividad\/Infra\.\s*:\s*/i,'').trim();
        const peligros  = takeByTitle(card, 'Peligros');
        const riesgos   = takeByTitle(card, 'Riesgos');
        const medidas   = takeControls(card);
        const respText  = takeChipStartsWith(card,'Responsabilidad:');
        const freqText  = takeChipStartsWith(card,'Frecuencia:');
        const grupos    = takeVRGroups(card); // [{title,P,C,VR,cls}]
        const flags     = takeFlags(card);    // {rutinaria,noRutinaria,interno,externo}

        // contenedor off-screen
        const host = document.createElement('div');
        host.style.position = 'fixed';
        host.style.left = '-10000px';
        host.style.top = '0';
        host.style.zIndex = '-1';
        host.style.background = '#fff';

        // hoja de estilos aislados
        const style = document.createElement('style');
        style.textContent = `
          .report-wrap{ width:1080px; max-width:1080px; background:#fff; 
            border:1px solid #e5e7eb; border-radius:16px; padding:24px; 
            box-shadow:0 2px 6px rgba(0,0,0,.06); color:#0b1b2a; font-family: Inter, system-ui, Segoe UI, Roboto, Arial, sans-serif; }
          .rep-head{ display:flex; align-items:center; justify-content:space-between; gap:12px; 
            border-bottom:1px solid #e5e7eb; padding-bottom:14px; margin-bottom:14px; }
          .rep-head .logo{ height:75px; width:auto; object-fit:contain; }
          .rep-title{ flex:1; text-align:center; font-size:22px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; color:#007CC1; }
          .rep-sub{ text-align:center; color:#333; margin:8px 0 2px; font-size:14px; }

          .rep-grid{ display:grid; grid-template-columns: 1fr 1fr; gap:14px; margin-top:12px; }
          .rep-box{ border:1px solid #e5e7eb; border-radius:12px; padding:14px; background:#fff; }
          .rep-box h4{ margin:0 0 10px; font-size:15px; color:#0b3a57; }
          .rep-body{ font-size:14px; white-space:pre-wrap; color:#111; }

          .rep-valor{ display:grid; gap:12px; }
          .vr-card{ border:1px solid #e5e7eb; border-radius:12px; padding:12px; background:#fafafa; }
          .vr-title{ margin:0 0 8px; font-size:14px; color:#0b3a57; }
          .vr-badges{ display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px; }
          .vr-badge{ display:inline-block; padding:4px 8px; border-radius:8px; background:#eef6ff; border:1px solid #d1e6ff; font-size:12px; color:#0b3a57; }
          .vr-score{ display:inline-block; padding:8px 12px; border-radius:12px; font-weight:700; font-size:16px; border:1px solid #ddd; }
          .vr-score.low{    background:#ecfdf5; color:#065f46; border-color:#a7f3d0;}
          .vr-score.medium{ background:#fff7ed; color:#9a3412; border-color:#fed7aa;}
          .vr-score.high{   background:#fef2f2; color:#991b1b; border-color:#fecaca;}

          .rep-controls ul{ margin:6px 0 0; padding-left:18px; }
          .rep-controls li{ margin:3px 0; }

          .rep-footer{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; 
            border-top:1px solid #e5e7eb; margin-top:14px; padding-top:12px; color:#444; font-size:12px; }
          .rep-legend{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
          .leg{ display:inline-flex; align-items:center; gap:6px; }
          .dot{ width:12px; height:12px; border-radius:50%; display:inline-block; }
          .dot.low{ background:#10b981; } .dot.med{ background:#f59e0b; } .dot.high{ background:#ef4444; }
        `;
        host.appendChild(style);

        const wrap = document.createElement('div');
        wrap.className = 'report-wrap';
        wrap.innerHTML = `
          <div class="rep-head">
            <img class="logo" src="${LOGO_CENCO}" alt="Cencosud" />
            <div class="rep-title">INFORME DE RIESGO — ${esc(procesoText || '—')}</div>
            <img class="logo" src="${LOGO_IST}" alt="IST" />
          </div>
          <div class="rep-sub">Actividad / Infraestructura: <strong>${esc(actividad || '—')}</strong></div>

          <div class="rep-grid">
            <div class="rep-box">
              <h4>Descripción del riesgo</h4>
              <div class="rep-body">
<strong>Peligros:</strong> ${esc(peligros || '—')}
<strong>Riesgos:</strong> ${esc(riesgos || '—')}
<strong>Tipo de actividad:</strong> ${esc(formatActividad(flags))}
<strong>Personal:</strong> ${esc(formatPersonal(flags))}
              </div>
            </div>

            <div class="rep-box rep-valor">
              ${grupos.map(g => `
                <div class="vr-card">
                  <div class="vr-title">${esc(g.title)}</div>
                  <div class="vr-badges">
                    <span class="vr-badge">P: ${esc(g.P || '—')}</span>
                    <span class="vr-badge">C: ${esc(g.C || '—')}</span>
                  </div>
                  <span class="vr-score ${g.cls}">VR: ${esc(g.VR || '—')}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="rep-box rep-controls" style="margin-top:14px;">
            <h4>Medidas de Control</h4>
            ${medidas}
          </div>

          <div class="rep-footer">
            <div><strong>Responsable:</strong> ${esc(respText || '—')}</div>
            <div><strong>Frecuencia:</strong> ${esc(freqText || '—')}</div>
            <div class="rep-legend" style="margin-left:auto;">
              <span class="leg"><span class="dot low"></span> Bajo</span>
              <span class="leg"><span class="dot med"></span> Medio</span>
              <span class="leg"><span class="dot high"></span> Alto</span>
            </div>
            <div style="width:100%; text-align:right; margin-top:4px;">
              <em>Exportado: ${new Date().toLocaleString()}</em>
            </div>
          </div>
        `;
        host.appendChild(wrap);

        document.body.appendChild(host);
        return { host, wrap };
    }

    function takeByTitle(root, title){
        const nodes = root.querySelectorAll('.rc-section .rc-title');
        for (const n of nodes) {
            if (n.textContent.trim().toLowerCase() === title.toLowerCase()) {
                const v = n.parentElement?.querySelector('.rc-value');
                return v ? v.textContent.trim() : '';
            }
        }
        return '';
    }
    function takeControls(root){
        const ul = root.querySelector('.controls ul');
        if (ul) return `<ul>${ul.innerHTML}</ul>`;
        const plain = root.querySelector('.controls .rc-value');
        return `<div class="rep-body">${esc(plain?.textContent || '—')}</div>`;
    }
    function takeChipStartsWith(root, prefix){
        const chips = root.querySelectorAll('.rc-top .chip');
        for (const c of chips) {
            const t = c.textContent.trim();
            if (t.toLowerCase().startsWith(prefix.toLowerCase())) {
                return t.replace(new RegExp(`^${prefix}\\s*`,'i'),'').trim();
            }
        }
        return '';
    }
    function takeVRGroups(root){
        const arr = [];
        root.querySelectorAll('.metric').forEach(m => {
            const title = m.querySelector('h4')?.textContent?.trim() || '';
            const badges = [...m.querySelectorAll('.badge')].map(b => b.textContent.trim());
            const P = (badges.find(t => /^P:/i.test(t)) || '').replace(/^P:\s*/i,'').trim();
            const C = (badges.find(t => /^C:/i.test(t)) || '').replace(/^C:\s*/i,'').trim();
            const scoreEl = m.querySelector('.score');
            let VR = scoreEl ? scoreEl.textContent.replace(/^VR:\s*/i,'').trim() : '';
            let cls = '';
            if (scoreEl?.classList.contains('score--high')) cls = 'high';
            else if (scoreEl?.classList.contains('score--medium')) cls = 'medium';
            else if (scoreEl?.classList.contains('score--low')) cls = 'low';
            if (!cls) {
                const num = parseFloat((VR||'').replace(',', '.'));
                if (!isNaN(num)) {
                    if (num >= 10) cls = 'high';
                    else if (num >= 5) cls = 'medium';
                    else if (num >= 1) cls = 'low';
                }
            }
            arr.push({ title, P, C, VR, cls });
        });
        return arr;
    }

    // --- NUEVO: extracción de banderas para "rutinaria / no rutinaria" y "personal" ---
    function takeFlags(root){
        const chips = [...root.querySelectorAll('.rc-top .chip, .rc-top .chip-flag, .rc-top .chip-person')]
                        .map(c => c.textContent.trim().toLowerCase());
        const has = (txt) => chips.some(t => t.includes(txt));
        return {
            rutinaria:   has('rutinaria') && !has('no rutinaria'),
            noRutinaria: has('no rutinaria'),
            interno:     has('personal interno'),
            externo:     has('personal externo')
        };
    }
    function formatActividad(f){
        const parts = [];
        if (f.rutinaria)   parts.push('Rutinaria');
        if (f.noRutinaria) parts.push('No rutinaria');
        return parts.length ? parts.join(' y ') : '—';
        }
    function formatPersonal(f){
        const parts = [];
        if (f.interno) parts.push('Interno');
        if (f.externo) parts.push('Externo');
        return parts.length ? parts.join(' y ') : '—';
    }

    function esc(s){ return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }

    async function downloadCard(card, filename, mode='card') {
        await waitForImages(card);

        const btns = card.querySelectorAll('.dl-card-btn');
        const prevVis = [];
        btns.forEach(b => { prevVis.push(b.style.visibility); b.style.visibility = 'hidden'; });

        let canvas;

        if (mode === 'card') {
            card.setAttribute('data-exporting', '1');
            const procesoText = extractProceso(card);

            canvas = await window.html2canvas(card, {
                backgroundColor: '#ffffff',
                scale: 2,
                useCORS: true,
                allowTaint: false,
                imageTimeout: 20000,
                ignoreElements: el => {
                    const id = el.id || '';
                    const cls = el.classList ? Array.from(el.classList) : [];
                    return (
                        id === 'dl-all-cards' ||
                        id === 'dl-all-report' ||
                        id === 'dl-toolbar' ||
                        cls.includes('dl-actions') ||
                        cls.includes('dl-card-btn') ||
                        cls.includes('dl-report-btn')
                    );
                },

                onclone: (doc) => {
                    const style = doc.createElement('style');
                    style.textContent = `
                        #dl-toolbar, .dl-actions, .dl-card-btn, .dl-report-btn { display:none !important; }
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

                    const clonedCard = doc.querySelector('.risk-card[data-exporting="1"]');
                    if (!clonedCard) return;

                    if (!clonedCard.querySelector('.card-brandbar')) {
                        const brandbar = doc.createElement('div');
                        brandbar.className = 'card-brandbar';
                        brandbar.innerHTML = `
                            <img src="${LOGO_CENCO}" alt="Cencosud" class="brand-mini" />
                            <div class="brand-title">RIESGO PROCESO ${procesoText || '—'}</div>
                            <img src="${LOGO_IST}" alt="IST" class="brand-mini" />
                        `;
                        clonedCard.insertBefore(brandbar, clonedCard.firstChild);
                    } else {
                        const bb = clonedCard.querySelector('.card-brandbar');
                        const t  = bb.querySelector('.brand-title');
                        if (t) t.textContent = `RIESGO PROCESO ${procesoText || '—'}`;
                        const [imgL, imgR] = bb.querySelectorAll('img');
                        if (imgL) imgL.src = LOGO_CENCO;
                        if (imgR) imgR.src = LOGO_IST;
                    }
                    doc.querySelectorAll('.card-brandbar img').forEach(img => img.removeAttribute('crossorigin'));
                }
            });

            card.removeAttribute('data-exporting');
        } else {
            const { host, wrap } = buildReportNodeFromCard(card);
            await waitForImages(host);

            canvas = await window.html2canvas(wrap, {
                backgroundColor: '#ffffff',
                scale: 2,
                useCORS: true,
                allowTaint: false,
                imageTimeout: 20000
            });

            host.remove();
        }

        btns.forEach((b, i) => b.style.visibility = prevVis[i]);

        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url; a.download = filename || (mode==='card' ? 'tarjeta.png' : 'informe.png');
        document.body.appendChild(a);
        a.click();
        requestAnimationFrame(() => a.remove());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
    } else {
        setup();
    }
})();
