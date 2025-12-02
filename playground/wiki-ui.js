(function () {
    'use strict';

    function waitForDSL() {
        if (!window.Mishkah || !window.Mishkah.DSL || !window.Mishkah.utils) {
            setTimeout(waitForDSL, 50);
            return;
        }

        window.M = window.Mishkah;
        window.M.UI = window.M.UI || {};
        const D = window.Mishkah.DSL;
        const U = window.Mishkah.utils;

        // Helper: Render Markdown
        function renderMarkdown(content) {
            if (!content) return D.Text.P({}, ['']);
            if (window.Mishkah.UI && window.Mishkah.UI.Markdown) {
                return window.Mishkah.UI.Markdown({ content: content });
            } else if (window.marked) {
                return D.RawHtml({ html: window.marked.parse(content) });
            }
            return D.Text.Pre({}, [content]);
        }

        // ============================================================
        // WikiLayout
        // ============================================================
        window.M.UI.WikiLayout = function ({ state, actions }) {
            const isMobile = window.innerWidth < 768;
            const showSidebar = state.sidebarOpen;
            const lang = state.lang;
            const dir = lang === 'ar' ? 'rtl' : 'ltr';

            return D.Containers.Div({
                attrs: {
                    class: 'flex h-screen w-full overflow-hidden',
                    style: `background-color: var(--background); color: var(--foreground); direction: ${dir};`
                }
            }, [
                // Mobile Overlay
                (isMobile && showSidebar) ? D.Containers.Div({
                    attrs: {
                        class: 'fixed inset-0 bg-black/50 z-40',
                        gkey: 'wiki:sidebar:close'
                    }
                }) : null,

                // Sidebar
                D.Containers.Div({
                    attrs: {
                        class: `fixed md:relative w-64 h-full bg-card border-r z-50 transition-transform duration-300`,
                        style: `transform: ${showSidebar ? 'translateX(0)' : (dir === 'rtl' ? 'translateX(100%)' : 'translateX(-100%)')}; border-color: var(--border); background-color: var(--card);`
                    }
                }, [
                    window.M.UI.WikiSidebar({ state, actions, isMobile })
                ]),

                // Main Content Area
                D.Containers.Div({
                    attrs: {
                        class: 'wiki-main',
                        style: `
                            flex: 1;
                            display: flex;
                            flex-direction: column;
                            height: 100%;
                            overflow: hidden;
                        `
                    }
                }, [
                    // Header
                    window.M.UI.WikiHeader({ state, actions, isMobile }),

                    // Content
                    D.Containers.Div({
                        attrs: {
                            class: 'wiki-content',
                            style: `
                                flex: 1;
                                overflow-y: auto;
                                padding: 2rem;
                            `
                        }
                    }, [
                        state.viewMode === 'edit'
                            ? window.M.UI.WikiEditor({ state, actions })
                            : window.M.UI.WikiViewer({ state, actions })
                    ])
                ])
            ]);
        };

        // ============================================================
        // WikiHeader
        // ============================================================
        window.M.UI.WikiHeader = function ({ state, actions, isMobile }) {
            const lang = state.lang;

            return D.Containers.Div({
                attrs: {
                    class: 'wiki-header',
                    style: `
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 1rem 2rem;
                        border-bottom: 1px solid var(--border);
                        background: var(--card);
                        backdrop-filter: blur(10px);
                    `
                }
            }, [
                // Left side
                D.Containers.Div({
                    attrs: {
                        style: 'display: flex; align-items: center; gap: 1rem;'
                    }
                }, [
                    // Mobile menu button
                    isMobile ? D.Forms.Button({
                        attrs: {
                            gkey: 'wiki:sidebar:toggle',
                            class: 'wiki-menu-btn',
                            style: `
                                padding: 0.5rem;
                                border-radius: 0.375rem;
                                background: transparent;
                                border: none;
                                cursor: pointer;
                                font-size: 1.5rem;
                            `
                        }
                    }, ['☰']) : null,

                    // Logo & Title
                    D.Containers.Div({
                        attrs: {
                            style: 'display: flex; align-items: center; gap: 0.5rem;'
                        }
                    }, [
                        D.Text.Span({ style: 'font-size: 1.75rem;' }, ['📚']),
                        D.Text.H1({
                            attrs: {
                                style: `
                                    font-size: 1.5rem;
                                    font-weight: 700;
                                    margin: 0;
                                    background: linear-gradient(135deg, var(--primary), var(--accent));
                                    -webkit-background-clip: text;
                                    -webkit-text-fill-color: transparent;
                                    background-clip: text;
                                `
                            }
                        }, ['Mishkah Wiki'])
                    ])
                ]),

                // Right side controls
                D.Containers.Div({
                    attrs: {
                        style: 'display: flex; align-items: center; gap: 0.75rem;'
                    }
                }, [
                    // Language toggle
                    D.Forms.Button({
                        attrs: {
                            gkey: 'wiki:lang:toggle',
                            class: 'wiki-control-btn',
                            style: `
                                padding: 0.375rem 0.75rem;
                                border-radius: 0.375rem;
                                border: 1px solid var(--border);
                                background: var(--background);
                                font-size: 0.875rem;
                                cursor: pointer;
                                transition: all 0.2s;
                            `
                        }
                    }, [lang === 'ar' ? 'EN' : 'عربي']),

                    // Theme toggle
                    D.Forms.Button({
                        attrs: {
                            gkey: 'wiki:theme:toggle',
                            class: 'wiki-control-btn',
                            style: `
                                padding: 0.375rem 0.75rem;
                                border-radius: 0.375rem;
                                border: 1px solid var(--border);
                                background: var(--background);
                                font-size: 1.25rem;
                                cursor: pointer;
                                transition: all 0.2s;
                            `
                        }
                    }, [state.theme === 'dark' ? '☀️' : '🌙'])
                ])
            ]);
        };

        // ============================================================
        // WikiSidebar - Tree Navigation
        // ============================================================
        window.M.UI.WikiSidebar = function ({ state, actions, isMobile }) {
            const lang = state.lang;
            const articles = state.articles;
            const expanded = state.expandedNodes || new Set();

            // Build tree from parents_ids
            function buildTree(items) {
                const map = {};
                const roots = [];

                // Create map
                items.forEach(item => {
                    map[item.id] = { ...item, children: [] };
                });

                // Link children to parents
                items.forEach(item => {
                    const node = map[item.id];
                    if (item.parents_ids && item.parents_ids.length > 0) {
                        // Last parent is direct parent
                        const parentId = item.parents_ids[item.parents_ids.length - 1];
                        if (map[parentId]) {
                            map[parentId].children.push(node);
                        } else {
                            roots.push(node);
                        }
                    } else {
                        roots.push(node);
                    }
                });

                return roots;
            }

            // Render tree recursively  
            function renderTree(nodes, depth = 0) {
                return nodes.sort((a, b) => (a.sort || 999) - (b.sort || 999)).map(node => {
                    const hasChildren = node.children && node.children.length > 0;
                    const isExpanded = expanded.has(node.id);
                    const isActive = state.activeId === node.id;
                    const title = node.title[lang] || node.title['en'];

                    return D.Containers.Div({
                        attrs: {
                            style: `margin-left: ${depth * 1}rem;`
                        }
                    }, [
                        // Node row
                        D.Containers.Div({
                            attrs: {
                                class: 'wiki-tree-node',
                                style: `
                                    display: flex;
                                    align-items: center;
                                    gap: 0.25rem;
                                    padding: 0.5rem;
                                    margin: 0.125rem 0;
                                    border-radius: 0.375rem;
                                    transition: all 0.15s;
                                    ${isActive ? 'background-color: var(--secondary); color: var(--secondary-foreground); font-weight: 600;' : ''}
                                `
                            }
                        }, [
                            // Expand/collapse toggle
                            hasChildren ? D.Forms.Button({
                                attrs: {
                                    gkey: 'wiki:node:toggle',
                                    'data-node-id': node.id,
                                    style: `
                                        width: 1.25rem;
                                        height: 1.25rem;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        border: none;
                                        background: transparent;
                                        cursor: pointer;
                                        font-size: 0.75rem;
                                        padding: 0;
                                    `
                                }
                            }, [isExpanded ? '▼' : '▶']) : D.Containers.Div({ style: 'width: 1.25rem;' }),

                            // Icon & Title
                            D.Containers.Div({
                                attrs: {
                                    gkey: 'wiki:article:navigate',
                                    'data-article-id': node.id,
                                    style: 'display: flex; align-items: center; gap: 0.5rem; flex: 1; cursor: pointer;'
                                }
                            }, [
                                D.Text.Span({ style: 'opacity: 0.7; font-size: 1rem;' }, [hasChildren ? '📁' : '📄']),
                                D.Text.Span({ style: 'font-size: 0.875rem;' }, [title])
                            ])
                        ]),

                        // Children (if expanded)
                        (hasChildren && isExpanded) ? D.Containers.Div({
                            attrs: {
                                class: 'wiki-tree-children',
                                style: `
                                    border-left: 2px solid var(--border);
                                    margin-left: 0.5rem;
                                    padding-left: 0.25rem;
                                `
                            }
                        }, renderTree(node.children, depth + 1)) : null
                    ]);
                });
            }

            const tree = buildTree(articles);

            return D.Containers.Div({
                attrs: {
                    class: 'wiki-sidebar',
                    style: `
                        width: 100%;
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                    `
                }
            }, [
                // Header with controls
                D.Containers.Div({
                    attrs: {
                        class: 'wiki-sidebar-header',
                        style: `
                            padding: 1rem;
                            border-bottom: 1px solid var(--border);
                        `
                    }
                }, [
                    // New Article button
                    D.Forms.Button({
                        attrs: {
                            gkey: 'wiki:article:new',
                            class: 'wiki-new-btn',
                            style: `
                                width: 100%;
                                padding: 0.75rem 1rem;
                                border-radius: 0.5rem;
                                background: var(--primary);
                                color: var(--primary-foreground);
                                border: none;
                                font-weight: 600;
                                font-size: 0.875rem;
                                cursor: pointer;
                            display: flex;
                                align-items: center;
                                justify-content: center;
                                gap: 0.5rem;
                                margin-bottom: 0.75rem;
                            `
                        }
                    }, [
                        D.Text.Span({ style: 'font-size: 1.25rem;' }, ['+']),
                        D.Text.Span({}, [lang === 'ar' ? 'مقالة جديدة' : 'New Article'])
                    ]),

                    // Expand/Collapse buttons
                    D.Containers.Div({
                        attrs: {
                            style: 'display: flex; gap: 0.5rem; margin-bottom: 0.75rem;'
                        }
                    }, [
                        D.Forms.Button({
                            attrs: {
                                gkey: 'wiki:tree:expand-all',
                                style: `
                                    flex: 1;
                                    padding: 0.375rem;
                                    border-radius: 0.375rem;
                                    border: 1px solid var(--border);
                                    background: var(--background);
                                    font-size: 0.75rem;
                                    cursor: pointer;
                                `
                            }
                        }, [lang === 'ar' ? 'فتح الكل' : 'Expand All']),
                        D.Forms.Button({
                            attrs: {
                                gkey: 'wiki:tree:collapse-all',
                                style: `
                                    flex: 1;
                                    padding: 0.375rem;
                                    border-radius: 0.375rem;
                                    border: 1px solid var(--border);
                                    background: var(--background);
                                    font-size: 0.75rem;
                                    cursor: pointer;
                                `
                            }
                        }, [lang === 'ar' ? 'طي الكل' : 'Collapse All'])
                    ]),

                    // Search
                    window.M.UI.Input({
                        attrs: {
                            type: 'text',
                            placeholder: lang === 'ar' ? 'بحث...' : 'Search...',
                            gkey: 'wiki:search',
                            class: 'wiki-search',
                            style: `
                                width: 100%;
                                padding: 0.5rem 0.75rem;
                                border-radius: 0.375rem;
                                border: 1px solid var(--border);
                                background: var(--background);
                                font-size: 0.875rem;
                            `,
                            value: state.searchQuery
                        }
                    })
                ]),

                // Tree content
                D.Containers.Div({
                    attrs: {
                        class: 'wiki-tree',
                        style: `
                            flex: 1;
                            overflow-y: auto;
                            padding: 0.5rem;
                        `
                    }
                }, [
                    state.searchQuery
                        ? D.Containers.Div({},
                            articles
                                .filter(a => (a.title[lang] || '').toLowerCase().includes(state.searchQuery.toLowerCase()))
                                .map(a => D.Forms.Button({
                                    attrs: {
                                        gkey: 'wiki:article:navigate',
                                        'data-article-id': a.id,
                                        style: `
                                            width: 100%;
                                            text-align: left;
                                            padding: 0.5rem;
                                            border-radius: 0.375rem;
                                            background: transparent;
                                            border: none;
                                            cursor: pointer;
                                            font-size: 0.875rem;
                                        `
                                    }
                                }, [a.title[lang] || a.title['en']]))
                        )
                        : D.Containers.Div({}, renderTree(tree))
                ]),

                // Footer
                D.Containers.Div({
                    attrs: {
                        style: `
                            padding: 1rem;
                            border-top: 1px solid var(--border);
                            display: flex;
                            gap: 0.5rem;
                        `
                    }
                }, [
                    D.Forms.Button({
                        attrs: {
                            gkey: 'wiki:data:export',
                            style: `
                                flex: 1;
                                padding: 0.5rem;
                                border-radius: 0.375rem;
                                border: 1px solid var(--border);
                                background: var(--background);
                                font-size: 0.75rem;
                                cursor: pointer;
                            `
                        }
                    }, [lang === 'ar' ? 'تصدير' : 'Export']),
                    D.Forms.Label({
                        attrs: {
                            style: `
                                flex: 1;
                                padding: 0.5rem;
                                border-radius: 0.375rem;
                                border: 1px solid var(--border);
                                background: var(--background);
                                font-size: 0.75rem;
                                cursor: pointer;
                                text-align: center;
                            `
                        }
                    }, [
                        lang === 'ar' ? 'استيراد' : 'Import',
                        window.M.UI.Input({
                            attrs: {
                                type: 'file',
                                accept: '.json',
                                gkey: 'wiki:data:import',
                                style: 'display: none;'
                            }
                        })
                    ])
                ])
            ]);
        };

        // ============================================================
        // WikiViewer - Article Display
        // ============================================================
        window.M.UI.WikiViewer = function ({ state, actions }) {
            const article = state.articles.find(a => a.id === state.activeId);
            const lang = state.lang;

            if (!article) {
                return D.Containers.Div({
                    attrs: {
                        style: `
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-center;
                            height: 100%;
                            color: var(--muted-foreground);
                        `
                    }
                }, [
                    D.Text.Span({ style: 'font-size: 4rem; opacity: 0.2; margin-bottom: 1rem;' }, ['📚']),
                    D.Text.H3({ style: 'font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;' },
                        [lang === 'ar' ? 'لم يتم تحديد مقالة' : 'No Article Selected']),
                    D.Text.P({ style: 'opacity: 0.7;' },
                        [lang === 'ar' ? 'اختر مقالة من القائمة' : 'Select an article from the sidebar'])
                ]);
            }

            const title = article.title[lang] || article.title['en'];
            let content = article.content[lang] || article.content['en'] || '';
            const siblings = article.siblings || [];

            // Smart Linking
            if (article.words && Array.isArray(article.words)) {
                article.words.forEach(wordObj => {
                    const word = Object.keys(wordObj)[0];
                    const targetId = wordObj[word];
                    const regex = new RegExp(`\\b(${word})\\b`, 'gi');
                    content = content.replace(regex,
                        `<span class="wiki-link" data-wiki-link="${targetId}">$1</span>`);
                });
            }

            return D.Containers.Div({
                attrs: {
                    class: 'wiki-article',
                    style: `
                        max-width: 800px;
                        margin: 0 auto;
                        width: 100%;
                    `
                }
            }, [
                // Article header
                D.Containers.Div({
                    attrs: {
                        style: `
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            gap: 2rem;
                            margin-bottom: 2rem;
                            padding-bottom: 1.5rem;
                            border-bottom: 2px solid var(--border);
                        `
                    }
                }, [
                    D.Containers.Div({ style: 'flex: 1;' }, [
                        D.Text.H1({
                            attrs: {
                                style: `
                                    font-size: 2.5rem;
                                    font-weight: 700;
                                    margin: 0 0 1rem 0;
                                    line-height: 1.2;
                                `
                            }
                        }, [title]),
                        D.Text.P({
                            attrs: {
                                style: `
                                    font-size: 0.875rem;
                                    color: var(--muted-foreground);
                                    margin: 0;
                                `
                            }
                        }, [
                            lang === 'ar' ? 'آخر تحديث: ' : 'Last updated: ',
                            article.updatedAt ? new Date(article.updatedAt).toLocaleDateString() : '-'
                        ])
                    ]),
                    D.Forms.Button({
                        attrs: {
                            gkey: 'wiki:article:edit',
                            style: `
                                padding: 0.75rem 1.5rem;
                                border-radius: 0.5rem;
                                background: var(--secondary);
                                color: var(--secondary-foreground);
                                border: none;
                                font-weight: 600;
                                cursor: pointer;
                                display: flex;
                                align-items: center;
                                gap: 0.5rem;
                            `
                        }
                    }, [
                        D.Text.Span({}, ['✏️']),
                        D.Text.Span({}, [lang === 'ar' ? 'تعديل' : 'Edit'])
                    ])
                ]),

                // Article content
                D.Containers.Div({
                    attrs: {
                        class: 'wiki-content-body prose prose-lg',
                        gkey: 'wiki:link:click',
                        style: `
                            margin-bottom: 3rem;
                            line-height: 1.8;
                            direction: ${lang === 'ar' ? 'rtl' : 'ltr'};
                        `
                    }
                }, [
                    renderMarkdown(content)
                ]),

                // Related Articles (siblings)
                (siblings && siblings.length > 0) ? D.Containers.Div({
                    attrs: {
                        style: `
                            margin-top: 3rem;
                            padding-top: 2rem;
                            border-top: 1px solid var(--border);
                        `
                    }
                }, [
                    D.Text.H3({
                        attrs: {
                            style: `
                                font-size: 1.25rem;
                                font-weight: 600;
                                margin-bottom: 1rem;
                            `
                        }
                    }, [lang === 'ar' ? '📎 مقالات ذات صلة' : '📎 Related Articles']),
                    D.Containers.Div({
                        attrs: {
                            style: 'display: flex; flex-direction: column; gap: 0.75rem;'
                        }
                    }, siblings.map(sib =>
                        D.Forms.Button({
                            attrs: {
                                gkey: 'wiki:article:navigate',
                                'data-article-id': sib.id,
                                style: `
                                    padding: 0.75rem 1rem;
                                    border-radius: 0.5rem;
                                    border: 1px solid var(--border);
                                    background: var(--card);
                                    text-align: left;
                                    cursor: pointer;
                                    display: flex;
                                    align-items: center;
                                    gap: 0.5rem;
                                `
                            }
                        }, [
                            D.Text.Span({ style: 'opacity: 0.7;' }, ['→']),
                            D.Text.Span({}, [sib.title[lang] || sib.title['en']])
                        ])
                    ))
                ]) : null
            ]);
        };

        // ============================================================
        // WikiEditor - Full Editor with All Fields
        // ============================================================
        window.M.UI.WikiEditor = function ({ state, actions }) {
            const lang = state.lang;
            const isNew = !state.activeId;
            const article = state.articles.find(a => a.id === state.activeId) || {
                id: '',
                title: { en: '', ar: '' },
                content: { en: '', ar: '' },
                keywords: [],
                words: [],
                parents_ids: [],
                siblings: [],
                sort: 999
            };

            const formData = {
                id: article.id,
                title: { ...article.title },
                content: { ...article.content },
                keywords: [...(article.keywords || [])],
                words: [...(article.words || [])],
                parents_ids: [...(article.parents_ids || [])],
                siblings: [...(article.siblings || [])],
                sort: article.sort || 999
            };

            const FormField = (label, children) => D.Containers.Div({
                attrs: { style: 'margin-bottom: 1.5rem;' }
            }, [
                D.Forms.Label({
                    attrs: {
                        style: `
                            display: block;
                            font-weight: 600;
                            margin-bottom: 0.5rem;
                            font-size: 0.875rem;
                        `
                    }
                }, [label]),
                children
            ]);

            return D.Containers.Div({
                attrs: {
                    style: 'max-width: 900px; margin: 0 auto;'
                }
            }, [
                D.Text.H2({
                    attrs: {
                        style: `
                            font-size: 2rem;
                            font-weight: 700;
                            margin-bottom: 2rem;
                        `
                    }
                }, [isNew ? (lang === 'ar' ? '➕ مقالة جديدة' : '➕ New Article') : (lang === 'ar' ? '✏️ تعديل المقالة' : '✏️ Edit Article')]),

                // ID field (for new articles)
                isNew ? FormField('Article ID', window.M.UI.Input({
                    attrs: {
                        class: 'wiki-input',
                        style: `
                            width: 100%;
                            padding: 0.75rem;
                            border-radius: 0.5rem;
                            border: 1px solid var(--border);
                            background: var(--background);
                        `,
                        placeholder: 'unique-article-id',
                        value: formData.id,
                        oninput: (e) => formData.id = e.target.value
                    }
                })) : null,

                // Titles
                D.Containers.Div({
                    attrs: {
                        style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;'
                    }
                }, [
                    FormField('Title (English)', window.M.UI.Input({
                        attrs: {
                            style: `width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid var(--border); background: var(--background);`,
                            value: formData.title.en,
                            oninput: (e) => formData.title.en = e.target.value
                        }
                    })),
                    FormField('العنوان (عربي)', window.M.UI.Input({
                        attrs: {
                            style: `width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid var(--border); background: var(--background);`,
                            dir: 'rtl',
                            value: formData.title.ar,
                            oninput: (e) => formData.title.ar = e.target.value
                        }
                    }))
                ]),

                // Content
                D.Containers.Div({
                    attrs: {
                        style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;'
                    }
                }, [
                    FormField('Content (English - Markdown)', window.M.UI.Textarea({
                        attrs: {
                            style: `
                                width: 100%;
                                padding: 0.75rem;
                                border-radius: 0.5rem;
                                border: 1px solid var(--border);
                                background: var(--background);
                                font-family: monospace;
                                font-size: 0.875rem;
                                min-height: 300px;
                                resize: vertical;
                            `,
                            oninput: (e) => formData.content.en = e.target.value
                        }
                    }, [formData.content.en])),
                    FormField('المحتوى (عربي - Markdown)', window.M.UI.Textarea({
                        attrs: {
                            style: `
                                width: 100%;
                                padding: 0.75rem;
                                border-radius: 0.5rem;
                                border: 1px solid var(--border);
                                background: var(--background);
                                font-family: monospace;
                                font-size: 0.875rem;
                                min-height: 300px;
                                resize: vertical;
                            `,
                            dir: 'rtl',
                            oninput: (e) => formData.content.ar = e.target.value
                        }
                    }, [formData.content.ar]))
                ]),

                // Keywords
                FormField('Keywords (comma-separated)', window.M.UI.Input({
                    attrs: {
                        style: `width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid var(--border); background: var(--background);`,
                        placeholder: 'react, hooks, state',
                        value: formData.keywords.join(', '),
                        oninput: (e) => formData.keywords = e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                    }
                })),

                // Parents IDs
                FormField('Parent IDs (comma-separated)', window.M.UI.Input({
                    attrs: {
                        style: `width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid var(--border); background: var(--background);`,
                        placeholder: 'react, react-hooks',
                        value: formData.parents_ids.join(', '),
                        oninput: (e) => formData.parents_ids = e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                    }
                })),

                // Words (JSON format)
                FormField('Words (JSON: [{"word": "target-id"}])', window.M.UI.Textarea({
                    attrs: {
                        style: `
                            width: 100%;
                            padding: 0.75rem;
                            border-radius: 0.5rem;
                            border: 1px solid var(--border);
                            background: var(--background);
                            font-family: monospace;
                            font-size: 0.875rem;
                            min-height: 100px;
                        `,
                        placeholder: '[{"React": "react"}, {"Hook": "react-hooks"}]',
                        oninput: (e) => {
                            try {
                                formData.words = JSON.parse(e.target.value);
                            } catch (err) { }
                        }
                    }
                }, [JSON.stringify(formData.words, null, 2)])),

                // Siblings (JSON format)
                FormField('Related Articles (JSON: [{"id": "...", "title": {...}}])', window.M.UI.Textarea({
                    attrs: {
                        style: `
                            width: 100%;
                            padding: 0.75rem;
                            border-radius: 0.5rem;
                            border: 1px solid var(--border);
                            background: var(--background);
                            font-family: monospace;
                            font-size: 0.875rem;
                            min-height: 100px;
                        `,
                        placeholder: '[{"id": "react-component", "title": {"en": "Components", "ar": "المكونات"}}]',
                        oninput: (e) => {
                            try {
                                formData.siblings = JSON.parse(e.target.value);
                            } catch (err) { }
                        }
                    }
                }, [JSON.stringify(formData.siblings, null, 2)])),

                // Sort order
                FormField('Sort Order', window.M.UI.Input({
                    attrs: {
                        type: 'number',
                        style: `width: 200px; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid var(--border); background: var(--background);`,
                        value: formData.sort,
                        oninput: (e) => formData.sort = parseInt(e.target.value) || 999
                    }
                })),

                // Action buttons
                D.Containers.Div({
                    attrs: {
                        style: 'display: flex; gap: 1rem; margin-top: 2rem;'
                    }
                }, [
                    D.Forms.Button({
                        attrs: {
                            gkey: 'wiki:article:save',
                            style: `
                                padding: 0.75rem 2rem;
                                border-radius: 0.5rem;
                                background: var(--primary);
                                color: var(--primary-foreground);
                                border: none;
                                font-weight: 600;
                                cursor: pointer;
                            `
                        }
                    }, [lang === 'ar' ? '💾 حفظ' : '💾 Save']),
                    D.Forms.Button({
                        attrs: {
                            gkey: 'wiki:article:cancel',
                            style: `
                                padding: 0.75rem 2rem;
                                border-radius: 0.5rem;
                                border: 1px solid var(--border);
                                background: var(--background);
                                cursor: pointer;
                            `
                        }
                    }, [lang === 'ar' ? 'إلغاء' : 'Cancel']),
                    !isNew ? D.Forms.Button({
                        attrs: {
                            gkey: 'wiki:article:delete',
                            style: `
                                padding: 0.75rem 2rem;
                                border-radius: 0.5rem;
                                background: var(--destructive);
                                color: var(--destructive-foreground);
                                border: none;
                                cursor: pointer;
                                margin-left: auto;
                            `
                        }
                    }, [lang === 'ar' ? '🗑️ حذف' : '🗑️ Delete']) : null
                ])
            ]);
        };

        // WikiMini (for embedding)
        window.M.UI.WikiMini = function (props) {
            const { wikiId, lang = 'en' } = props;
            const articles = window.codewikidb || [];
            const article = articles.find(a => a.id === wikiId);

            if (!article) {
                return D.Containers.Div({
                    attrs: { style: 'padding: 2rem; text-align: center; color: var(--muted-foreground);' }
                }, [lang === 'ar' ? 'لا توجد معلومات' : 'No information']);
            }

            const content = article.content[lang] || article.content['en'] || '';

            return D.Containers.Div({
                attrs: {
                    class: 'wiki-mini prose',
                    style: `
                        padding: 1.5rem;
                        direction: ${lang === 'ar' ? 'rtl' : 'ltr'};
                    `
                }
            }, [renderMarkdown(content)]);
        };

        // Add inline styles for wiki-link
        const styleTag = document.createElement('style');
        styleTag.textContent = `
            .wiki-link {
                color: var(--primary);
                text-decoration: none;
                font-weight: 500;
                cursor: pointer;
                border-bottom: 1px dashed var(--primary);
                transition: all 0.2s;
            }
            .wiki-link:hover {
                text-decoration: underline;
                opacity: 0.8;
            }
        `;
        document.head.appendChild(styleTag);

        console.log('✅ Mishkah Wiki UI loaded');
    }

    waitForDSL();
})();
