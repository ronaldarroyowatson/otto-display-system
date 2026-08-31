/**
 * Object Renderers Registry
 * Central registration for all display object renderers
 */

const objectRenderers = {};
let renderersInitialized = false;

/**
 * Initialize renderers on first use (lazy loading)
 */
function initializeRenderers() {
  if (renderersInitialized) return;
  
  if (typeof window !== 'undefined') {
    if (window.renderTimeObject) {
      objectRenderers['TimeObject'] = window.renderTimeObject;
      console.log('[Renderers] Registered TimeObject renderer');
    }
    if (window.renderTimeDigitalObject) {
      console.log('[Renderers] Registered Time digital renderer');
    }
    if (window.renderTimeAnalogObject) {
      console.log('[Renderers] Registered Time analog renderer');
    }
    if (window.renderWeatherObject) {
      objectRenderers['WeatherObject'] = window.renderWeatherObject;
      console.log('[Renderers] Registered WeatherObject renderer');
    }
  }
  
  renderersInitialized = true;
}

/**
 * Register a renderer for a specific object type
 * @param {string} objectType - The type of object (e.g., 'TimeObject', 'WeatherObject')
 * @param {Function} renderer - The renderer function
 */
function registerRenderer(objectType, renderer) {
  objectRenderers[objectType] = renderer;
  console.log(`[Renderers] Registered ${objectType}`);
}

/**
 * Get a renderer for a specific object type
 * @param {string} objectType - The type of object
 * @returns {Function|null} The renderer function or null if not found
 */
function getRenderer(objectType) {
  initializeRenderers(); // Ensure renderers are initialized
  return objectRenderers[objectType] ?? null;
}

/**
 * Render an object using registered renderers
 * @param {Object} object - The object to render
 * @param {HTMLElement} container - The container element
 * @returns {HTMLElement} The rendered element
 */
function renderObject(object, container) {
  initializeRenderers(); // Ensure renderers are initialized before rendering
  
  const objectType = object.type ?? 'UnknownObject';
  const renderer = getRenderer(objectType);

  if (!renderer) {
    console.warn(`[Renderers] No renderer found for object type: ${objectType}`);
    console.warn(`[Renderers] Available renderers:`, Object.keys(objectRenderers));
    const fallback = document.createElement('div');
    fallback.className = 'unknown-object-display';
    fallback.style.cssText = `
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 300px;
      text-align: center;
    `;
    fallback.innerHTML = `<p>No renderer for ${objectType}</p>`;
    if (container) {
      container.innerHTML = '';
      container.appendChild(fallback);
    }
    return fallback;
  }

  return renderer(object, container);
}

// Export registry to global scope
if (typeof window !== 'undefined') {
  window.objectRenderers = objectRenderers;
  window.renderObject = renderObject;
  window.registerRenderer = registerRenderer;
  window.getRenderer = getRenderer;
  window.initializeRenderers = initializeRenderers;
}
