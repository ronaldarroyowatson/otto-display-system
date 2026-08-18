const role = new URLSearchParams(window.location.search).get("role") ?? "hallway";

const roleTitle = document.getElementById("role-title");
const phase = document.getElementById("phase");
const countdown = document.getElementById("countdown");

const roleTemplates = {
  hallway: "Hallway Display",
  sidewall: "Sidewall Display",
  backwall: "Backwall Display"
};

roleTitle.textContent = roleTemplates[role] ?? "Otto Display";

function formatSeconds(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

async function fetchCurrent() {
  try {
    const response = await fetch(`/display/${role}/current`);
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const payload = await response.json();
    phase.textContent = `Current phase: ${payload.currentPhase}`;
    countdown.textContent = formatSeconds(payload.countdownSeconds ?? 0);
  } catch (error) {
    phase.textContent = `Unable to load current state: ${error.message}`;
    countdown.textContent = "--:--";
  }
}

fetchCurrent();
setInterval(fetchCurrent, 15000);
