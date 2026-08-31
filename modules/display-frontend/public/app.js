const defaultDisplayId = "hallway";
const defaultPageId = "announcements";
const state = { displayId: defaultDisplayId, pageIndex: 0, timer: null };

function getRoute() {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/display";
  const parts = pathname.split("/").filter(Boolean);

  if (parts[0] === "display") {
    return {
      displayId: parts[1] || defaultDisplayId,
      pageId: parts[2] || null
    };
  }

  return { displayId: defaultDisplayId, pageId: null };
}

function applyTheme(themeDefinition) {
  const root = document.documentElement;
  const theme = themeDefinition ?? {
    colors: { background: "#0b132b", surface: "rgba(255, 255, 255, 0.10)", text: "#f4f7fb", muted: "#dfe8f5", accent: "#ffd166", border: "rgba(110, 202, 255, 0.95)" },
    fonts: { body: '"Segoe UI", "Helvetica Neue", sans-serif' },
    backgrounds: { page: "linear-gradient(135deg, #0b132b 0%, #1c2541 42%, #3a506b 100%)" },
    motion: { page: "320ms cubic-bezier(0.22, 1, 0.36, 1)" }
  };

  root.style.setProperty("--display-bg", theme.backgrounds?.page ?? theme.colors?.background ?? "#0b132b");
  root.style.setProperty("--panel-bg", theme.colors?.surface ?? "rgba(255, 255, 255, 0.10)");
  root.style.setProperty("--text", theme.colors?.text ?? "#f4f7fb");
  root.style.setProperty("--muted", theme.colors?.muted ?? "#dfe8f5");
  root.style.setProperty("--accent", theme.colors?.accent ?? "#ffd166");
  root.style.setProperty("--border", theme.colors?.border ?? "rgba(110, 202, 255, 0.95)");
  root.style.setProperty("--page-transition", theme.motion?.page ?? "320ms cubic-bezier(0.22, 1, 0.36, 1)");
  root.style.setProperty("font-family", theme.fonts?.body ?? '"Segoe UI", "Helvetica Neue", sans-serif');
}

function getPageById(display, pageId) {
  return display.pages.find((entry) => entry.id === pageId) ?? display.pages[0];
}

function renderSingleModulePage(display, page, moduleId, transition = "fade", moduleCatalog = {}) {
  const app = document.getElementById("app");
  const module = moduleCatalog[moduleId] ?? { label: moduleId, content: "No content available." };

  app.innerHTML = `
    <div class="display-shell transition-${transition}">
      <header class="display-header">
        <h1>${display.name}</h1>
        <div class="meta">Stable URL: /display/${display.displayId || display.id || state.displayId}</div>
      </header>
      <main class="page-panel" aria-live="polite">
        <div class="page-badge">${page.label}</div>
        <article class="single-module-card">
          <h2>${module.label}</h2>
          <p>${module.content}</p>
        </article>
      </main>
    </div>
  `;

  const pageBadge = app.querySelector(".page-badge");
  if (pageBadge) {
    pageBadge.textContent = `${page.label} • ${module.label}`;
  }
}

function cycleDisplay(display, cycleInterval) {
  if (state.timer) {
    clearInterval(state.timer);
  }

  state.timer = setInterval(() => {
    const nextIndex = (state.pageIndex + 1) % display.pages.length;
    state.pageIndex = nextIndex;
    render();
  }, cycleInterval);
}

async function render() {
  try {
    const response = await fetch("/display-config.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Unable to load display config (${response.status})`);
    }

    const config = await response.json();
    const route = getRoute();
    const requestedDisplayId = config.displays?.[route.displayId] ? route.displayId : config.defaults?.displayId || defaultDisplayId;
    const display = config.displays?.[requestedDisplayId] ?? config.displays?.[config.defaults?.displayId || defaultDisplayId];

    if (!display) {
      throw new Error("No display definition found in config");
    }

    state.displayId = requestedDisplayId;

    const matchedPage = route.pageId ? getPageById(display, route.pageId) : display.pages[0];
    if (matchedPage) {
      const pageIndex = display.pages.findIndex((entry) => entry.id === matchedPage.id);
      state.pageIndex = pageIndex >= 0 ? pageIndex : 0;
    }

    const currentPage = display.pages[state.pageIndex] ?? display.pages[0];
    const moduleId = currentPage.modules[0];
    const theme = config.themes?.[display.theme] ?? config.themes?.midnight ?? {};
    const transition = display.transition || config.dsc?.transition || "fade";
    const moduleCatalog = config.moduleCatalog ?? {};

    applyTheme(theme);
    renderSingleModulePage(display, currentPage, moduleId, transition, moduleCatalog);
    document.title = `${display.name} | ${currentPage.label}`;
    cycleDisplay(display, display.cycleInterval || config.dsc?.cycleInterval || 10000);
  } catch (error) {
    document.getElementById("app").innerHTML = `
      <div class="display-shell transition-fade">
        <header class="display-header">
          <h1>Otto Display</h1>
          <div class="meta">Unable to load display config: ${error.message}</div>
        </header>
        <main class="page-panel">
          <article class="single-module-card">
            <h2>Display Error</h2>
            <p>Configuration could not be loaded.</p>
          </article>
        </main>
      </div>
    `;
  }
}

window.addEventListener("popstate", render);
render();
