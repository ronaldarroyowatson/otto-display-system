/**
 * TimeObject Renderer
 * Displays current time with automatic updates
 */

function formatTimeNow() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function renderTimeObject(object, container) {
  const timeContainer = document.createElement('div');
  timeContainer.className = 'time-object-display';
  timeContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 300px;
    font-family: "ui-monospace", "SFMono-Regular", "Courier New", monospace;
    text-align: center;
  `;

  const timeDisplay = document.createElement('div');
  timeDisplay.className = 'time-display-value';
  timeDisplay.style.cssText = `
    font-size: clamp(3rem, 10vw, 7rem);
    font-weight: 300;
    letter-spacing: 0.08em;
    color: var(--text, #f4f7fb);
    line-height: 1;
    margin-bottom: 12px;
  `;
  
  // Display current time - use object.currentTime from backend if available, otherwise generate fresh
  timeDisplay.textContent = object.currentTime || formatTimeNow();

  // Update time every second
  const updateIntervalMs = (object.updatesEverySeconds || 1) * 1000;
  const updateTimer = setInterval(() => {
    timeDisplay.textContent = formatTimeNow();
  }, updateIntervalMs);

  // Store timer ID so it can be cleared when component unmounts
  timeContainer._updateTimer = updateTimer;

  timeContainer.appendChild(timeDisplay);

  if (container) {
    container.innerHTML = '';
    container.appendChild(timeContainer);
  }

  return timeContainer;
}

// Export for use in modules
if (typeof window !== 'undefined') {
  window.renderTimeObject = renderTimeObject;
}
