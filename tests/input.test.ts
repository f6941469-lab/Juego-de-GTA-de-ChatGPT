import { afterEach, expect, it, vi } from 'vitest';
import { createInput } from '../src/core/input';

function event(type: string, fields: Record<string, unknown> = {}) { const result = new Event(type, { cancelable: true }); Object.assign(result, fields); return result; }
function setup() {
  const canvas = Object.assign(new EventTarget(), { setPointerCapture: vi.fn(), requestPointerLock: vi.fn(() => Promise.resolve()) });
  const document = Object.assign(new EventTarget(), { pointerLockElement: canvas as typeof canvas | null, hidden: false, querySelectorAll: () => [], exitPointerLock: vi.fn(() => { document.pointerLockElement = null; }) });
  const window = Object.assign(new EventTarget(), { matchMedia: () => ({ matches: true }) });
  vi.stubGlobal('document', document); vi.stubGlobal('window', window);
  const actions = { onLook: vi.fn(), onPause: vi.fn(), onDebug: vi.fn(), onDebugOverlay: vi.fn(), onDebugWanted: vi.fn() };
  const input = createInput(canvas as unknown as HTMLCanvasElement, actions); input.setActive(true);
  return { input, canvas, document, window, actions };
}
afterEach(() => vi.unstubAllGlobals());

it('fires the left mouse button while right is held, without an additional pointerdown or invalid pointer capture', () => {
  const { input, canvas, window } = setup();
  try {
    canvas.dispatchEvent(event('pointerdown', { button: 2, pointerType: 'mouse', pointerId: 1 }));
    canvas.dispatchEvent(event('mousedown', { button: 2 }));
    canvas.dispatchEvent(event('mousedown', { button: 0 }));
    expect(input.read()).toMatchObject({ aim: true, fire: true });
    expect(canvas.setPointerCapture).not.toHaveBeenCalled();
    window.dispatchEvent(event('mouseup', { button: 0 })); expect(input.read()).toMatchObject({ aim: true, fire: false });
    window.dispatchEvent(event('mouseup', { button: 2 })); expect(input.read()).toMatchObject({ aim: false, fire: false });
  } finally { input.dispose(); }
});
it('keeps a capture click and a touch camera drag from firing; allows deliberate aimed fire without pointer lock', () => {
  const { input, canvas, document, window } = setup(); document.pointerLockElement = null;
  try {
    canvas.dispatchEvent(event('pointerdown', { button: 0, pointerType: 'mouse', pointerId: 1, clientX: 2, clientY: 3 }));
    canvas.dispatchEvent(event('mousedown', { button: 0 })); expect(input.read().fire).toBe(false);
    window.dispatchEvent(event('pointerup', { button: 0, pointerId: 1 }));
    canvas.dispatchEvent(event('pointerdown', { button: 0, pointerType: 'touch', pointerId: 2, clientX: 2, clientY: 3 }));
    expect(input.read().fire).toBe(false); expect(canvas.setPointerCapture).toHaveBeenCalledWith(2);
    canvas.dispatchEvent(event('mousedown', { button: 2 })); canvas.dispatchEvent(event('mousedown', { button: 0 }));
    expect(input.read()).toMatchObject({ aim: true, fire: true });
  } finally { input.dispose(); }
});
it('reserves arrows for the phone, clears held inputs in panels and routes Escape to back', () => {
  const { input, window, actions } = setup();
  try {
    window.dispatchEvent(event('keydown', { code: 'KeyW' })); expect(input.read().z).toBe(1);
    window.dispatchEvent(event('keydown', { code: 'ArrowUp' })); expect(input.read().phoneCommand).toBe('toggle');
    input.setPhoneOpen(true); window.dispatchEvent(event('keydown', { code: 'KeyW' })); expect(input.read().z).toBe(0);
    window.dispatchEvent(event('keydown', { code: 'Escape' })); expect(input.read().phoneCommand).toBe('back');
    expect(actions.onPause).not.toHaveBeenCalled();
    input.setPhoneOpen(false); window.dispatchEvent(event('keydown', { code: 'Escape' })); expect(actions.onPause).toHaveBeenCalledOnce();
    window.dispatchEvent(event('blur')); expect(input.read()).toMatchObject({ x: 0, z: 0, aim: false, fire: false });
  } finally { input.dispose(); }
});
it('preserves rapid phone navigation commands across simulation ticks and panel state changes', () => {
  const { input, window } = setup();
  try {
    input.setPhoneOpen(true);
    window.dispatchEvent(event('keydown', { code: 'Escape' }));
    window.dispatchEvent(event('keydown', { code: 'Escape' }));
    expect(input.read().phoneCommand).toBe('back');
    expect(input.read().phoneCommand).toBe('back');
    expect(input.read().phoneCommand).toBeUndefined();
  } finally { input.dispose(); }
});
