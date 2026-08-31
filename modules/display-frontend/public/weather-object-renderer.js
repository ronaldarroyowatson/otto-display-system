/**
 * WeatherObject Renderer
 * Displays weather information with icon support
 */

function renderWeatherObject(object, container) {
  const units = object.units === 'C' ? 'C' : 'F';
  const severe = object.severeWeatherOverride === true;
  const iconPack = object.iconPack || 'default';
  const resolvedIcon = object.icon || (iconPack === 'minimal' ? 'cloud' : '☁️');
  const weatherContainer = document.createElement('div');
  weatherContainer.className = 'weather-object-display';
  weatherContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 300px;
    text-align: center;
  `;

  const tempDisplay = document.createElement('div');
  tempDisplay.className = 'weather-temp';
  tempDisplay.style.cssText = `
    font-size: clamp(2.5rem, 8vw, 5rem);
    font-weight: 300;
    color: var(--text, #f4f7fb);
    margin-bottom: 12px;
  `;
  tempDisplay.textContent = `${object.temperature ?? '--'}°${units}`;

  const conditionsDisplay = document.createElement('div');
  conditionsDisplay.className = 'weather-conditions';
  conditionsDisplay.style.cssText = `
    font-size: clamp(1.2rem, 3vw, 1.8rem);
    color: var(--muted, #dfe8f5);
    margin-bottom: 16px;
  `;
  conditionsDisplay.textContent = severe ? 'Severe Weather Override' : (object.conditions ?? 'Unknown');

  const iconDisplay = document.createElement('div');
  iconDisplay.className = 'weather-icon';
  iconDisplay.style.cssText = `
    font-size: clamp(2rem, 6vw, 4rem);
    margin-top: 16px;
  `;
  iconDisplay.textContent = resolvedIcon;

  weatherContainer.appendChild(tempDisplay);
  weatherContainer.appendChild(conditionsDisplay);
  weatherContainer.appendChild(iconDisplay);

  if (container) {
    container.innerHTML = '';
    container.appendChild(weatherContainer);
  }

  return weatherContainer;
}

// Export for use in modules
if (typeof window !== 'undefined') {
  window.renderWeatherObject = renderWeatherObject;
}
