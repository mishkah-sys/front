# Mishkah DSL Guide - البناء المباشر بدون HTMLx

## 📖 Introduction

**DSL (Domain Specific Language)** هو نظام بناء الواجهات بشكل مباشر في JavaScript بدون استخدام templates HTML.

**الفرق عن HTMLx:**
- **HTMLx**: Template-based (`<template>` tags)  
- **DSL**: Code-based (JavaScript functions)

---

## 🎯 Why DSL?

حسب **الركن الثاني من فلسفة مشكاة** (من README-dreams.md):

> ### **2. لغة تعريفية مُحكَمة (A Constrained DSL): عقد بَنّاء وآمن**
> 
> **المبدأ:** لغات القوالب التقليدية (مثل JSX) تمنح حرية خطيرة. **مشكاة** تقدم **لغة تعريفية خاصة (DSL) تعمل كعقد صارم**.
> 
> هذا العقد يفرض **فصلًا قاطعًا بين بنية المكون (`attributes`) وسلوكه (`events`)**.

**المزايا:**
1. ✅ **Type Safety** - أخطاء تُكتشف في Build Time
2. ✅ **Performance** - لا parsing overhead
3. ✅ **Composability** - إعادة استخدام سهلة
4. ✅ **Separation of Concerns** - بنية منفصلة عن السلوك

---

## 🏗️ DSL Structure

### Core Namespaces

```javascript
const M = window.Mishkah;  // Core
const D = M.DSL;            // DSL Atoms
const U = M.utils;          // Utilities
const h = D.h || M.h;       // VDOM factory (if needed)
```

### Atom Categories

```javascript
D.Containers  // div, section, article, header, footer, main, nav, aside
D.Text        // p, span, h1-h6, strong, em, a, code, pre
D.Lists       // ul, ol, li, dl, dt, dd
D.Forms       // form, label, button, fieldset
D.Inputs      // input, textarea, select, option
D.Media       // img, video, audio, picture
D.Tables      // table, thead, tbody, tr, th, td
D.SVG         // svg, path, circle, rect, g
D.Semantic    // details, summary, figure
```

---

## ✍️ Basic Syntax

### Creating Elements

```javascript
const D = Mishkah.DSL;

// Basic element
const heading = D.Text.H1({
  attrs: { class: 'title' }
}, ['Welcome to Mishkah']);

// With children
const card = D.Containers.Div({
  attrs: { class: 'card' }
}, [
  D.Text.H2({}, ['Card Title']),
  D.Text.P({}, ['Card content here'])
]);
```

### Attributes

```javascript
const link = D.Text.A({
  attrs: {
    href: '/about',
    target: '_blank',
    class: 'btn btn-primary',
    'aria-label': 'Learn more'
  }
}, ['Learn More']);
```

### Events (via gkeys)

```javascript
const button = D.Forms.Button({
  attrs: {
    class: 'btn',
    'data-m-gkey': 'ui:submit-form'  // Event binding via gkey
  }
}, ['Submit']);
```

---

## 📦 Complete App Example

### 1. Define Body Function

```javascript
const D = Mishkah.DSL;

function body(db) {
  const count = db.data?.count || 0;
  
  return D.Containers.Div({
    attrs: { class: 'app-container' }
  }, [
    D.Text.H1({}, ['Counter App']),
    
    D.Text.P({
      attrs: { class: 'count-display' }
    }, [`Count: ${count}`]),
    
    D.Containers.Div({
      attrs: { class: 'button-group' }
    }, [
      D.Forms.Button({
        attrs: {
          class: 'btn btn-primary',
          'data-m-gkey': 'counter:increment'
        }
      }, ['+']),
      
      D.Forms.Button({
        attrs: {
          class: 'btn btn-secondary',
          'data-m-gkey': 'counter:decrement'
        }
      }, ['-']),
      
      D.Forms.Button({
        attrs: {
          class: 'btn btn-danger',
          'data-m-gkey': 'counter:reset'
        }
      }, ['Reset'])
    ])
  ]);
}
```

### 2. Define Orders (Event Handlers)

```javascript
const orders = {
  'counter.increment': {
    on: ['click'],
    gkeys: ['counter:increment'],
    handler: (e, ctx) => {
      ctx.setState(state => {
        return {
          ...state,
          data: {
            ...state.data,
            count: (state.data.count || 0) + 1
          }
        };
      });
    }
  },
  
  'counter.decrement': {
    on: ['click'],
    gkeys: ['counter:decrement'],
    handler: (e, ctx) => {
      ctx.setState(state => {
        return {
          ...state,
          data: {
            ...state.data,
            count: (state.data.count || 0) - 1
          }
        };
      });
    }
  },
  
  'counter.reset': {
    on: ['click'],
    gkeys: ['counter:reset'],
    handler: (e, ctx) => {
      ctx.setState(state => {
        return {
          ...state,
          data: {
            ...state.data,
            count: 0
          }
        };
      });
    }
  }
};
```

### 3. Create App

```javascript
MishkahAuto.ready(M => {
  // Set the body function FIRST
  M.app.setBody(body);
  
  // Then create app
  const app = M.app.createApp({
    env: { theme: 'dark', lang: 'en' },
    data: { count: 0 }
  }, orders);
  
  // Mount
  app.mount('#app');
});
```

---

## 🎨 Advanced Patterns

### Conditional Rendering

```javascript
function body(db) {
  const isLoggedIn = db.data?.user?.loggedIn || false;
  
  return D.Containers.Div({}, [
    D.Text.H1({}, ['Dashboard']),
    
    // Conditional: use ternary or array filter
    isLoggedIn 
      ? D.Text.P({}, ['Welcome back!'])
      : D.Text.P({}, ['Please log in']),
    
    // Or using filter
    ...(isLoggedIn 
      ? [D.Forms.Button({ attrs: { 'data-m-gkey': 'auth:logout' } }, ['Logout'])]
      : [D.Forms.Button({ attrs: { 'data-m-gkey': 'auth:login' } }, ['Login'])]
    )
  ]);
}
```

### Loop Rendering

```javascript
function body(db) {
  const users = db.data?.users || [];
  
  return D.Containers.Div({}, [
    D.Text.H1({}, ['Users']),
    
    D.Lists.Ul({}, 
      users.map((user, index) => 
        D.Lists.Li({
          attrs: { 
            key: user.id || index  // Important: use key for lists
          }
        }, [
          D.Text.Span({}, [user.name]),
          D.Text.Span({ attrs: { class: 'email' } }, [user.email])
        ])
      )
    )
  ]);
}
```

### Components (Reusable Functions)

```javascript
// Component: Card
function Card({ title, content, footer }) {
  return D.Containers.Div({
    attrs: { class: 'card' }
  }, [
    D.Containers.Div({ attrs: { class: 'card-header' } }, [
      D.Text.H3({}, [title])
    ]),
    
    D.Containers.Div({ attrs: { class: 'card-body' } }, [
      D.Text.P({}, [content])
    ]),
    
    footer && D.Containers.Div({
      attrs: { class: 'card-footer' }
    }, [footer])
  ].filter(Boolean));  // Remove null footer
}

// Usage
function body(db) {
  return D.Containers.Div({}, [
    Card({
      title: 'Welcome',
      content: 'This is a reusable card component',
      footer: D.Forms.Button({}, ['Learn More'])
    }),
    
    Card({
      title: 'Another Card',
      content: 'No footer here',
      footer: null
    })
  ]);
}
```

---

## 🌐 i18n with DSL

### Using Translation Keys

```javascript
function body(db) {
  const lang = db.env?.lang || 'en';
  const dict = db.i18n?.dict || {};
  
  // Helper function
  const t = (key) => dict[key]?.[lang] || key;
  
  return D.Containers.Div({}, [
    D.Text.H1({}, [t('welcome')]),
    D.Text.P({}, [t('description')])
  ]);
}

// Or use Mishkah's built-in t()
function bodyWithBuiltIn(db) {
  return D.Containers.Div({}, [
    D.Text.H1({ attrs: { t: 'welcome' } }),
    D.Text.P({ attrs: { t: 'description' } })
  ]);
}
```

### Database with i18n

```javascript
const database = {
  env: { lang: 'ar', dir: 'rtl' },
  i18n: {
    dict: {
      welcome: { ar: 'مرحباً', en: 'Welcome' },
      description: { ar: 'وصف التطبيق', en: 'App description' }
    }
  },
  data: {}
};
```

---

## 🎯 Complete Todo App (DSL)

```javascript
const D = Mishkah.DSL;

// Component: TodoItem
function TodoItem(todo, index) {
  return D.Lists.Li({
    attrs: {
      key: todo.id,
      class: todo.completed ? 'todo-item completed' : 'todo-item'
    }
  }, [
    D.Inputs.Input({
      attrs: {
        type: 'checkbox',
        checked: todo.completed,
        'data-m-gkey': `todo:toggle:${todo.id}`
      }
    }),
    
    D.Text.Span({ attrs: { class: 'todo-text' } }, [todo.text]),
    
    D.Forms.Button({
      attrs: {
        class: 'btn-sm btn-danger',
        'data-m-gkey': `todo:delete:${todo.id}`
      }
    }, ['×'])
  ]);
}

// Main Body
function body(db) {
  const todos = db.data?.todos || [];
  const newTodo = db.data?.newTodo || '';
  
  return D.Containers.Main({
    attrs: { class: 'todo-app' }
  }, [
    D.Text.H1({}, ['Todo List']),
    
    // Add Todo Form
    D.Forms.Form({
      attrs: { class: 'add-todo-form' }
    }, [
      D.Inputs.Input({
        attrs: {
          type: 'text',
          value: newTodo,
          placeholder: 'New task...',
          'data-m-gkey': 'todo:input'
        }
      }),
      
      D.Forms.Button({
        attrs: {
          type: 'submit',
          class: 'btn btn-primary',
          'data-m-gkey': 'todo:add'
        }
      }, ['Add'])
    ]),
    
    // Todo List
    D.Lists.Ul({
      attrs: { class: 'todo-list' }
    }, todos.map((todo, i) => TodoItem(todo, i))),
    
    // Stats
    D.Text.P({ attrs: { class: 'todo-stats' } }, [
      `${todos.filter(t => !t.completed).length} / ${todos.length} remaining`
    ])
  ]);
}

// Orders
const orders = {
  'todo.input': {
    on: ['input'],
    gkeys: ['todo:input'],
    handler: (e, ctx) => {
      ctx.setState(s => ({
        ...s,
        data: { ...s.data, newTodo: e.target.value }
      }));
    }
  },
  
  'todo.add': {
    on: ['click'],
    gkeys: ['todo:add'],
    handler: (e, ctx) => {
      e.preventDefault();
      ctx.setState(s => {
        const text = s.data.newTodo?.trim();
        if (!text) return s;
        
        return {
          ...s,
          data: {
            ...s.data,
            todos: [
              ...s.data.todos,
              { id: Date.now(), text, completed: false }
            ],
            newTodo: ''
          }
        };
      });
    }
  },
  
  'todo.toggle': {
    on: ['change'],
    gkeys: ['todo:toggle:*'],  // Wildcard pattern
    handler: (e, ctx) => {
      const id = parseInt(e.target.dataset.mGkey.split(':')[2]);
      ctx.setState(s => ({
        ...s,
        data: {
          ...s.data,
          todos: s.data.todos.map(t =>
            t.id === id ? { ...t, completed: !t.completed } : t
          )
        }
      }));
    }
  },
  
  'todo.delete': {
    on: ['click'],
    gkeys: ['todo:delete:*'],
    handler: (e, ctx) => {
      const id = parseInt(e.target.dataset.mGkey.split(':')[2]);
      ctx.setState(s => ({
        ...s,
        data: {
          ...s.data,
          todos: s.data.todos.filter(t => t.id !== id)
        }
      }));
    }
  }
};

// Initialize
MishkahAuto.ready(M => {
  M.app.setBody(body);
  
  const app = M.app.createApp({
    env: { theme: 'dark', lang: 'en' },
    data: {
      todos: [],
      newTodo: ''
    }
  }, orders);
  
  app.mount('#app');
});
```

---

## 🆚 DSL vs HTMLx Comparison

### HTMLx (Template-Based)
```html
<template id="app">
  <script type="application/json" data-m-data data-m-path="data">
    { "count": 0 }
  </script>
  
  <div>
    <h1>{state.data.count}</h1>
    <button data-m-order="increment">+</button>
  </div>
</template>
```

### DSL (Code-Based)
```javascript
function body(db) {
  return D.Containers.Div({}, [
    D.Text.H1({}, [db.data.count]),
    D.Forms.Button({
      attrs: { 'data-m-gkey': 'counter:increment' }
    }, ['+'])
  ]);
}
```

**When to Use Each:**
- **HTMLx**: Designers, rapid prototyping, simple apps
- **DSL**: Type safety, complex logic, large teams

---

## 🏁 Summary

**DSL Workflow:**
1. Define `body(db)` function
2. Define `orders` object
3. Call `M.app.setBody(body)`
4. Call `M.app.createApp(database, orders)`
5. Call `app.mount(selector)`

**Key Principles:**
- ✅ **Separation**: Structure (body) ≠ Behavior (orders)
- ✅ **Immutability**: Always return new state in `setState`
- ✅ **Composition**: Build reusable components
- ✅ **Keys**: Use `key` attribute for lists

**الآن أنت تكتب Mishkah بنقاء!** 🎯
