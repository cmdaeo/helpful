// ==UserScript==
// @name         Notion TXT Exporter
// @namespace    https://github.com/cmdaeo/helpful
// @version      1.0
// @description  Fast table export - stops when no more rows appear
// @author       cmdaeo
// @license      MIT
// @match        https://www.notion.so/*
// @match        https://www.notion.site/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const SCROLL_BY = 400;
    const POLL_TIME = 100;
    const MAX_TICK = 2000;
    const BAIL_AFTER = 3;

    let busy = false;
    let rows = new Map();
    let headers = ["Name", "Project type", "Main category", "Description"];

    function makeBtn() {
        if (document.getElementById('grabber')) return;
        let btn = document.createElement('button');
        btn.id = 'grabber';
        btn.textContent = 'Export';
        Object.assign(btn.style, {
            position: 'fixed', bottom: '20px', right: '20px', zIndex: 99999,
            padding: '10px 20px', background: '#0f0f0f', color: 'white',
            border: '1px solid #333', borderRadius: '6px', cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)', fontWeight: 600
        });
        btn.onclick = go;
        document.body.appendChild(btn);
    }

    function findScrollThing() {
        return document.querySelector(".notion-frame .notion-scroller") ||
               document.querySelector(".notion-table-view-scroller") ||
               document.querySelector("main");
    }

    function getHeaders() {
        let row = document.querySelector('.notion-table-view-header-row');
        if (!row) return;
        let texts = [...row.querySelectorAll('div')]
            .map(d => d.innerText?.trim())
            .filter(t => t && t.length > 1 && !['+', 'New'].includes(t));
        if (texts.length >= 3) headers = [...new Set(texts)].slice(0, 4);
    }

    function grabVisible() {
        let newOnes = 0;
        document.querySelectorAll('.notion-collection-item').forEach(item => {
            let id = item.getAttribute('data-block-id');
            if (!id || rows.has(id)) return;

            let cells = item.querySelector('.notion-table-view-row')?.querySelectorAll('.notion-table-view-cell');
            if (!cells) return;

            let data = Array.from(cells).slice(0, 4).map(c =>
                c.innerText.replace(/[\r\n]+/g, ' ').trim()
            );

            if (data.some(d => d)) {
                rows.set(id, data);
                newOnes++;
            }
        });
        return newOnes > 0;
    }

    async function go() {
        if (busy) return;

        let scroller = findScrollThing();
        if (!scroller) return alert("No table? Click inside it first.");

        busy = true;
        rows.clear();
        getHeaders();

        let btn = document.getElementById('grabber');
        btn.style.background = '#e69d00';
        btn.textContent = 'Going...';

        // flash the scroller orange
        let oldBorder = scroller.style.border;
        scroller.style.border = '2px solid #e69d00';

        let emptyCount = 0;
        let lastTop = 0;

        while (true) {
            let foundNew = grabVisible();
            btn.textContent = `Got ${rows.size}`;

            let top = Math.ceil(scroller.scrollTop);
            let atBottom = top + scroller.clientHeight >= scroller.scrollHeight - 2;

            if (!foundNew) emptyCount++;
            else emptyCount = 0;

            // done if at bottom + 2 empty scans
            if (atBottom && emptyCount >= 2) break;

            scroller.scrollBy({top: SCROLL_BY, behavior: 'auto'});

            // quick poll loop
            let waited = 0;
            while (waited < MAX_TICK) {
                await new Promise(r => setTimeout(r, POLL_TIME));
                waited += POLL_TIME;

                if (grabVisible()) {
                    emptyCount = 0;
                    break;
                }

                if (Math.ceil(scroller.scrollTop) > top + 50) break;
            }

            lastTop = top;
        }

        scroller.style.border = oldBorder;
        btn.textContent = 'Saving...';
        btn.style.background = '#2eaadc';
        saveIt();

        setTimeout(() => {
            busy = false;
            btn.textContent = 'Grab All';
            btn.style.background = '#0f0f0f';
        }, 1500);
    }

    function saveIt() {
        if (rows.size === 0) return alert("Nothing grabbed!");

        let txt = headers.join(', ') + '\n';
        rows.forEach(row => {
            let line = row.map(cell =>
                /[";,&]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell
            ).join(', ');
            txt += line + '\n';
        });

        let blob = new Blob([txt], {type: 'text/plain'});
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = `notion-${new Date().toISOString().slice(0,10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // restart button if page changes
    setInterval(makeBtn, 1000);
})();
