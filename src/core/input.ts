type Action = 'interact' | 'horn' | 'challenge'

const actionKeys: Readonly<Record<string, Action>> = { KeyE: 'interact', KeyH: 'horn', KeyB: 'challenge' }

type Control = 'forward' | 'back' | 'left' | 'right' | 'run' | 'jump'

const keys: Readonly<Record<string, Control>> = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
  Space: 'jump',
}

interface InputActions {
  onLook(dx: number, dy: number): void
  onPause(): void
  onDebug(): void
  onDebugOverlay(): void
  onDebugInspector?(): void
  onDebugWanted(level: number): void
}

export function createInput(canvas: HTMLCanvasElement, actions: InputActions) {
  const heldKeys = new Set<string>()
  const heldPointers = new Map<number, Control>()
  let active = false
  let jumpQueued = false
  const queuedActions = new Set<Action>()
  let hadLock = false
  let drag: { pointerId: number; x: number; y: number } | null = null

  const clear = () => {
    heldKeys.clear()
    heldPointers.clear()
    jumpQueued = false
    queuedActions.clear()
    drag = null
  }

  function lockPointer() {
    if (!active || document.pointerLockElement === canvas) return
    try {
      const request = canvas.requestPointerLock?.()
      // Dragging the canvas still works if the browser disallows pointer lock.
      void request?.catch(() => {})
    } catch {
      // Some embedding contexts throw instead of returning a promise.
    }
  }

  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === canvas
    if (active && hadLock && !locked) actions.onPause()
    hadLock = locked
    if (!active && locked) document.exitPointerLock()
  })

  window.addEventListener('keydown', (event) => {
    if ((event.code === 'F3' || event.code === 'F4' || event.code === 'F5') && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault()
      if (!event.repeat) {
        if (event.code === 'F3') actions.onDebug()
        else if (event.code === 'F4') actions.onDebugOverlay()
        else actions.onDebugInspector?.()
      }
      return
    }
    if (!active || event.ctrlKey || event.altKey || event.metaKey) return
    if (event.code === 'Escape') {
      event.preventDefault()
      actions.onPause()
      return
    }

    if (event.shiftKey && /^Digit[0-5]$/.test(event.code)) {
      if (!event.repeat) actions.onDebugWanted(Number(event.code.at(-1)))
      return
    }
    const action = actionKeys[event.code]
    if (action) {
      event.preventDefault()
      if (!event.repeat) queuedActions.add(action)
      return
    }
    const control = keys[event.code]
    if (!control) return
    event.preventDefault()
    heldKeys.add(event.code)
    if (control === 'jump' && !event.repeat) jumpQueued = true
  })

  window.addEventListener('keyup', (event) => heldKeys.delete(event.code))
  window.addEventListener('blur', clear)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clear()
  })
  document.addEventListener('mousemove', (event) => {
    if (active && document.pointerLockElement === canvas) {
      actions.onLook(event.movementX, event.movementY)
    }
  })
  canvas.addEventListener('pointerdown', (event) => {
    if (!active || event.button !== 0 || drag) return
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
    canvas.setPointerCapture(event.pointerId)
    if (event.pointerType === 'mouse') lockPointer()
  })
  canvas.addEventListener('pointermove', (event) => {
    if (!active || !drag || drag.pointerId !== event.pointerId) return
    if (document.pointerLockElement !== canvas) {
      actions.onLook(event.clientX - drag.x, event.clientY - drag.y)
    }
    drag.x = event.clientX
    drag.y = event.clientY
  })
  canvas.addEventListener('lostpointercapture', (event) => {
    if (drag?.pointerId === event.pointerId) drag = null
  })

  for (const button of document.querySelectorAll<HTMLElement>('[data-move]')) {
    const control = button.dataset.move as Control
    button.addEventListener('pointerdown', (event) => {
      if (!active || event.button !== 0) return
      event.preventDefault()
      button.setPointerCapture(event.pointerId)
      heldPointers.set(event.pointerId, control)
      if (control === 'jump') jumpQueued = true
    })
    button.addEventListener('lostpointercapture', (event) => heldPointers.delete(event.pointerId))
  }

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-action]')) {
    button.addEventListener('click', () => {
      if (active) queuedActions.add(button.dataset.action as Action)
    })
  }

  const isHeld = (control: Control) => {
    for (const key of heldKeys) if (keys[key] === control) return true
    for (const pointer of heldPointers.values()) if (pointer === control) return true
    return false
  }

  return {
    setActive(value: boolean) {
      active = value
      clear()
      if (!value) {
        hadLock = false
        if (document.pointerLockElement === canvas) document.exitPointerLock()
      }
    },
    capture() {
      if (window.matchMedia('(any-pointer: fine)').matches) lockPointer()
    },
    read() {
      const input = {
        x: Number(isHeld('right')) - Number(isHeld('left')),
        z: Number(isHeld('forward')) - Number(isHeld('back')),
        run: isHeld('run'),
        jump: jumpQueued,
        handbrake: isHeld('jump'),
        interact: queuedActions.has('interact'),
        horn: queuedActions.has('horn'),
        challenge: queuedActions.has('challenge'),
      }
      jumpQueued = false
      queuedActions.clear()
      return input
    },
  }
}
