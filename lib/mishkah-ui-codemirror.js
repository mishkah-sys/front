/*!
 * Mishkah UI - CodeMirror Component
 * Reusable CodeMirror 5 wrapper with auto-scaffold support
 * UMD Format - Works everywhere!
 */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], function () { return factory(root, root.Mishkah); });
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(root, root.Mishkah);
    } else {
        root.Mishkah = factory(root, root.Mishkah);
    }
}(typeof window !== 'undefined' ? window : this, function (global, existing) {
    'use strict';

    var M = existing || (global.Mishkah = {});
    if (!M.UI) M.UI = {};

    var h = M.h || M.DSL || function () { console.warn('[CodeMirror] M.h not available'); return null; };

    // ============================================================
    // CodeMirror Language Modes Map
    // ============================================================

    var LANGUAGE_MODES = {
        'html': { mode: 'htmlmixed', file: 'mode/htmlmixed/htmlmixed.min.js', deps: ['xml', 'javascript', 'css'] },
        'xml': { mode: 'xml', file: 'mode/xml/xml.min.js' },
        'javascript': { mode: 'javascript', file: 'mode/javascript/javascript.min.js' },
        'js': { mode: 'javascript', file: 'mode/javascript/javascript.min.js' },
        'json': { mode: 'javascript', file: 'mode/javascript/javascript.min.js' },
        'css': { mode: 'css', file: 'mode/css/css.min.js' },
        'python': { mode: 'python', file: 'mode/python/python.min.js' },
        'py': { mode: 'python', file: 'mode/python/python.min.js' },
        'markdown': { mode: 'markdown', file: 'mode/markdown/markdown.min.js' },
        'md': { mode: 'markdown', file: 'mode/markdown/markdown.min.js' },
        'sql': { mode: 'sql', file: 'mode/sql/sql.min.js' },
        'php': { mode: 'php', file: 'mode/php/php.min.js' },
        'ruby': { mode: 'ruby', file: 'mode/ruby/ruby.min.js' },
        'shell': { mode: 'shell', file: 'mode/shell/shell.min.js' },
        'yaml': { mode: 'yaml', file: 'mode/yaml/yaml.min.js' }
    };

    // ============================================================
    // CodeMirror CDN URLs
    // ============================================================

    var CDN_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/';
    var loadedScripts = new Set();
    var loadedStyles = new Set();

    function loadScript(url) {
        if (loadedScripts.has(url)) return Promise.resolve();

        return new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            script.src = url;
            script.onload = function () {
                loadedScripts.add(url);
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    function loadStyle(url) {
        if (loadedStyles.has(url)) return;

        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        document.head.appendChild(link);
        loadedStyles.add(url);
    }

    // ============================================================
    // Auto-load CodeMirror if needed
    // ============================================================

    async function ensureCodeMirror() {
        if (global.CodeMirror) return global.CodeMirror;

        // Load core
        loadStyle(CDN_BASE + 'codemirror.min.css');
        loadStyle(CDN_BASE + 'theme/dracula.min.css');
        await loadScript(CDN_BASE + 'codemirror.min.js');

        return global.CodeMirror;
    }

    async function ensureMode(lang) {
        if (!lang) return;

        var langInfo = LANGUAGE_MODES[lang.toLowerCase()];
        if (!langInfo) return;

        // Load dependencies first
        if (langInfo.deps && Array.isArray(langInfo.deps)) {
            for (var i = 0; i < langInfo.deps.length; i++) {
                await ensureMode(langInfo.deps[i]);
            }
        }

        // Load mode
        await loadScript(CDN_BASE + langInfo.file);
    }

    // ============================================================
    // CodeMirror Component
    // ============================================================

    /**
     * CodeMirror Component
     * 
     * Usage:
     *   M.UI.CodeMirror({
     *     value: 'console.log("hello");',
     *     lang: 'javascript',
     *     theme: 'dracula',
     *     readOnly: false,
     *     onChange: (value) => console.log(value)
     *   })
     * 
     * Supported languages: html, xml, javascript, json, css, python, markdown, sql, php, ruby, shell, yaml
     */
    function CodeMirrorComponent(props) {
        props = props || {};

        var value = props.value || '';
        var lang = props.lang || 'javascript';
        var theme = props.theme || 'dracula';
        var readOnly = props.readOnly || false;
        var onChange = props.onChange || null;
        var height = props.height || '100%';
        var id = props.id || 'cm-' + Math.random().toString(36).substr(2, 9);

        // Container div
        var container = h.Containers.Div({
            attrs: {
                id: id,
                class: 'mishkah-codemirror-container',
                style: 'height: ' + height + '; overflow: auto;',
                'data-cm-lang': lang,
                'data-cm-theme': theme,
                'data-cm-value': value,
                'data-cm-readonly': readOnly ? 'true' : 'false',
                'data-cm-onchange': onChange ? 'true' : 'false'
            }
        });

        // Initialize CodeMirror after DOM ready
        setTimeout(function () {
            initCodeMirrorInstance(id, {
                value: value,
                lang: lang,
                theme: theme,
                readOnly: readOnly,
                onChange: onChange
            });
        }, 0);

        return container;
    }

    // ============================================================
    // Instance Initialization
    // ============================================================

    var instances = new Map();

    async function initCodeMirrorInstance(containerId, config) {
        var container = document.getElementById(containerId);
        if (!container) {
            setTimeout(function () { initCodeMirrorInstance(containerId, config); }, 100);
            return;
        }

        // Ensure CodeMirror is loaded
        await ensureCodeMirror();
        await ensureMode(config.lang);

        var langInfo = LANGUAGE_MODES[config.lang.toLowerCase()] || { mode: 'javascript' };

        // Create CodeMirror instance
        var editor = global.CodeMirror(container, {
            value: config.value || '',
            mode: langInfo.mode,
            theme: config.theme || 'dracula',
            lineNumbers: true,
            lineWrapping: true,
            indentUnit: 2,
            tabSize: 2,
            indentWithTabs: false,
            autoCloseBrackets: true,
            autoCloseTags: true,
            matchBrackets: true,
            styleActiveLine: !config.readOnly,
            readOnly: config.readOnly || false,
            viewportMargin: Infinity
        });

        // Handle onChange
        if (config.onChange && typeof config.onChange === 'function') {
            editor.on('change', function () {
                config.onChange(editor.getValue());
            });
        }

        // Store instance
        instances.set(containerId, editor);

        return editor;
    }

    // ============================================================
    // Public API
    // ============================================================

    function getInstance(id) {
        return instances.get(id);
    }

    function setValue(id, value) {
        var editor = instances.get(id);
        if (editor) editor.setValue(value);
    }

    function getValue(id) {
        var editor = instances.get(id);
        return editor ? editor.getValue() : '';
    }

    function refresh(id) {
        var editor = instances.get(id);
        if (editor) editor.refresh();
    }

    // ============================================================
    // Export
    // ============================================================

    M.UI.CodeMirror = CodeMirrorComponent;
    M.UI.CodeMirror.getInstance = getInstance;
    M.UI.CodeMirror.setValue = setValue;
    M.UI.CodeMirror.getValue = getValue;
    M.UI.CodeMirror.refresh = refresh;
    M.UI.CodeMirror.supportedLanguages = Object.keys(LANGUAGE_MODES);

    return M;
}));
