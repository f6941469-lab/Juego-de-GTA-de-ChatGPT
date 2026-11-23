export type Command = 'interact' | 'vehicle' | 'equip' | 'reload' | 'phone' | 'confirm' | 'back' | 'up' | 'down' | 'left' | 'right';
export type InputContext = 'world' | 'phone' | 'shop' | 'talk' | 'replay';
type Control = 'forward' | 'back' | 'left' | 'right' | 'run' | 'jump' | 'aim' | 'fire';
const keys: Readonly<Record<string, Control>> = {
  KeyW: 'forward', KeyS: 'back', KeyA: 'left', KeyD: 'right',
  ShiftLeft: 'run', ShiftRight: 'run', Space: 'jump',
};
const commands: Readonly<Record<string, Command>> = {
  KeyE: 'interact', KeyF: 'vehicle', Digit1: 'equip', KeyR: 'reload', ArrowUp: 'up',
  ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'confirm', Escape: 'back',
};
interface InputActions {
  onLook(dx: number, dy: number): void;
  onPause(): void;
  onDebug(): void;
  onCommand(command: Command): void;
}
export function createInput(canvas: HTMLCanvasElement, actions: InputActions) {
  const abort = new AbortController();
  const options = { signal: abort.signal };
  const heldKeys = new Set<string>();
  const pointers = new Map<number, Control>();
  let active = false;
  let context: InputContext = 'world';
  let jumpQueued = false;
  let aim = false;
  let fire = false;
  let hadLock = false;
  let drag: { id: number; x: number; y: number } | undefined;
  function clear() {
    heldKeys.clear(); pointers.clear(); jumpQueued = aim = fire = false; drag = undefined;
  }
  function release() {
    hadLock = false;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  }
  function capture() {
    if (!active || context !== 'world' || document.pointerLockElement === canvas) return;
    if (!window.matchMedia('(any-pointer: fine)').matches) return;
    try { void canvas.requestPointerLock?.()?.catch(() => {}); } catch { /* Drag remains available. */ }
  }
  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === canvas;
    if (active && context === 'world' && hadLock && !locked) actions.onPause();
    hadLock = locked;
    if ((!active || context !== 'world') && locked) release();
  }, options);
  window.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.code === 'F3') {
      event.preventDefault(); if (!event.repeat) actions.onDebug(); return;
    }
    if (!active) return;
    const command = commands[event.code];
    if (command) {
      event.preventDefault();
      if (!event.repeat) {
        if (command === 'back' && context === 'world') actions.onPause();
        else actions.onCommand(command === 'up' && context === 'world' ? 'phone' : command);
      }
      return;
    }
    const control = keys[event.code];
    if (context !== 'world' || !control) return;
    event.preventDefault(); heldKeys.add(event.code);
    if (control === 'jump' && !event.repeat) jumpQueued = true;
  }, options);
  window.addEventListener('keyup', (event) => heldKeys.delete(event.code), options);
  window.addEventListener('blur', () => { clear(); if (active) actions.onPause(); }, options);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clear(); if (active) actions.onPause(); }
  }, options);
  document.addEventListener('mousemove', (event) => {
    if (active && context === 'world' && document.pointerLockElement === canvas) actions.onLook(event.movementX, event.movementY);
  }, options);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault(), options);
  // Mouse chords emit mousedown for each button; pointerdown only emits for the first.
  canvas.addEventListener('mousedown', (event) => {
    if (!active || context !== 'world') return;
    if (event.button === 2) aim = true;
    if (event.button === 0 && (document.pointerLockElement === canvas || aim)) fire = true;
  }, options);
  window.addEventListener('mouseup', (event) => {
    if (event.button === 2) aim = false;
    if (event.button === 0) fire = false;
  }, options);
  canvas.addEventListener('pointerdown', (event) => {
    if (!active || context !== 'world') return;
    if (event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    // Pointer capture is invalid while pointer lock is active. Touch drags never fire.
    if (event.pointerType !== 'mouse') canvas.setPointerCapture(event.pointerId);
    if (event.pointerType === 'mouse') capture();
  }, options);
  window.addEventListener('pointerup', (event) => {
    if (event.button === 2) aim = false;
    if (event.button === 0) fire = false;
    pointers.delete(event.pointerId);
    if (drag?.id === event.pointerId) drag = undefined;
  }, options);
  window.addEventListener('pointercancel', clear, options);
  canvas.addEventListener('pointermove', (event) => {
    if (!active || context !== 'world' || drag?.id !== event.pointerId) return;
    if (document.pointerLockElement !== canvas) actions.onLook(event.clientX - drag.x, event.clientY - drag.y);
    drag.x = event.clientX; drag.y = event.clientY;
  }, options);
  canvas.addEventListener('lostpointercapture', () => { drag = undefined; fire = false; }, options);
  for (const button of document.querySelectorAll<HTMLElement>('[data-move], [data-hold]')) {
    const control = (button.dataset.move ?? button.dataset.hold) as Control;
    button.addEventListener('pointerdown', (event) => {
      if (!active || context !== 'world' || event.button !== 0) return;
      event.preventDefault(); button.setPointerCapture(event.pointerId); pointers.set(event.pointerId, control);
      if (control === 'jump') jumpQueued = true;
    }, options);
    button.addEventListener('lostpointercapture', (event) => pointers.delete(event.pointerId), options);
  }
  const held = (control: Control) => [...heldKeys].some((key) => keys[key] === control) || [...pointers.values()].includes(control);
  return {
    setActive(value: boolean) { active = value; clear(); if (!value) release(); },
    setContext(value: InputContext) { context = value; clear(); if (value !== 'world') release(); },
    capture,
    read() {
      const input = {
        x: Number(held('right')) - Number(held('left')), z: Number(held('forward')) - Number(held('back')),
        run: held('run'), jump: jumpQueued, aim: aim || held('aim'), fire: fire || held('fire'),
      };
      jumpQueued = false; return input;
    },
    dispose() { active = false; release(); clear(); abort.abort(); },
  };
}
