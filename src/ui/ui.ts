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
  const entryClock = requiredElement<HTMLTimeElement>("entry-time");
  const hudClock = requiredElement<HTMLTimeElement>("hud-time");
  const debug = requiredElement("debug-panel");
  const minimap = createMinimap(requiredElement<HTMLCanvasElement>("minimap"));
  let mode: GameMode = "loading";
  let hour = gameConfig.initialHour;
  let displayedTime = "";
  let panel: PanelMode = "settings";

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
    if (mode === "start" && previousMode === "loading" && !dialog.open && document.hasFocus()) play.focus({ preventScroll: true });
  }

  function update(state: PlayerMapPosition & { hour: number }) {
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
    if (!hud.hidden) minimap.update(state);
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
    setQuality(value: Quality) {
      quality.value = value;
    },
  };
}
