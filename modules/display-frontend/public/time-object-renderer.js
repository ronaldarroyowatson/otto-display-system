function resolveTimeZone(timeSettings) {
  return timeSettings?.timeZone || 'UTC';
}

function toAdjustedDate(timeSettings) {
  const now = new Date();
  if (timeSettings?.useDaylightSavings === false) {
    return new Date(now.getTime() - 60 * 60 * 1000);
  }
  return now;
}

function formatDigital(date, timeSettings) {
  const use12h = timeSettings?.format === '12h';
  const showSeconds = timeSettings?.showSeconds !== false;
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: showSeconds ? '2-digit' : undefined,
    hour12: use12h,
    timeZone: resolveTimeZone(timeSettings)
  });
  let rendered = formatter.format(date);
  if (timeSettings?.leadingZero === false) {
    rendered = rendered.replace(/^0(\d:)/, '$1');
  }
  return rendered;
}

function renderTimeObject(object, container) {
  const timeSettings = object.timeSettings || {};
  const style = timeSettings.style === 'analog' ? 'analog' : 'digital';

  if (container) {
    container.innerHTML = '';
  }

  const renderer = style === 'analog' ? window.renderTimeAnalogObject : window.renderTimeDigitalObject;
  if (typeof renderer !== 'function') {
    const fallback = document.createElement('div');
    fallback.textContent = formatDigital(toAdjustedDate(timeSettings), timeSettings);
    if (container) {
      container.appendChild(fallback);
    }
    return fallback;
  }

  const view = renderer({
    ...object,
    _computedNow: () => toAdjustedDate(timeSettings),
    _formatDigital: (date) => formatDigital(date, timeSettings)
  }, container);

  return view;
}

if (typeof window !== 'undefined') {
  window.renderTimeObject = renderTimeObject;
}
