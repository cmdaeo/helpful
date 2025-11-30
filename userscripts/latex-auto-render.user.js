// ==UserScript==
// @name         Latex Auto Render
// @description  Force-renders LaTeX math ($...$) that often fails to display in AI chats like ChatGPT, Claude, and Perplexity.
// @namespace    https://github.com/cmdaeo
// @version      1.0
// @author       cmdaeo
// @license      MIT
// @match        *://*/*
// @grant        none
// @homepageURL  https://github.com/cmdaeo/helpful
// @supportURL   https://github.com/cmdaeo/helpful/issues
// @updateURL    https://raw.githubusercontent.com/cmdaeo/helpful/main/userscripts/latex-auto-render.user.js
// @downloadURL  https://raw.githubusercontent.com/cmdaeo/helpful/main/userscripts/latex-auto-render.user.js
// ==/UserScript==

(function() {
    'use strict';

    const KATEX_VER = '0.16.9';
    const BASE_URL = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VER}/dist`;

    // quick helpers to inject resources
    const addCSS = (url) => {
        const l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = url;
        l.crossOrigin = 'anonymous';
        document.head.appendChild(l);
    };

    const addScript = (url, cb) => {
        const s = document.createElement('script');
        s.src = url;
        s.crossOrigin = 'anonymous';
        s.onload = cb;
        document.head.appendChild(s);
    };

    const renderMath = () => {
        if (!window.renderMathInElement) return;

        // force render on single dollar signs
        window.renderMathInElement(document.body, {
            delimiters: [
                {left: "$$", right: "$$", display: true},
                {left: "$", right: "$", display: false}, // AI chats
                {left: "\\(", right: "\\)", display: false},
                {left: "\\[", right: "\\]", display: true}
            ],
            ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
            throwOnError: false
        });
    };

    // load libs and start
    addCSS(`${BASE_URL}/katex.min.css`);

    addScript(`${BASE_URL}/katex.min.js`, () => {
        // need auto-render extension too
        addScript(`${BASE_URL}/contrib/auto-render.min.js`, () => {

            renderMath();

            // watch for changes (streaming responses)
            let timer;
            const observer = new MutationObserver(() => {
                clearTimeout(timer);
                timer = setTimeout(renderMath, 500); // debounce
            });

            observer.observe(document.body, { childList: true, subtree: true });
        });
    });

})();
