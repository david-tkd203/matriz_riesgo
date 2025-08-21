(() => {
    'use strict';

    // === Configuración (aislada) ===
    const VP_FILENAME = 'matriz_riesgos_supermercados_2025.xlsx';
    const VP_ALLOWED_SHEETS_RAW  = ["Recepción",'Bodega', 'Carnicería', 'Lineal de Cajas',"Fiambrería","Panadería", "Deli o Platos preparados ", "Cocina Casino","Sala de Ventas ","Administrativos", "Contratistas-Visitas", "Trabajos Nocturnos"];
    const VP_ALLOWED_SHEETS_NORM = new Set(VP_ALLOWED_SHEETS_RAW.map(normName));

    // Encabezados y datos
    const GROUP_ROW = 10;      // Fila con nombres de grupo (p.ej., "Probabilidad")
    const SUB_ROW   = 11;      // Fila con subencabezados (p.ej., "P" / "C")
    const DATA_START_ROW = 12; // Datos desde aquí

    // Columnas D..R (0-based)
    const COL_START = 3;
    const COL_END   = 17;

    // Para filtros B y C
    const B_COL = 1;
    const C_COL = 2;

    // === DOM (vista tarjetas) ===
    const $status   = document.getElementById('vp-status');
    const $sheets   = document.getElementById('vp-sheets');
    const $cards    = document.getElementById('vp-cards');
    const $filter   = document.getElementById('vp-filter-input');

    const $procSel  = document.getElementById('vp-process-filter');
    const $actSel   = document.getElementById('vp-activity-filter');
    const $riskSel  = document.getElementById('vp-risk-filter');      // <- NUEVO
    const $clearBtn = document.getElementById('vp-clear');

    // Input compartido
    const $file     = document.getElementById('file-fallback');

    // === Estado (aislado) ===
    let wb = null;
    let allSheetNames = [];
    let headersDR = [];
    let rowsData  = [];
    let allProc = [];
    let allAct  = [];
    let allRisk = [];          // <- NUEVO

    // === Inicio ===
    init();

    async function init() {
        try {
        const { url, ab } = await tryFetchAny(['/' + VP_FILENAME, './' + VP_FILENAME]);
        wb = XLSX.read(ab, { type: 'array' });
        allSheetNames = wb.SheetNames.slice();

        renderSheetButtons();
        $filter.addEventListener('input', renderSheetButtons);

        $sheets.addEventListener('click', (e) => {
            const btn = e.target.closest('.sheet-pill');
            if (!btn || !$sheets.contains(btn)) return;
            const name = btn.dataset.sheet;
            if (name) loadSheet(name);
        });

        $procSel.addEventListener('change', onProcessChange);
        $actSel.addEventListener('change', onActivityChange);   // <- recalcula riesgos
        $riskSel.addEventListener('change', renderCards);       // <- NUEVO
        $clearBtn.addEventListener('click', () => {
            $procSel.value = '__ALL__';
            fillSelect($actSel, allAct, '— Todas —');
            $actSel.value = '__ALL__';
            fillSelect($riskSel, allRisk, '— Todos —');        // <- NUEVO
            $riskSel.value = '__ALL__';
            renderCards();
        });

        if ($file) $file.addEventListener('change', handleManualFile);

        $status.textContent = `OK: cargado desde ${url}`;
        } catch (err) {
        console.error(err);
        $status.innerHTML = `No se pudo cargar automáticamente.<br><code>${err.message}</code>`;
        }
    }

    // === Fetch robusto ===
    async function tryFetchAny(paths) {
        const tried = [];
        for (const p of paths) {
        const url = encodeURI(p);
        try {
            const r = await fetch(url, { cache: 'no-store' });
            if (!r.ok) { tried.push(`${url} -> ${r.status}`); continue; }
            const ct = (r.headers.get('content-type') || '').toLowerCase();
            if (ct.includes('text/html')) { tried.push(`${url} -> content-type text/html`); continue; }
            const ab = await r.arrayBuffer();
            if (ab.byteLength < 50) { tried.push(`${url} -> archivo muy pequeño`); continue; }
            return { url, ab };
        } catch (e) { tried.push(`${url} -> ${e.message}`); }
        }
        throw new Error('Rutas probadas sin éxito:\n' + tried.join('\n'));
    }

    // === Hojas ===
    function renderSheetButtons() {
        const term = ($filter.value || '').trim().toLowerCase();
        const visible = allSheetNames.filter(n => {
        if (!VP_ALLOWED_SHEETS_NORM.has(normName(n))) return false;
        if (term && !n.toLowerCase().includes(term)) return false;
        return true;
        });

        $sheets.innerHTML = '';
        if (!visible.length) { $sheets.textContent = 'No hay hojas que coincidan con el filtro.'; return; }

        const frag = document.createDocumentFragment();
        visible.forEach(n => {
        const b = document.createElement('button');
        b.className = 'sheet-pill';
        b.type = 'button';
        b.textContent = n;
        b.dataset.sheet = n;
        frag.appendChild(b);
        });
        $sheets.appendChild(frag);
    }

    // === Cargar hoja y preparar datos D→R ===
    function loadSheet(sheetName) {
        if (!VP_ALLOWED_SHEETS_NORM.has(normName(sheetName))) return;

        const sh = wb?.Sheets?.[sheetName];
        if (!sh || !sh['!ref']) {
        $status.textContent = `Hoja no válida: ${sheetName}`;
        disableFilters(); $cards.innerHTML = ''; return;
        }

        const rng = XLSX.utils.decode_range(sh['!ref']);
        const lastRow = rng.e.r;
        const lastCol = rng.e.c;

        headersDR = buildLabels(sh, GROUP_ROW - 1, SUB_ROW - 1, COL_START, Math.min(COL_END, lastCol));

        const startR0 = DATA_START_ROW - 1;
        let lastNonEmpty = startR0 - 1;
        for (let r = lastRow; r >= startR0; r--) {
        if (rowHasAnyTextA1(sh, r, 0, lastCol)) { lastNonEmpty = r; break; }
        }

        rowsData = [];
        const riskSet = new Set(); // <- recolectar riesgos de la hoja

        if (lastNonEmpty >= startR0) {
        for (let r = startR0; r <= lastNonEmpty; r++) {
            const proc = readCell(sh, r, B_COL);
            const act  = readCell(sh, r, C_COL);

            const map = {};
            for (let c = COL_START; c <= Math.min(COL_END, lastCol); c++) {
              const label = headersDR[c - COL_START];
              map[label] = readCell(sh, r, c);
            }

            const risk = findRisk(map); // <- texto de la columna "Riesgos"
            if (risk) riskSet.add(risk);

            rowsData.push({ proc, act, map, risk });
        }
        }

        const pset = new Set(), aset = new Set();
        rowsData.forEach(o => { if (o.proc) pset.add(o.proc); if (o.act) aset.add(o.act); });
        allProc = Array.from(pset).sort((a,b)=>String(a).localeCompare(String(b),'es',{sensitivity:'base'}));
        allAct  = Array.from(aset).sort((a,b)=>String(a).localeCompare(String(b),'es',{sensitivity:'base'}));
        allRisk = Array.from(riskSet).sort((a,b)=>String(a).localeCompare(String(b),'es',{sensitivity:'base'})); // <- NUEVO

        fillSelect($procSel, allProc, '— Todas —');
        fillSelect($actSel, allAct, '— Todas —');
        fillSelect($riskSel, allRisk, '— Todos —'); // <- NUEVO
        enableFilters();

        $status.textContent = `Hoja cargada: ${sheetName}`;
        renderCards();
    }

    // === Etiquetas efectivas: fila 10 (grupos) + fila 11 (subencabezados) ===
    function buildLabels(sheet, groupR0, subR0, cStart, cEnd) {
        const labels = [];
        let currentProbIdx = 0;
        let activeProbIdx = 0;
        const seen = new Map();

        for (let c = cStart; c <= cEnd; c++) {
        const gRaw = readCell(sheet, groupR0, c); // fila 10
        const sRaw = readCell(sheet, subR0, c);   // fila 11
        const g = normalizeHeader(gRaw);
        const s = (sRaw || '').toString().trim();

        if (g === 'probabilidad') {
            currentProbIdx += 1;
            activeProbIdx = currentProbIdx;
        } else if (g) {
            activeProbIdx = 0; // otro grupo
        }

        if (activeProbIdx && (s === 'P' || s === 'C')) {
            labels.push(uniqueLabel(`Probabilidad #${activeProbIdx} (${s})`, seen));
            continue;
        }

        if (gRaw) { labels.push(uniqueLabel(gRaw, seen)); continue; }
        if (sRaw) { labels.push(uniqueLabel(sRaw, seen)); continue; }
        labels.push(excelColName(c));
        }
        return labels;
    }

    function uniqueLabel(label, seen) {
        const key = String(label || '').trim() || 'Columna';
        const n = (seen.get(key) || 0) + 1;
        seen.set(key, n);
        return n === 1 ? key : `${key} (${n})`;
    }

    function normalizeHeader(v){
        if (!v) return '';
        return String(v).trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    }

    // === Render tarjetas ===
    function renderCards() {
        const selP = $procSel.value || '__ALL__';
        const selA = $actSel.value  || '__ALL__';
        const selR = $riskSel.value || '__ALL__';   // <- NUEVO

        const filtered = rowsData.filter(o => {
          const okP = (selP === '__ALL__') || (o.proc === selP);
          const okA = (selA === '__ALL__') || (o.act === selA);
          const okR = (selR === '__ALL__') || (o.risk === selR); // exact match
          return okP && okA && okR;
        });

        $cards.innerHTML = '';
        if (!filtered.length) {
          $cards.innerHTML = '<div class="muted">No hay resultados con los filtros actuales.</div>';
          return;
        }

        const frag = document.createDocumentFragment();
        filtered.forEach(o => frag.appendChild(buildCard(o)));
        $cards.appendChild(frag);
    }

    function buildCard(row) {
        const { proc, act, map } = row;

        const get = (rx) => {
        for (const [k,v] of Object.entries(map)) if (rx.test(k)) return v || '';
        return '';
        };
        const getExact = (k) => (map[k] !== undefined ? map[k] : '');

        const peligros       = get(/peligros?$/i);
        const riesgos        = get(/riesgos?$/i);
        const medidasControl = get(/medidas?\s*de\s*control/i);
        const responsabilidad = get(/responsabil/i);
        const frecuencia     = get(/frecuencia/i);

        // Probabilidades y VR
        const groups = [];
        headersDR.forEach((lab, i) => {
        const m = lab.match(/^Probabilidad #(\d+)\s*\((P|C)\)$/i);
        if (m) {
            const idx = Number(m[1]);
            const P = getExact(`Probabilidad #${idx} (P)`);
            const C = getExact(`Probabilidad #${idx} (C)`);
            const vr = findNearestVR(i+1, map);
            if (!groups.find(g => g.idx === idx)) groups.push({ idx, p: P || '', c: C || '', vr });
        }
        });
        if (!groups.length){
        const p = get(/\(p\)\s*$/i);
        const c = get(/\(c\)\s*$/i);
        const vr= get(/valorizaci[oó]n.*riesgo/i);
        if (p || c || vr) groups.push({ idx: 1, p, c, vr });
        }

        const actRutinaria   = truthy(getExact('Actividad Rutinaria'));
        const actNoRutinaria = truthy(getExact('Actividad No Rutinaria')) || truthy(getExact('Actividad NO Rutinaria'));
        const personalInt    = truthy(getExact('Personal Interno'));
        const personalExt    = truthy(getExact('Personal Externo'));

        const card = document.createElement('article');
        card.className = 'risk-card';

        const top = document.createElement('div');
        top.className = 'rc-top';
        top.innerHTML = `
        <span class="chip chip-proc">Proceso: ${esc(proc || '—')}</span>
        <span class="chip chip-act">Actividad/Infra.: ${esc(act || '—')}</span>
        ${actRutinaria   ? `<span class="chip chip-flag">Rutinaria</span>` : ''}
        ${actNoRutinaria ? `<span class="chip chip-flag">No rutinaria</span>` : ''}
        ${personalInt    ? `<span class="chip chip-person">Personal interno</span>` : ''}
        ${personalExt    ? `<span class="chip chip-person">Personal externo</span>` : ''}
        `;
        card.appendChild(top);

        const pr = document.createElement('div');
        pr.className = 'rc-section';
        pr.innerHTML = `
        <div class="rc-grid">
            <div><div class="rc-title">Peligros</div><div class="rc-value">${esc(peligros || '—')}</div></div>
            <div><div class="rc-title">Riesgos</div><div class="rc-value">${esc(riesgos || '—')}</div></div>
        </div>`;
        card.appendChild(pr);

        if (groups.length) {
        const metrics = document.createElement('div');
        metrics.className = 'metrics';
        groups.sort((a,b)=>a.idx-b.idx).forEach(g => {
            const m = document.createElement('div');
            m.className = 'metric';
            const title = (g.idx === 1) ? 'Valorización del Riesgo' : 'Revalorización del Riesgo';

            // Normalizar números y calcular VR si falta
            const pNum = toNumber(g.p);
            const cNum = toNumber(g.c);
            let vrNum  = toNumber(g.vr);
            if (!Number.isFinite(vrNum) && Number.isFinite(pNum) && Number.isFinite(cNum)) {
              vrNum = pNum * cNum;
            }

            const { cls, label } = riskCategory(vrNum); // cls = score--low|medium|high
            const vrText = Number.isFinite(vrNum) ? String(vrNum) : (g.vr || '—');

            m.innerHTML = `
            <h4>${title}</h4>
            <div class="badges">
                <span class="badge">P: ${esc(g.p || '—')}</span>
                <span class="badge">C: ${esc(g.c || '—')}</span>
            </div>
            <span class="score ${cls}">VR: ${esc(vrText)} ${label ? '— ' + label : ''}</span>`;
            metrics.appendChild(m);
        });
        card.appendChild(metrics);
        }

        const controls = document.createElement('div');
        controls.className = 'controls';
        controls.innerHTML = `<div class="rc-title">Medidas de Control</div>${asBullets(medidasControl)}`;
        card.appendChild(controls);

        const foot = document.createElement('div');
        foot.className = 'rc-top';
        foot.innerHTML = `
        <span class="chip">Responsabilidad: ${esc(responsabilidad || '—')}</span>
        <span class="chip">Frecuencia: ${esc(frecuencia || '—')}</span>`;
        card.appendChild(foot);

        return card;
    }

    // Encontrar el texto de "Riesgos" en el mapa de columnas D→R
    function findRisk(map){
      for (const [k,v] of Object.entries(map)){
        if (/riesgos?$/i.test(k)) return String(v || '').trim();
      }
      return '';
    }

    function riskCategory(vrNum){
        if (!Number.isFinite(vrNum)) return { cls:'', label:'' };
        if (vrNum >= 10) return { cls:'score--high',   label:'(A) Alto'  };
        if (vrNum >= 5)  return { cls:'score--medium', label:'(M) Medio' };
        if (vrNum >= 1)  return { cls:'score--low',    label:'(B) Bajo'  };
        return { cls:'', label:'' };
    }

    function toNumber(v){
        if (v === undefined || v === null) return NaN;
        const s = String(v).trim().replace(',', '.');
        const n = parseFloat(s);
        return Number.isFinite(n) ? n : NaN;
    }

    function findNearestVR(startIdxHeaders, map){
        const rx = /valorizaci[oó]n.*riesgo/i;
        for (let i = startIdxHeaders; i < headersDR.length; i++) {
            const k = headersDR[i];
            if (rx.test(k)) return map[k] || '';
        }
        for (const [k,v] of Object.entries(map)) if (rx.test(k)) return v || '';
        return '';
    }

    function asBullets(text){
        const t = (text || '').replace(/\r/g, '').trim();
        if (!t) return `<div class="rc-value">—</div>`;

        const items = t
            .split(/\n|;/)                     // separa por salto de línea o ;
            .map(s => s.trim())
            // elimina viñetas o guiones que vengan escritos en el texto: •, ·, -, *, —, • (u2022), ● (u25CF)
            .map(s => s.replace(/^[\s\u2022\u25CF•·\-\*\—–]+/, ''))
            // elimina numeraciones tipo "1) ", "2. ", "(3) "
            .map(s => s.replace(/^\(?\d+[\)\.\-]\s*/, ''))
            .filter(Boolean);

        if (!items.length) return `<div class="rc-value">${esc(t)}</div>`;
        return `<ul class="clean-list">${items.map(s => `<li>${esc(s)}</li>`).join('')}</ul>`;
    }


    // === Lectura A1 ===
    function readCell(sheet, r0, c0){
        const addr = XLSX.utils.encode_cell({ r:r0, c:c0 });
        const cell = sheet[addr];
        const v = cell ? cell.v : '';
        return v === undefined || v === null ? '' : String(v).trim();
    }
    function rowHasAnyTextA1(sheet, r0, cStart0, cEnd0){
        for (let c = cStart0; c <= cEnd0; c++) if (readCell(sheet, r0, c) !== '') return true;
        return false;
    }

    // === Filtros en cascada ===
    function onProcessChange(){
        const sel = $procSel.value || '__ALL__';
        // actividades
        let acts;
        if (sel === '__ALL__') {
          acts = allAct.slice();
        } else {
          const set = new Set();
          rowsData.forEach(o => { if (o.proc === sel && o.act) set.add(o.act); });
          acts = Array.from(set).sort((a,b)=>String(a).localeCompare(String(b),'es',{sensitivity:'base'}));
        }
        const prevA = $actSel.value;
        fillSelect($actSel, acts, '— Todas —');
        $actSel.value = (prevA && (prevA === '__ALL__' || acts.includes(prevA))) ? prevA : '__ALL__';

        // riesgos (dependiente de proceso y actividad actual)
        recalcRiskOptions();
        renderCards();
    }

    function onActivityChange(){
        // al cambiar actividad, recalculamos riesgos disponibles con los dos filtros
        recalcRiskOptions();
        renderCards();
    }

    function recalcRiskOptions(){
        const selP = $procSel.value || '__ALL__';
        const selA = $actSel.value  || '__ALL__';
        const set = new Set();
        rowsData.forEach(o => {
          const okP = (selP === '__ALL__') || (o.proc === selP);
          const okA = (selA === '__ALL__') || (o.act === selA);
          if (okP && okA && o.risk) set.add(o.risk);
        });
        const risks = Array.from(set).sort((a,b)=>String(a).localeCompare(String(b),'es',{sensitivity:'base'}));
        const prevR = $riskSel.value;
        fillSelect($riskSel, risks, '— Todos —');
        $riskSel.value = (prevR && (prevR === '__ALL__' || risks.includes(prevR))) ? prevR : '__ALL__';
    }

    function fillSelect(sel, values, placeholder){
        sel.innerHTML = '';
        const all = document.createElement('option');
        all.value='__ALL__'; all.textContent = placeholder || '— Todas —';
        sel.appendChild(all);
        values.forEach(v => {
        const o = document.createElement('option');
        o.value = v; o.textContent = v;
        sel.appendChild(o);
        });
    }
    function enableFilters(){ $procSel.disabled=false; $actSel.disabled=false; $riskSel.disabled=false; $clearBtn.disabled=false; }
    function disableFilters(){
        $procSel.disabled=true; $actSel.disabled=true; $riskSel.disabled=true; $clearBtn.disabled=true;
        $procSel.innerHTML='<option value="__ALL__">— Todas —</option>';
        $actSel.innerHTML='<option value="__ALL__">— Todas —</option>';
        $riskSel.innerHTML='<option value="__ALL__">— Todos —</option>';
    }

    // === Utils ===
    function normName(name){
        return String(name||'')
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .trim().toLowerCase().replace(/\s+/g,' ');
    }
    function excelColName(idx){
        let s='', n=idx;
        do{ s=String.fromCharCode((n%26)+65)+s; n=Math.floor(n/26)-1; }while(n>=0);
        return s;
    }
    function esc(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
    function truthy(v){ const s=String(v||'').trim(); return s!=='' && s!=='0' && s.toLowerCase()!=='no'; }

    // === Fallback manual ===
    async function handleManualFile(e){
        const f = e.target.files?.[0]; if (!f) return;
        try{
        const ab = await f.arrayBuffer();
        wb = XLSX.read(ab, { type:'array' });
        allSheetNames = wb.SheetNames.slice();
        headersDR=[]; rowsData=[]; allProc=[]; allAct=[]; allRisk=[];
        disableFilters(); $filter.value=''; $cards.innerHTML='';
        renderSheetButtons();
        $status.textContent = `Cargado manualmente: ${f.name}`;
        }catch(err){
        console.error(err);
        $status.textContent = 'Error leyendo el archivo: ' + err.message;
        }
    }
})();
