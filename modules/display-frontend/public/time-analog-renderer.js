function renderClockHands(canvas, date) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const r = Math.min(w, h) / 2 - 8;
  const cx = w / 2;
  const cy = h / 2;

  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#f4f7fb';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  const seconds = date.getSeconds();
  const minutes = date.getMinutes() + seconds / 60;
  const hours = (date.getHours() % 12) + minutes / 60;

  const drawHand = (value, max, length, width, color) => {
    const angle = (Math.PI * 2 * value) / max - Math.PI / 2;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
    ctx.stroke();
  };

  drawHand(hours, 12, r * 0.5, 5, '#ffd166');
  drawHand(minutes, 60, r * 0.75, 4, '#9be7ff');
  drawHand(seconds, 60, r * 0.85, 2, '#ff6b6b');
}

function renderTimeAnalogObject(object, container) {
  const shell = document.createElement('div');
  shell.className = 'time-object-display time-object-display-analog';
  shell.style.cssText = `
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 300px;
    text-align: center;
    gap: 8px;
  `;

  const canvas = document.createElement('canvas');
  canvas.width = 260;
  canvas.height = 260;
  canvas.style.maxWidth = '80vw';

  const label = document.createElement('div');
  label.style.cssText = 'opacity: 0.8; font-size: 0.9rem;';
  label.textContent = object.timeSettings?.timeZone || 'UTC';

  const update = () => {
    const now = typeof object._computedNow === 'function' ? object._computedNow() : new Date();
    renderClockHands(canvas, now);
  };

  update();
  const updateTimer = setInterval(update, (object.updatesEverySeconds || 1) * 1000);
  shell._updateTimer = updateTimer;

  shell.appendChild(canvas);
  shell.appendChild(label);
  if (container) {
    container.appendChild(shell);
  }
  return shell;
}

if (typeof window !== 'undefined') {
  window.renderTimeAnalogObject = renderTimeAnalogObject;
}
