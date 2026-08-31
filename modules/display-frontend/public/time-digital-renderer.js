function renderTimeDigitalObject(object, container) {
  const shell = document.createElement('div');
  shell.className = 'time-object-display time-object-display-digital';
  shell.style.cssText = `
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 300px;
    font-family: "ui-monospace", "SFMono-Regular", "Courier New", monospace;
    text-align: center;
  `;

  const value = document.createElement('div');
  value.className = 'time-display-value';
  value.style.cssText = `
    font-size: clamp(3rem, 10vw, 7rem);
    font-weight: 300;
    letter-spacing: 0.08em;
    color: var(--text, #f4f7fb);
    line-height: 1;
    margin-bottom: 12px;
  `;

  const timeZone = object.timeSettings?.timeZone || 'UTC';
  const tzLabel = document.createElement('div');
  tzLabel.className = 'time-zone-label';
  tzLabel.style.cssText = 'opacity: 0.8; font-size: 0.9rem;';
  tzLabel.textContent = timeZone;

  const update = () => {
    const now = typeof object._computedNow === 'function' ? object._computedNow() : new Date();
    const formatted = typeof object._formatDigital === 'function' ? object._formatDigital(now) : now.toISOString();
    value.textContent = formatted;
  };

  update();
  const updateTimer = setInterval(update, (object.updatesEverySeconds || 1) * 1000);
  shell._updateTimer = updateTimer;

  shell.appendChild(value);
  shell.appendChild(tzLabel);
  if (container) {
    container.appendChild(shell);
  }
  return shell;
}

if (typeof window !== 'undefined') {
  window.renderTimeDigitalObject = renderTimeDigitalObject;
}
