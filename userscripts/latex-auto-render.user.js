// ==UserScript==
// @name         Latex Auto Render
// @description  Force-renders LaTeX math ($...$) that fails to display in AI chats like ChatGPT, Claude, and Perplexity.
// @namespace    https://github.com/cmdaeo
// @version      1.1
// @author       cmdaeo
// @license      MIT
// @match        *://*.perplexity.ai/*
// @match        *://*.chatgpt.com/*
// @match        *://chat.openai.com/*
// @match        *://claude.ai/*
// @match        *://chat.mistral.ai/*
// @match        *://gemini.google.com/*
// @match        *://copilot.microsoft.com/*
// @match        *://chat.deepseek.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const KATEX_VER = '0.16.28';
    const BASE_URL = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VER}/dist`;

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

    const KATEX_OPTIONS = {
        delimiters: [
            {left: "$$", right: "$$", display: true},
            {left: "$", right: "$", display: false},
            {left: "\\(", right: "\\)", display: false},
            {left: "\\[", right: "\\]", display: true}
        ],
        ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option"],
        throwOnError: false
    };

    const dirtyElements = new Set();
    let renderTimer = null;

    const flushRenderQueue = () => {
        if (!window.renderMathInElement) return;

        for (const element of dirtyElements) {

            if (document.body.contains(element)) {
                window.renderMathInElement(element, KATEX_OPTIONS);
            }
        }
        dirtyElements.clear();
    };

    const setupObserver = () => {
        const observer = new MutationObserver((mutations) => {
            let shouldSchedule = false;

            for (const mutation of mutations) {
                if (mutation.target.closest && mutation.target.closest('.katex')) continue;

                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
                            dirtyElements.add(node);
                            shouldSchedule = true;
                        }
                    });
                }

                else if (mutation.type === 'characterData') {
                    const parent = mutation.target.parentElement;
                    if (parent && !parent.closest('.katex')) {
                        dirtyElements.add(parent);
                        shouldSchedule = true;
                    }
                }
            }

            if (shouldSchedule) {
                clearTimeout(renderTimer);
                renderTimer = setTimeout(flushRenderQueue, 200);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    };

    addCSS(`${BASE_URL}/katex.min.css`);
    addScript(`${BASE_URL}/katex.min.js`, () => {
        addScript(`${BASE_URL}/contrib/auto-render.min.js`, () => {
            // to render whole page once
            if (window.renderMathInElement) {
                window.renderMathInElement(document.body, KATEX_OPTIONS);
            }
            setupObserver();
        });
    });

})();
