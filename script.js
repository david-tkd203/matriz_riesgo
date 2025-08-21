// === Configuración ===
const FILENAME = 'matriz_riesgos_supermercados_2025.xlsx';

// Hojas permitidas
const ALLOWED_SHEETS_RAW = ['Bodega', 'Carnicería', 'Lineal de Cajas'];
const ALLOWED_SHEETS_NORM = new Set(ALLOWED_SHEETS_RAW.map(normName));

// Lectura desde fila 12 (1-based) ⇒ índice 11 (0-based)
const DATA_START_ROW = 12;          // B12/C12 en adelante
const HEADER_ROW_INDEX = 11 - 1;    // fila 11 como encabezado visual si existe

// Índices de columnas (0-based)
const B_INDEX = 1; // Procesos
const C_INDEX = 2; // Actividad / Infraestructura

// Rutas candidatas
const CANDIDATE_PATHS = ['/' + FILENAME, './' + FILENAME];

// === DOM ===
const $status  = document.getElementById('status');
const $sheets  = document.getElementById('sheets');
const $preview = document.getElementById('preview');

const $filterInput = document.getElementById('filter-input');

const $processFilter = document.getElementById('process-filter');
const $activityFilter = document.getElementById('activity-filter');
const $clearBtn = document.getElementById('clear-filters');
const $file = document.getElementById('file-fallback');

// === Estado ===
let workbook = null;
let allSheetNames = [];
let currentSheetName = null;

let currentHeader = [];
let currentRows = [];
let allProcessValues = [];
let allActivityValues = [];

// Comparador de texto local para ordenar correctamente los valores en español
function localeCmp(a, b) {
    return String(a).localeCompare(String(b), 'es', { sensitivity: 'base' });
}

// === Inicio ===
// SOLO corre si existe la UI de tabla:
if (
    document.getElementById('filter-input') &&
    document.getElementById('sheets') &&
    document.getElementById('preview')
    ) {
    init();
    } else {
    console.info('[script.js] UI de tabla no está en este index; omito init().');
}


async function init() {
    try {
        const { url, arrayBuffer } = await tryFetchAny(CANDIDATE_PATHS);
        workbook = XLSX.read(arrayBuffer, { type: 'array' });
        allSheetNames = workbook.SheetNames.slice();

        renderSheetButtons();
        $filterInput.addEventListener('input', renderSheetButtons);

        // Delegación de eventos para CLIC en cualquier .sheet-pill (botón hoja)
        $sheets.addEventListener('click', (e) => {
        const btn = e.target.closest('.sheet-pill');
        if (!btn || !$sheets.contains(btn)) return;
        const sheetName = btn.dataset.sheet;
        if (sheetName) {
            loadSheet(sheetName);
        }
        });

        // Filtros por columnas
        $processFilter.addEventListener('change', onProcessChange);
        $activityFilter.addEventListener('change', applyRowFiltersAndRender);
        $clearBtn.addEventListener('click', clearRowFilters);

        // Fallback de archivo local
        $file.addEventListener('change', handleManualFile);

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
        const resp = await fetch(url, { cache: 'no-store' });
        if (!resp.ok) { tried.push(`${url} -> ${resp.status}`); continue; }
        const ct = (resp.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('text/html')) { tried.push(`${url} -> content-type text/html`); continue; }
        const ab = await resp.arrayBuffer();
        if (ab.byteLength < 50) { tried.push(`${url} -> archivo demasiado pequeño`); continue; }
        return { url, arrayBuffer: ab };
        } catch (e) {
        tried.push(`${url} -> ${e.message}`);
        }
    }
    throw new Error('Rutas probadas sin éxito:\n' + tried.join('\n'));
}

// === Botones de hojas (solo permitidas) + filtro por nombre ===
function renderSheetButtons() {
    const term = ($filterInput.value || '').trim().toLowerCase();
    const visible = allSheetNames.filter(name => {
        if (!ALLOWED_SHEETS_NORM.has(normName(name))) return false;
        if (term && !name.toLowerCase().includes(term)) return false;
        return true;
    });

    $sheets.innerHTML = '';
    if (!visible.length) {
        $sheets.textContent = 'No hay hojas que coincidan con el filtro.';
        return;
    }

    const frag = document.createDocumentFragment();
    visible.forEach(name => {
        const btn = document.createElement('button');
        btn.className = 'sheet-pill';
        btn.type = 'button';
        btn.textContent = name;
        btn.dataset.sheet = name;           // <- clave para la delegación de clic
        btn.setAttribute('aria-label', `Abrir hoja ${name}`);
        frag.appendChild(btn);
    });
    $sheets.appendChild(frag);
}

// === Cargar hoja y preparar filtros ===
function loadSheet(sheetName) {
    if (!ALLOWED_SHEETS_NORM.has(normName(sheetName))) return;

    currentSheetName = sheetName;
    const sheet = workbook?.Sheets?.[sheetName];
    if (!sheet) {
        $status.textContent = `Hoja no encontrada: ${sheetName}`;
        disableRowFilters();
        $preview.innerHTML = '';
        return;
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false }) || [];
    if (!rows.length) {
        $status.textContent = `Hoja vacía: ${sheetName}`;
        disableRowFilters();
        $preview.innerHTML = '';
        return;
    }

    // Encabezado visual desde fila 11 si existe
    currentHeader = rows[HEADER_ROW_INDEX] || [];

    // Datos desde fila 12 hasta última fila no vacía
    currentRows = sliceDataUntilLastNonEmpty(rows, DATA_START_ROW - 1);

    // Conjuntos globales (antes del filtro en cascada)
    const procSet = new Set();
    const actSet  = new Set();
    for (const r of currentRows) {
        const proc = normCell(r[B_INDEX]);
        const act  = normCell(r[C_INDEX]);
        if (proc) procSet.add(proc);
        if (act)  actSet.add(act);
    }
    allProcessValues  = Array.from(procSet).sort(localeCmp);
    allActivityValues = Array.from(actSet).sort(localeCmp);

    // Poblar selects
    fillSelect($processFilter, allProcessValues, '— Todas —');
    fillSelect($activityFilter, allActivityValues, '— Todas —');

    enableRowFilters();
    $status.textContent = `Hoja cargada: ${sheetName}`;
    applyRowFiltersAndRender();
}

// === Filtro en cascada: Proceso → Actividad ===
function onProcessChange() {
    const selProc = $processFilter.value || '__ALL__';
    let candidateActs = [];

    if (selProc === '__ALL__') {
        candidateActs = allActivityValues.slice();
    } else {
        const actSet = new Set();
        for (const r of currentRows) {
        const proc = normCell(r[B_INDEX]);
        const act  = normCell(r[C_INDEX]);
        if (proc === selProc && act) actSet.add(act);
        }
        candidateActs = Array.from(actSet).sort(localeCmp);
    }

    const prevAct = $activityFilter.value;
    fillSelect($activityFilter, candidateActs, '— Todas —');
    if (prevAct && (prevAct === '__ALL__' || candidateActs.includes(prevAct))) {
        $activityFilter.value = prevAct;
    } else {
        $activityFilter.value = '__ALL__';
    }

    applyRowFiltersAndRender();
}

// === Aplicar filtros y render ===
function applyRowFiltersAndRender() {
    if (!currentRows.length) {
        $preview.textContent = 'Sin datos para mostrar.';
        return;
    }

    const selProc = $processFilter.value || '__ALL__';
    const selAct  = $activityFilter.value || '__ALL__';

    const filtered = currentRows.filter(r => {
        const proc = normCell(r[B_INDEX]);
        const act  = normCell(r[C_INDEX]);
        const okProc = (selProc === '__ALL__') || (proc === selProc);
        const okAct  = (selAct  === '__ALL__') || (act  === selAct);
        return okProc && okAct;
    });

    renderRowsAsTable(currentHeader, filtered);
}

function clearRowFilters() {
    $processFilter.value = '__ALL__';
    fillSelect($activityFilter, allActivityValues, '— Todas —');
    $activityFilter.value = '__ALL__';
    applyRowFiltersAndRender();
}

// === Utilidades ===
function sliceDataUntilLastNonEmpty(rows, startIdx) {
    let last = startIdx - 1;
    for (let i = rows.length - 1; i >= startIdx; i--) {
        const r = rows[i] || [];
        if (rowHasAnyText(r)) { last = i; break; }
    }
    if (last < startIdx) return [];
    return rows.slice(startIdx, last + 1);
}

function rowHasAnyText(r) {
    for (let i = 0; i < r.length; i++) {
        if (normCell(r[i]) !== '') return true;
    }
    return false;
}

function normCell(v) {
    if (v === undefined || v === null) return '';
    const s = String(v).trim();
    return s === '' ? '' : s;
}

function fillSelect($select, values, placeholder) {
    $select.innerHTML = '';
    const optAll = document.createElement('option');
    optAll.value = '__ALL__';
    optAll.textContent = placeholder || '— Todas —';
    $select.appendChild(optAll);

    values.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        $select.appendChild(opt);
    });
}

function enableRowFilters() {
    $processFilter.disabled = false;
    $activityFilter.disabled = false;
    $clearBtn.disabled = false;
}
function disableRowFilters() {
    $processFilter.disabled = true;
    $activityFilter.disabled = true;
    $clearBtn.disabled = true;
    $processFilter.innerHTML = '<option value="__ALL__">— Todas —</option>';
    $activityFilter.innerHTML = '<option value="__ALL__">— Todas —</option>';
}

function renderRowsAsTable(headerRow, dataRows) {
    const table = document.createElement('table');

    const colCount = Math.max(
        headerRow?.length || 0,
        ...dataRows.map(r => r.length)
    );

    // THEAD
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    for (let i = 0; i < colCount; i++) {
        const th = document.createElement('th');
        const label = headerRow?.[i] !== undefined && headerRow[i] !== '' ? String(headerRow[i]) : excelColName(i);
        th.textContent = label;
        trh.appendChild(th);
    }
    thead.appendChild(trh);
    table.appendChild(thead);

    // TBODY
    const tbody = document.createElement('tbody');
    dataRows.forEach(r => {
        const tr = document.createElement('tr');
        for (let i = 0; i < colCount; i++) {
        const td = document.createElement('td');
        td.textContent = r[i] !== undefined ? String(r[i]) : '';
        tr.appendChild(td);
        }
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    $preview.innerHTML = '';
    $preview.appendChild(table);
}

function excelColName(idx) {
    let s = '';
    let n = idx;
    do {
        s = String.fromCharCode((n % 26) + 65) + s;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return s;
}

function normName(name) {
    return String(name || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

async function handleManualFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
        const ab = await f.arrayBuffer();
        workbook = XLSX.read(ab, { type: 'array' });
        allSheetNames = workbook.SheetNames.slice();

        currentSheetName = null;
        currentHeader = [];
        currentRows = [];
        allProcessValues = [];
        allActivityValues = [];
        disableRowFilters();
        $filterInput.value = '';

        renderSheetButtons();
        $status.textContent = `Cargado manualmente: ${f.name}`;
        $preview.innerHTML = '';
    } catch (err) {
        console.error(err);
        $status.textContent = 'Error leyendo el archivo: ' + err.message;
    }
}
