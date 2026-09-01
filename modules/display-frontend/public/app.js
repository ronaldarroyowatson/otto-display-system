const defaultDisplayId = "hallway";
const defaultPageId = "announcements";
const state = { displayId: defaultDisplayId, pageIndex: 0, timer: null, rotationPlan: null };

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

function applyTheme(themeDefinition, appearanceDefinition = {}) {
  const root = document.documentElement;
  const theme = themeDefinition ?? {
    colors: { background: "#0b132b", surface: "rgba(255, 255, 255, 0.10)", text: "#f4f7fb", muted: "#dfe8f5", accent: "#ffd166", border: "rgba(110, 202, 255, 0.95)" },
    fonts: { body: '"Segoe UI", "Helvetica Neue", sans-serif' },
    backgrounds: { page: "linear-gradient(135deg, #0b132b 0%, #1c2541 42%, #3a506b 100%)" },
    motion: { page: "320ms cubic-bezier(0.22, 1, 0.36, 1)" }
  };
  const appearance = appearanceDefinition ?? {};
  const panel = appearance.panel ?? {};
  const borders = appearance.borders ?? {};
  const radii = appearance.radii ?? {};
  const shadows = appearance.shadows ?? {};
  const clock = appearance.clock ?? {};

  root.style.setProperty("--display-bg", theme.backgrounds?.page ?? theme.colors?.background ?? "#0b132b");
  root.style.setProperty("--panel-bg", panel.panelBackground ?? theme.colors?.surface ?? "rgba(255, 255, 255, 0.10)");
  root.style.setProperty("--text", theme.colors?.text ?? "#f4f7fb");
  root.style.setProperty("--muted", theme.colors?.muted ?? "#dfe8f5");
  root.style.setProperty("--accent", theme.colors?.accent ?? "#ffd166");
  root.style.setProperty("--border", theme.colors?.border ?? "rgba(110, 202, 255, 0.95)");
  root.style.setProperty("--page-transition", theme.motion?.page ?? "320ms cubic-bezier(0.22, 1, 0.36, 1)");
  root.style.setProperty("--transition-fade-duration", theme.motion?.fadeDuration ?? "320ms");
  root.style.setProperty("--transition-slide-duration", theme.motion?.slideDuration ?? "320ms");
  root.style.setProperty("--transition-dissolve-duration", theme.motion?.dissolveDuration ?? "320ms");
  root.style.setProperty("--shell-bg", panel.appBackground ?? "rgba(13, 24, 36, 0.82)");
  root.style.setProperty("--header-bg", panel.headerBackground ?? "rgba(11, 19, 34, 0.86)");
  root.style.setProperty("--header-border", borders.header ?? "rgba(255, 255, 255, 0.12)");
  root.style.setProperty("--badge-bg", panel.badgeBackground ?? "rgba(255, 255, 255, 0.12)");
  root.style.setProperty("--badge-border", borders.badge ?? "rgba(255, 255, 255, 0.12)");
  root.style.setProperty("--card-border", borders.card ?? "rgba(255, 255, 255, 0.16)");
  root.style.setProperty("--app-border-width", borders.appWidth ?? "3px");
  root.style.setProperty("--app-radius", radii.app ?? "12px");
  root.style.setProperty("--card-radius", radii.card ?? "16px");
  root.style.setProperty("--app-shadow", shadows.app ?? "0 0 0 1px rgba(102, 214, 255, 0.2), 0 0 32px rgba(102, 214, 255, 0.12)");
  root.style.setProperty("--card-shadow-inset", shadows.cardInset ?? "inset 0 1px 0 rgba(255,255,255,0.06)");
  root.style.setProperty("--clock-face-color", clock.face ?? "#f4f7fb");
  root.style.setProperty("--clock-hour-color", clock.hour ?? "#ffd166");
  root.style.setProperty("--clock-minute-color", clock.minute ?? "#9be7ff");
  root.style.setProperty("--clock-second-color", clock.second ?? "#ff6b6b");
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

function renderDynamicRolePage(rolePayload) {
  const app = document.getElementById("app");
  const role = rolePayload.role ?? "unknown";
  const object = rolePayload.content?.object ?? {};
  const objectType = object.type ?? "UnknownObject";

  console.log('[App] renderDynamicRolePage called for role:', role, 'objectType:', objectType);
  console.log('[App] window.renderObject available:', !!window.renderObject);
  console.log('[App] window.renderTimeObject available:', !!window.renderTimeObject);
  console.log('[App] window.renderWeatherObject available:', !!window.renderWeatherObject);
  console.log('[App] object payload:', object);

  app.innerHTML = `
    <div class="display-shell transition-fade">
      <header class="display-header">
        <h1>${role.toUpperCase()} Display</h1>
        <div class="meta">Stable URL: /display/${role}/current</div>
      </header>
      <main class="page-panel" aria-live="polite">
        <div class="page-badge">${objectType}</div>
        <article class="single-module-card" id="content-container">
          <!-- Object content will be rendered here -->
        </article>
      </main>
    </div>
  `;

  // Render the object using the registered renderer
  const contentContainer = document.getElementById("content-container");
  if (window.renderObject && contentContainer) {
    console.log('[App] Calling window.renderObject for', objectType);
    window.renderObject(object, contentContainer);
  } else if (contentContainer) {
    // Fallback if renderObject is not available
    console.warn('[App] renderObject not available, using fallback');
    const mainValue = object.currentTime ?? `${object.temperature ?? "--"} ${object.conditions ?? ""}`.trim();
    const secondary = object.icon ? `icon: ${object.icon}` : `phase: ${rolePayload.currentPhase ?? "unknown"}`;
    contentContainer.innerHTML = `
      <h2>${objectType}</h2>
      <p>${mainValue}</p>
      <p>${secondary}</p>
    `;
  }

  document.title = `Otto Display | ${role}`;
}

function clearRotationTimer() {
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
}

function scheduleNextRender(delayMs) {
  clearRotationTimer();
  state.timer = setTimeout(() => {
    render().catch(() => {});
  }, Math.max(1000, Number(delayMs || 0)));
}

function cycleDisplay(display, cycleInterval) {
  const delay = Number(cycleInterval || 10000);
  state.pageIndex = (state.pageIndex + 1) % display.pages.length;
  scheduleNextRender(delay);
}

async function render() {
  try {
    const route = getRoute();

    if (!route.pageId) {
      try {
        const rotationResponse = await fetch(`/content/rotation.json?displayId=${encodeURIComponent(route.displayId)}`, { cache: "no-store" });
        if (rotationResponse.ok) {
          state.rotationPlan = await rotationResponse.json();
        }
      } catch {
        state.rotationPlan = null;
      }

      if (state.rotationPlan?.pages?.length) {
        const rolePage = state.rotationPlan.currentPage?.id
          ? state.rotationPlan.pages.find((page) => page.id === state.rotationPlan.currentPage.id) || state.rotationPlan.pages[0]
          : state.rotationPlan.pages[state.pageIndex % state.rotationPlan.pages.length];
        const rolePayloadResponse = await fetch(`/display/${encodeURIComponent(route.displayId)}/${encodeURIComponent(rolePage.id)}/current`, { cache: "no-store" });
        if (rolePayloadResponse.ok) {
          const rolePayload = await rolePayloadResponse.json();
          renderDynamicRolePage(rolePayload);

          const nextDelayMs = state.rotationPlan.countdownMs || rolePage.displayDurationMs || state.rotationPlan.rotationIntervalMs || 30000;
          scheduleNextRender(nextDelayMs);
          return;
        }
      }
    }

    const response = await fetch("/display-config.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Unable to load display config (${response.status})`);
    }

    const config = await response.json();
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

    applyTheme(theme, config.dsc?.appearance ?? {});
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
