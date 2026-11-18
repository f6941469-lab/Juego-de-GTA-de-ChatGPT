import "@fontsource/archivo-black/latin-400.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "./menu.css";
import "./hud.css";
import "./dialog.css";
import { gameConfig, type Quality } from "../config/game";
import { createMinimap, type PlayerMapPosition } from "./minimap";

export type GameMode = "loading" | "start" | "playing" | "paused" | "error";
type PanelMode = "settings" | "controls" | "paused";

export interface UIActions {
  onPlay(): void;
  onQuality(quality: Quality): void;
  onHour(hour: number): void;
  onReset(): void;
  onPause?(): void;
  onVolume?(volume: number, muted: boolean): void;
}

interface HudState extends PlayerMapPosition {
  hour: number;
  health?: number;
  driving?: boolean;
  canInteract?: boolean;
  speed?: number;
  wanted?: number;
  policeStatus?: string;
}

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Falta el elemento de interfaz #${id}.`);
  return element as T;
}

function normalizeHour(hour: number): number {
  return ((hour % 24) + 24) % 24;
}

function formatHour(hour: number): string {
  const minutes = Math.floor(normalizeHour(hour) * 60 + 0.00001) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function createUI(actions: UIActions) {
  const canvas = requiredElement<HTMLCanvasElement>("game-canvas");
  const entry = requiredElement("entry");
  const entryStatus = requiredElement("entry-status");
  const hud = requiredElement("hud");
  const play = requiredElement<HTMLButtonElement>("play-button");
  const playLabel = requiredElement("play-label");
  const openSettings = requiredElement<HTMLButtonElement>("open-settings");
  const pause = requiredElement<HTMLButtonElement>("pause-button");
  const dialog = requiredElement<HTMLDialogElement>("game-dialog");
  const dialogTitle = requiredElement("dialog-title");
  const settings = requiredElement("settings-content");
  const controls = requiredElement("controls-content");
  const pauseActions = requiredElement("pause-actions");
  const quality = requiredElement<HTMLSelectElement>("quality-select");
  const timeSlider = requiredElement<HTMLInputElement>("time-slider");
  const timeOutput = requiredElement<HTMLOutputElement>("time-output");
  const volumeSlider = requiredElement<HTMLInputElement>("volume-slider");
  const volumeOutput = requiredElement<HTMLOutputElement>("volume-output");
  const muteToggle = requiredElement<HTMLInputElement>("mute-toggle");
  const wantedLevel = requiredElement("wanted-level");
  const stars = [...wantedLevel.children];
  const wantedStatus = requiredElement("wanted-status");
  const healthMeter = requiredElement<HTMLProgressElement>("health-meter");
  const speedDisplay = requiredElement("speed-display");
  const speedOutput = requiredElement<HTMLOutputElement>("speed-output");
  const prompt = requiredElement("interaction-prompt");
  const promptLabel = requiredElement("interaction-label");
  const touchInteract = requiredElement("touch-interact");
  const touchHorn = requiredElement("touch-horn");
  const touchRun = hud.querySelector<HTMLElement>('[data-move="run"]');
  const touchJump = hud.querySelector<HTMLElement>('[data-move="jump"]');
  const spaceHint = requiredElement("space-hint");
  const hornHint = requiredElement("horn-hint");
  const entryClock = requiredElement<HTMLTimeElement>("entry-time");
  const hudClock = requiredElement<HTMLTimeElement>("hud-time");
  const debug = requiredElement("debug-panel");
  const minimap = createMinimap(requiredElement<HTMLCanvasElement>("minimap"));
  let mode: GameMode = "loading";
  let hour = gameConfig.initialHour;
  let displayedTime = "";
  let panel: PanelMode = "settings";
  let displayedDriving: boolean | undefined;
  let displayedWanted = -1;

  function showVolume() {
    const label = `${volumeSlider.value} %`;
    volumeOutput.value = label;
    volumeSlider.setAttribute("aria-valuetext", label);
  }

  function setVolume(volume: number, muted: boolean) {
    volumeSlider.value = String(Math.round(Math.min(1, Math.max(0, volume)) * 100));
    muteToggle.checked = muted;
    showVolume();
  }

  function changeSound() {
    showVolume();
    actions.onVolume?.(volumeSlider.valueAsNumber / 100, muteToggle.checked);
  }

  function updateTimeLabel() {
    const time = formatHour(hour);
    timeOutput.value = time;
    timeSlider.setAttribute("aria-valuetext", time);
  }

  function syncTimeControl() {
    timeSlider.value = String(normalizeHour(hour));
    updateTimeLabel();
  }

  function openPanel(nextPanel: PanelMode) {
    panel = nextPanel;
    const isControls = panel === "controls";
    dialogTitle.textContent = isControls ? "Controles" : panel === "paused" ? "Partida en pausa" : "Ajustes";
    controls.hidden = !isControls;
    settings.hidden = isControls;
    pauseActions.hidden = panel !== "paused";
    syncTimeControl();
    if (!dialog.open) dialog.showModal();
  }

  function closeDialog() {
    dialog.close();
    if (mode === "paused") actions.onPlay();
  }

  play.addEventListener("click", actions.onPlay);
  openSettings.addEventListener("click", () => openPanel("settings"));
  requiredElement("open-controls").addEventListener("click", () => openPanel("controls"));
  requiredElement("close-dialog").addEventListener("click", closeDialog);
  requiredElement("resume-button").addEventListener("click", closeDialog);
  pause.addEventListener("click", () => actions.onPause?.());
  requiredElement("reset-button").addEventListener("click", actions.onReset);

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog();
  });

  quality.addEventListener("change", () => actions.onQuality(quality.value as Quality));
  requiredElement("audio-settings").hidden = !actions.onVolume;
  volumeSlider.addEventListener("input", changeSound);
  muteToggle.addEventListener("change", changeSound);
  timeSlider.addEventListener("input", () => {
    hour = timeSlider.valueAsNumber;
    updateTimeLabel();
    actions.onHour(hour);
  });

  function setMode(nextMode: GameMode, message?: string) {
    const previousMode = mode;
    mode = nextMode;
    const inWorld = mode === "playing" || mode === "paused";
    hud.hidden = !inWorld;
    entry.hidden = inWorld;
    canvas.tabIndex = mode === "playing" ? 0 : -1;
    play.disabled = mode !== "start";
    openSettings.disabled = mode === "loading" || mode === "error";
    entryStatus.hidden = !message;
    entryStatus.textContent = message ?? "";
    playLabel.textContent = mode === "loading" ? "Preparando el distrito" : mode === "error" ? "Inicio no disponible" : "Explorar distrito";

    if (mode === "paused") {
      openPanel("paused");
    } else if (mode !== "start" || previousMode !== "start") {
      if (dialog.open) dialog.close();
    }

    if (mode === "playing" && previousMode !== mode) canvas.focus({ preventScroll: true });
    if (mode === "start" && previousMode === "loading" && !dialog.open) play.focus({ preventScroll: true });
  }

  function update(state: HudState) {
    const timeChanged = hour !== state.hour;
    hour = state.hour;
    if (timeChanged && dialog.open && !settings.hidden) syncTimeControl();
    const currentTime = formatHour(hour);
    if (displayedTime !== currentTime) {
      displayedTime = currentTime;
      for (const clock of [entryClock, hudClock]) {
        clock.dateTime = currentTime;
        clock.textContent = currentTime;
      }
    }
    if (hud.hidden) return;
    minimap.update(state);

    const driving = state.driving ?? false;
    if (displayedDriving !== driving) {
      displayedDriving = driving;
      speedDisplay.hidden = !driving;
      touchHorn.hidden = hornHint.hidden = !driving;
      if (touchRun) touchRun.hidden = driving;
      if (touchJump) touchJump.textContent = driving ? "Freno de mano" : "Saltar";
      promptLabel.textContent = driving ? "Salir del coche" : "Entrar al coche";
      touchInteract.textContent = driving ? "Salir" : "Entrar";
      spaceHint.textContent = driving ? "Freno de mano" : "Saltar";
    }
    prompt.hidden = touchInteract.hidden = !state.canInteract;
    if (driving) {
      const speed = String(Math.max(0, Math.round(state.speed ?? 0)));
      if (speedOutput.value !== speed) speedOutput.value = speed;
    }

    const wanted = Math.max(0, Math.min(5, Math.trunc(state.wanted ?? 0)));
    if (displayedWanted !== wanted) {
      displayedWanted = wanted;
      wantedLevel.setAttribute("aria-label", `Búsqueda: ${wanted} de 5 estrellas`);
      stars.forEach((star, index) => {
        star.classList.toggle("wanted-star-active", index < wanted);
        star.textContent = index < wanted ? "★" : "☆";
      });
    }
    const status = state.policeStatus ?? "Patrullaje";
    if (wantedStatus.textContent !== status) wantedStatus.textContent = status;
    const health = Math.max(0, Math.min(100, Math.ceil(state.health ?? 100)));
    if (healthMeter.value !== health) {
      healthMeter.value = health;
      healthMeter.textContent = `${health} %`;
    }
  }

  function setDebug(message: string | null) {
    debug.hidden = message === null;
    if (debug.textContent !== (message ?? "")) debug.textContent = message ?? "";
  }

  setMode("loading");
  return {
    setMode,
    setWorld: minimap.setWorld,
    update,
    setDebug,
    setVolume,
    setQuality(value: Quality) {
      quality.value = value;
    },
  };
}
