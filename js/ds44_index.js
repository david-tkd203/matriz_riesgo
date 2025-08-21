// ds44_index.js
(() => {
    'use strict';

    // === Datos del índice DS44 ===
    // Cada item con "key" enlaza a file.html?k=<key>&title=<title>
    const DS44_SECTIONS = [
        {
        title: '1.1 Política SST',
        items: [
            { key: '1.1.1 Modelo',                 title: '1.1.1 Modelo' },
            { key: '1.1.2 Política SST',           title: '1.1.2 Política SST' },
            { key: '1.1.3 Registros de gestión',   title: '1.1.3 Registros de gestión' },
        ]
        },
        {
        title: '1.2 Organización de SST',
        items: [
            { key: '1.2.1 Modelo',                 title: '1.2.1 Modelo' },
            { key: '1.2.2 Organización de SST',    title: '1.2.2 Organización de SST' },
            { key: '1.2.3 Registros de gestión',   title: '1.2.3 Registros de gestión' },
        ]
        },
        {
        title: '1.3 Autoevaluación SST',
        items: [
            { key: '1.3.1 Modelo',                 title: '1.3.1 Modelo' },
            { key: '1.3.2 Evaluación legal SST',   title: '1.3.2 Evaluación legal SST' },
            { key: '1.3.3 Registros de gestión',   title: '1.3.3 Registros de gestión' },
        ]
        },
        {
        title: '1.4 Matriz IPER',
        items: [
            { key: '1.4.1 Modelo',                 title: '1.4.1 Modelo' },
            { key: '1.4.2 Diagnóstico inicial SST',title: '1.4.2 Diagnóstico inicial SST' },
            { key: '1.4.3 Registros de gestión',   title: '1.4.3 Registros de gestión' },
        ]
        },
        {
        title: '1.5 Programa de Trabajo SST',
        items: [
            { key: '1.5.1 Modelo',                 title: '1.5.1 Modelo' },
            { key: '1.5.2 Programa de Trabajo SST',title: '1.5.2 Programa de Trabajo SST' },
            { key: '1.5.3 Registros de gestión',   title: '1.5.3 Registros de gestión' },
        ]
        },
        {
        title: '1.6 Investigación Incidentes y EP',
        items: [
            { key: '1.6.1 Modelo',                 title: '1.6.1 Modelo' },
            { key: '1.6.2 Investigación incidentes, accidentes y ep', title: '1.6.2 Investigación incidentes, accidentes y EP' },
            { key: '1.6.3 Registros de gestión',   title: '1.6.3 Registros de gestión' },
        ]
        },
        {
        title: '1.7 Gestión de EPP',
        items: [
            { key: '1.7.1 Modelo',                 title: '1.7.1 Modelo' },
            { key: '1.7.2 Gestión de EPP',         title: '1.7.2 Gestión de EPP' },
            { key: '1.7.3 Registros de gestión',   title: '1.7.3 Registros de gestión' },
        ]
        },
        {
        title: '1.8 Capacitación e información',
        items: [
            { key: '1.8.1 Modelo',                 title: '1.8.1 Modelo' },
            { key: '1.8.2 Información, formación, consulta, comunicación_', title: '1.8.2 Información, formación, consulta, comunicación' },
            { key: '1.8.3 Registros de gestión',   title: '1.8.3 Registros de gestión' },
        ]
        },
        {
        title: '1.9 Gestión de riesgos y desastres',
        items: [
            { key: '1.9.1 Modelo',                 title: '1.9.1 Modelo' },
            { key: '1.9.2 PGRD',                   title: '1.9.2 PGRD' },
            { key: '1.9.3 Registros de gestión',   title: '1.9.3 Registros de gestión' },
        ]
        },
        {
        title: '1.10  Gestión de CPHS',
        items: [
            { key: '1.10.1 Modelo',                title: '1.10.1 Modelo' },
            { key: '1.10.2 Gestión de CPHS',       title: '1.10.2 Gestión de CPHS' },
            { key: '1.10.3 Registros de gestión',  title: '1.10.3 Registros de gestión' },
        ]
        },
        {
        title: '1.11 Indicadores de gestión',
        items: [
            { key: '1.11.1 Modelo',                title: '1.11.1 Modelo' },
            { key: '1.11.2 Gestión de indicadores SST', title: '1.11.2 Gestión de indicadores SST' },
            { key: '1.11.3 Registros de gestión',  title: '1.11.3 Registros de gestión' },
        ]
        },
        {
        title: '1.12 Reglamento interno',
        items: [
            { key: '1.12.1 Modelo',                title: '1.12.1 Modelo' },
            { key: '1.12.2 Reglamento',            title: '1.12.2 Reglamento' },
            { key: '1.12.3 Registros de gestión',  title: '1.12.3 Registros de gestión' },
        ]
        },
        {
        title: '1.13 Mapa de riesgos',
        items: [
            { key: '1.13.1 Modelo',                title: '1.13.1 Modelo' },
            { key: '1.13.2 Mapa de riesgos',       title: '1.13.2 Mapa de riesgos' },
            { key: '1.13.3 Registros de gestión',  title: '1.13.3 Registros de gestión' },
            // Subcarpetas ilustrativas (van a file.html igualmente)
            { key: '1.13.1 Modelo/Simbologia mapas de riesgos 2025', title: 'Simbología mapas de riesgos 2025' },
            { key: '1.13.1 Modelo/Simbologia mapas de riesgos 2025/Musculo esqueletico', title: 'Simbología • Músculo esquelético' },
            { key: '1.13.1 Modelo/Simbologia mapas de riesgos 2025/Psicosocial', title: 'Simbología • Psicosocial' },
            { key: '1.13.1 Modelo/Simbologia mapas de riesgos 2025/Riesgos Higienicos', title: 'Simbología • Riesgos Higiénicos' },
            { key: '1.13.1 Modelo/Simbologia mapas de riesgos 2025/Riesgos Seguridad',  title: 'Simbología • Riesgos Seguridad' },
        ]
        },
        {
        title: '1.14 Delegado',
        items: [
            { key: '1.14.1 Modelo',                title: '1.14.1 Modelo' },
            { key: '1.14.2 Delegado',              title: '1.14.2 Delegado' },
            { key: '1.14.3 Registros',             title: '1.14.3 Registros' },
        ]
        },
        {
        title: '1.15 Encargado',
        items: [
            { key: '1.15.1 Modelo',                title: '1.15.1 Modelo' },
            { key: '1.15.2 Encargado',             title: '1.15.2 Encargado' },
            { key: '1.15.3 Registro',              title: '1.15.3 Registro' },
        ]
        },
        {
        title: '1.16 Seguimiento y mejoramiento',
        items: [
            { key: '1.16.1 Modelo',                title: '1.16.1 Modelo' },
            { key: '1.16.2 Seguimiento y mejoramiento SST', title: '1.16.2 Seguimiento y mejoramiento SST' },
            { key: '1.16.3 Registros de gestión',  title: '1.16.3 Registros de gestión' },
        ]
        }
    ];

    // === Render ===
    function init() {
        const mount = document.getElementById('ds44-toc');
        if (!mount) return;

        const frag = document.createDocumentFragment();

        DS44_SECTIONS.forEach(section => {
        const card = document.createElement('section');
        card.className = 'toc-section';

        // Título de capítulo (p. ej., 1.1 Política SST)
        const h = document.createElement('h4');
        h.textContent = section.title;
        card.appendChild(h);

        // Lista de links (cada uno abre file.html)
        const ul = document.createElement('ul');
        ul.className = 'toc-list';

        section.items.forEach(it => {
            const li = document.createElement('li');
            const a  = document.createElement('a');
            a.className = 'folder-link';
            a.href = `file.html?k=${encodeURIComponent(it.key)}&title=${encodeURIComponent(it.title)}`;
            a.innerHTML = `${folderSVG()} <span>${escapeHTML(it.title)}</span>`;
            li.appendChild(a);
            ul.appendChild(li);
        });

        card.appendChild(ul);
        frag.appendChild(card);
        });

        mount.appendChild(frag);
    }

    // Icono carpeta (inline SVG para no depender de assets externos)
    function folderSVG() {
        return `
        <svg class="folder-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#F9A41E" d="M10 4l2 2h6a2 2 0 012 2v1H4V6a2 2 0 012-2h4z"/>
            <path fill="#FFC766" d="M4 9h16a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V9z"/>
            <path fill="rgba(0,0,0,.08)" d="M4 9h16v1H4z"/>
        </svg>
        `;
    }

    function escapeHTML(s) {
        return String(s || '').replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
        }[m]));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
