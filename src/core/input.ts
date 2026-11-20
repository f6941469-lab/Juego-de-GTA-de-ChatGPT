import type { PhoneCommand } from '../simulation/phone'

type Action = 'interact' | 'horn' | 'challenge' | 'reload' | 'cycleWeapon'

const actionKeys: Readonly<Record<string, Action>> = {
  KeyE: 'interact',
  KeyH: 'horn',
  KeyB: 'challenge',
  KeyR: 'reload',
  KeyQ: 'cycleWeapon',
}

type Control = 'forward' | 'back' | 'left' | 'right' | 'run' | 'jump' | 'aim' | 'fire'

const keys: Readonly<Record<string, Control>> = {
  KeyW: 'forward',
  KeyS: 'back',
  KeyA: 'left',
  KeyD: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
  Space: 'jump',
  KeyF: 'aim',
  KeyG: 'fire',
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
  let phoneOpen = false
  let jumpQueued = false
  let fireQueued = false
  let weaponSlot: 0 | 1 | 2 | undefined
  let phoneCommand: PhoneCommand | undefined
  let mouseAim = false
  let mouseFire = false
  const queuedActions = new Set<Action>()
  let hadLock = false
  let drag: { pointerId: number; x: number; y: number } | null = null

  const clear = () => {
    heldKeys.clear()
    heldPointers.clear()
    jumpQueued = false
    fireQueued = false
    weaponSlot = undefined
    phoneCommand = undefined
    mouseAim = false
    mouseFire = false
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
      if (phoneOpen && !event.repeat) {
        phoneCommand = 'toggle'
      } else {
        actions.onPause()
      }
      return
    }

    if (event.code === 'KeyM') {
      event.preventDefault()
      if (!event.repeat) phoneCommand = 'toggle'
      return
    }
    if (event.code === 'ArrowUp' || event.code === 'ArrowDown' || event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
      event.preventDefault()
      if (!event.repeat) {
        if (event.code === 'ArrowUp') phoneCommand = phoneOpen ? 'up' : 'toggle'
        else if (phoneOpen) {
          phoneCommand = event.code === 'ArrowDown'
            ? 'down'
            : event.code === 'ArrowLeft'
              ? 'left'
              : 'right'
        }
      }
      return
    }
    if (phoneOpen && (event.code === 'Enter' || event.code === 'Backspace')) {
      event.preventDefault()
      if (!event.repeat) phoneCommand = event.code === 'Enter' ? 'select' : 'back'
      return
    }

    if (event.shiftKey && /^Digit[0-5]$/.test(event.code)) {
      if (!event.repeat) actions.onDebugWanted(Number(event.code.at(-1)))
      return
    }
    if (!event.shiftKey && (event.code === 'Digit1' || event.code === 'Digit2' || event.code === 'Digit3')) {
      event.preventDefault()
      if (!event.repeat) weaponSlot = (Number(event.code.at(-1)) - 1) as 0 | 1 | 2
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
    if (control === 'fire' && !event.repeat) fireQueued = true
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
  canvas.addEventListener('contextmenu', (event) => {
    if (active) event.preventDefault()
  })
  canvas.addEventListener('pointerdown', (event) => {
    if (!active) return
    if (event.button === 2) {
      event.preventDefault()
      mouseAim = true
      return
    }
    if (event.button !== 0) return
    if (document.pointerLockElement === canvas || mouseAim || heldKeys.has('KeyF')) {
      mouseFire = true
      fireQueued = true
      return
    }
    if (!drag) {
      drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
      canvas.setPointerCapture(event.pointerId)
      if (event.pointerType === 'mouse') lockPointer()
    }
  })
  canvas.addEventListener('pointerup', (event) => {
    if (event.button === 2) mouseAim = false
    if (event.button === 0) mouseFire = false
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
      if (control === 'fire') fireQueued = true
    })
    button.addEventListener('lostpointercapture', (event) => heldPointers.delete(event.pointerId))
  }

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-action]')) {
    button.addEventListener('click', () => {
      if (!active) return
      const act = button.dataset.action
      if (act === 'fire') {
        fireQueued = true
      } else if (act === 'togglePhone') {
        phoneCommand = 'toggle'
      } else if (act) {
        queuedActions.add(act as Action)
      }
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
    setPhoneOpen(value: boolean) {
      phoneOpen = value
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
        aim: mouseAim || isHeld('aim'),
        fire: fireQueued || mouseFire || isHeld('fire'),
        reload: queuedActions.has('reload'),
        cycleWeapon: queuedActions.has('cycleWeapon'),
        weaponSlot,
        phoneCommand,
      }
      jumpQueued = false
      fireQueued = false
      weaponSlot = undefined
      phoneCommand = undefined
      queuedActions.clear()
      return input
    },
  }
}
