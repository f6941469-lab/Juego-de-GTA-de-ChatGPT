import "@fontsource/archivo-black/latin-400.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "./menu.css";
import "./hud.css";
import "./dialog.css";
import { gameConfig, type Quality } from "../config/game";
import type { PhoneCommand, PhoneSnapshot } from "../simulation/phone";
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
  onPhoneCommand?(command: PhoneCommand): void;
}

interface HudState extends PlayerMapPosition {
  hour: number;
  district?: string;
  health?: number;
  cash?: number;
  weaponLabel?: string;
  aiming?: boolean;
  armed?: boolean;
  driving?: boolean;
  canInteract?: boolean;
  interactionLabel?: string;
  touchInteractionLabel?: string;
  notice?: string | null;
  speed?: number;
  wanted?: number;
  policeStatus?: string;
  phone?: PhoneSnapshot;
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
  const cashDisplay = requiredElement("cash-display");
  const weaponDisplay = requiredElement("weapon-display");
  const aimReticle = requiredElement("aim-reticle");
  const speedDisplay = requiredElement("speed-display");
  const speedOutput = requiredElement<HTMLOutputElement>("speed-output");
  const prompt = requiredElement("interaction-prompt");
  const promptLabel = requiredElement("interaction-label");
  const touchInteract = requiredElement("touch-interact");
  const touchHorn = requiredElement("touch-horn");
  const touchWeapon = requiredElement("touch-weapon");
  const touchFire = requiredElement("touch-fire");
  const touchRun = hud.querySelector<HTMLElement>('[data-move="run"]');
  const touchJump = hud.querySelector<HTMLElement>('[data-move="jump"]');
  const spaceHint = requiredElement("space-hint");
  const hornHint = requiredElement("horn-hint");
  const combatHint = requiredElement("combat-hint");
  const entryClock = requiredElement<HTMLTimeElement>("entry-time");
  const hudDistrict = requiredElement("hud-district");
  const hudNotice = requiredElement("hud-notice");
  const hudClock = requiredElement<HTMLTimeElement>("hud-time");
  const phoneDevice = requiredElement("phone-device");
  const phoneTime = requiredElement<HTMLTimeElement>("phone-time");
  const phoneDistrict = requiredElement("phone-district");
  const phoneBattery = requiredElement("phone-battery");
  const phoneBanner = requiredElement("phone-banner");
  const phoneScreen = requiredElement("phone-screen");
  const debug = requiredElement("debug-panel");
  const minimap = createMinimap(requiredElement<HTMLCanvasElement>("minimap"));
  let mode: GameMode = "loading";
  let hour = gameConfig.initialHour;
  let displayedTime = "";
  let displayedDistrict = "";
  let displayedCash = -1;
  let displayedWeapon = "";
  let displayedPhoneSig = "";
  let panel: PanelMode = "settings";
  let displayedDriving: boolean | undefined;
  let displayedWanted = -1;

  phoneDevice.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-phone-cmd]");
    const cmd = target?.dataset.phoneCmd as PhoneCommand | undefined;
    if (cmd) actions.onPhoneCommand?.(cmd);
  });

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

    const districtName = state.district ?? "Costa Palmera";
    if (displayedDistrict !== districtName) {
      displayedDistrict = districtName;
      hudDistrict.textContent = districtName;
    }

    const noticeText = state.notice ?? "";
    hudNotice.hidden = noticeText.length === 0;
    if (hudNotice.textContent !== noticeText) hudNotice.textContent = noticeText;

    const driving = state.driving ?? false;
    if (displayedDriving !== driving) {
      displayedDriving = driving;
      speedDisplay.hidden = !driving;
      touchHorn.hidden = hornHint.hidden = !driving;
      touchWeapon.hidden = combatHint.hidden = driving;
      if (touchRun) touchRun.hidden = driving;
      if (touchJump) touchJump.textContent = driving ? "Freno de mano" : "Saltar";
      spaceHint.textContent = driving ? "Freno de mano" : "Saltar";
    }
    touchFire.hidden = driving || !state.armed;
    aimReticle.hidden = driving || !state.aiming;
    const cash = Math.max(0, Math.round(state.cash ?? 0));
    if (displayedCash !== cash) {
      displayedCash = cash;
      cashDisplay.textContent = `$${cash.toLocaleString("es")}`;
    }
    const weaponText = state.weaponLabel ?? "Desarmado";
    if (displayedWeapon !== weaponText) {
      displayedWeapon = weaponText;
      weaponDisplay.textContent = weaponText;
    }

    const nextPromptLabel = state.interactionLabel ?? (driving ? "Salir del coche" : "Entrar al coche");
    if (promptLabel.textContent !== nextPromptLabel) promptLabel.textContent = nextPromptLabel;
    const nextTouchLabel = state.touchInteractionLabel ?? (driving ? "Salir" : "Entrar");
    if (touchInteract.textContent !== nextTouchLabel) touchInteract.textContent = nextTouchLabel;
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

    const phone = state.phone;
    phoneDevice.hidden = !phone || !phone.open;
    if (phone && phone.open) {
      if (phoneTime.textContent !== phone.timeText) phoneTime.textContent = phone.timeText;
      if (phoneDistrict.textContent !== phone.district) phoneDistrict.textContent = phone.district;
      const batLabel = `5G · ${phone.battery} %`;
      if (phoneBattery.textContent !== batLabel) phoneBattery.textContent = batLabel;
      if (phoneBanner.textContent !== phone.statusBanner) phoneBanner.textContent = phone.statusBanner;

      const clipSig = phone.clips.map((c) => `${c.id}:${c.views}`).join(",");
      const alertSig = phone.alerts.map((a) => `${a.id}:${a.message}`).join(",");
      const nextSig = `${phone.screen}|${phone.selectedIndex}|${phone.recording ? 1 : 0}|${Math.floor(phone.recordingSeconds)}|${phone.detectedSubject}|${clipSig}|${alertSig}`;
      if (displayedPhoneSig !== nextSig) {
        displayedPhoneSig = nextSig;
        phoneScreen.replaceChildren();
        if (phone.screen === "home") {
          const grid = document.createElement("div");
          grid.className = "phone-grid";
          const apps: readonly { cmd: PhoneCommand; label: string }[] = [
            { cmd: "openCamera", label: phone.recording ? "● Cámara REC" : "Cámara" },
            { cmd: "openFeed", label: `Social (${phone.clips.length})` },
            { cmd: "openEmergency", label: "Emerg. 911" },
            { cmd: "openAlerts", label: `Ciudad (${phone.alerts.length})` },
          ];
          apps.forEach((app, idx) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "phone-app-btn";
            btn.dataset.phoneCmd = app.cmd;
            btn.dataset.selected = String(phone.selectedIndex === idx);
            btn.textContent = app.label;
            grid.appendChild(btn);
          });
          phoneScreen.appendChild(grid);
        } else if (phone.screen === "camera") {
          const card = document.createElement("div");
          card.className = "phone-card";
          const strong = document.createElement("strong");
          strong.textContent = phone.recording ? `● REC ${phone.recordingSeconds.toFixed(1)} s` : "Visor en directo";
          const sub = document.createElement("span");
          sub.textContent = phone.detectedSubject;
          card.append(strong, sub);

          const actionBtn = document.createElement("button");
          actionBtn.type = "button";
          actionBtn.className = phone.recording ? "phone-action-btn recording" : "phone-action-btn";
          actionBtn.dataset.phoneCmd = "select";
          actionBtn.dataset.selected = "true";
          actionBtn.textContent = phone.recording ? "Detener y publicar" : "Iniciar grabación";
          phoneScreen.append(card, actionBtn);
        } else if (phone.screen === "feed") {
          for (const [idx, clip] of phone.clips.entries()) {
            const card = document.createElement("div");
            card.className = "phone-card";
            card.dataset.selected = String(phone.selectedIndex === idx);
            const strong = document.createElement("strong");
            strong.textContent = clip.title;
            const meta = document.createElement("small");
            meta.textContent = `${clip.category} · ${clip.views.toLocaleString("es")} vistas`;
            card.append(strong, meta);
            phoneScreen.appendChild(card);
          }
        } else if (phone.screen === "emergency") {
          const items = ["Llamar al 911 (Patrulla)", "Pedir asistencia (+15 Salud)"];
          items.forEach((label, idx) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "phone-action-btn";
            btn.dataset.phoneCmd = "select";
            btn.dataset.selected = String(phone.selectedIndex === idx);
            btn.textContent = label;
            phoneScreen.appendChild(btn);
          });
        } else {
          for (const alert of phone.alerts) {
            const card = document.createElement("div");
            card.className = "phone-card";
            const strong = document.createElement("strong");
            strong.textContent = alert.timeText;
            const msg = document.createElement("span");
            msg.textContent = alert.message;
            card.append(strong, msg);
            phoneScreen.appendChild(card);
          }
        }
      }
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
