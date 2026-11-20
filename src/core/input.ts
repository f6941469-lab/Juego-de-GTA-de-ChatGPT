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
  const listeners = new AbortController()
  const { signal } = listeners
  const heldKeys = new Set<string>()
  const heldPointers = new Map<number, Control>()
  let active = false
  let phoneOpen = false
  let jumpQueued = false
  let fireQueued = false
  let weaponSlot: 0 | 1 | 2 | undefined
  const phoneCommands: PhoneCommand[] = []
  const queuePhone = (command: PhoneCommand) => { if (phoneCommands.length < 16) phoneCommands.push(command) }
  let mouseAim = false
  let mouseFire = false
  const queuedActions = new Set<Action>()
  let hadLock = false
  let drag: { pointerId: number; x: number; y: number } | null = null

  const clear = (clearPhone = true) => {
    heldKeys.clear()
    heldPointers.clear()
    jumpQueued = false
    fireQueued = false
    weaponSlot = undefined
    if (clearPhone) phoneCommands.length = 0
    mouseAim = false
    mouseFire = false
    queuedActions.clear()
    drag = null
  }

  function lockPointer() {
    if (!active || phoneOpen || document.pointerLockElement === canvas) return
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
    if (active && !phoneOpen && hadLock && !locked) actions.onPause()
    hadLock = locked
    if ((!active || phoneOpen) && locked) document.exitPointerLock()
  }, { signal })

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
      if (!event.repeat) {
        if (phoneOpen) queuePhone('back')
        else actions.onPause()
      }
      return
    }

    if (event.code === 'KeyM') {
      event.preventDefault()
      if (!event.repeat) queuePhone('toggle')
      return
    }
    if (event.code === 'ArrowUp' || event.code === 'ArrowDown' || event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
      event.preventDefault()
      if (!event.repeat) {
        if (event.code === 'ArrowUp') queuePhone(phoneOpen ? 'up' : 'toggle')
        else if (phoneOpen) {
          queuePhone(event.code === 'ArrowDown'
            ? 'down'
            : event.code === 'ArrowLeft'
              ? 'left'
              : 'right')
        }
      }
      return
    }
    if (phoneOpen && (event.code === 'Enter' || event.code === 'Backspace')) {
      event.preventDefault()
      if (!event.repeat) queuePhone(event.code === 'Enter' ? 'select' : 'back')
      return
    }
    if (phoneOpen) return

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
  }, { signal })

  window.addEventListener('keyup', (event) => heldKeys.delete(event.code), { signal })
  window.addEventListener('blur', () => { clear(); if (active) actions.onPause() }, { signal })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clear(); if (active) actions.onPause() }
  }, { signal })
  document.addEventListener('mousemove', (event) => {
    if (active && !phoneOpen && document.pointerLockElement === canvas) {
      actions.onLook(event.movementX, event.movementY)
    }
  }, { signal })
  canvas.addEventListener('contextmenu', (event) => {
    if (active) event.preventDefault()
  }, { signal })
  // Pointerdown only fires for the first button of a mouse chord.
  canvas.addEventListener('mousedown', (event) => {
    if (!active || phoneOpen) return
    if (event.button === 2) {
      event.preventDefault()
      mouseAim = true
    }
    if (event.button === 0 && (document.pointerLockElement === canvas || mouseAim || heldKeys.has('KeyF'))) {
      mouseFire = true
      fireQueued = true
    }
  }, { signal })
  window.addEventListener('mouseup', (event) => {
    if (event.button === 2) mouseAim = false
    if (event.button === 0) mouseFire = false
  }, { signal })
  canvas.addEventListener('pointerdown', (event) => {
    if (!active || phoneOpen || event.button !== 0 || document.pointerLockElement === canvas) return
    if (!drag) {
      drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
      if (event.pointerType !== 'mouse') canvas.setPointerCapture(event.pointerId)
      if (event.pointerType === 'mouse') lockPointer()
    }
  }, { signal })
  window.addEventListener('pointerup', (event) => {
    heldPointers.delete(event.pointerId)
    if (drag?.pointerId === event.pointerId) drag = null
  }, { signal })
  window.addEventListener('pointercancel', () => clear(), { signal })
  canvas.addEventListener('pointermove', (event) => {
    if (!active || phoneOpen || !drag || drag.pointerId !== event.pointerId) return
    if (document.pointerLockElement !== canvas) {
      actions.onLook(event.clientX - drag.x, event.clientY - drag.y)
    }
    drag.x = event.clientX
    drag.y = event.clientY
  }, { signal })
  canvas.addEventListener('lostpointercapture', (event) => {
    if (drag?.pointerId === event.pointerId) drag = null
  }, { signal })

  for (const button of document.querySelectorAll<HTMLElement>('[data-move]')) {
    const control = button.dataset.move as Control
    button.addEventListener('pointerdown', (event) => {
      if (!active || phoneOpen || event.button !== 0) return
      event.preventDefault()
      button.setPointerCapture(event.pointerId)
      heldPointers.set(event.pointerId, control)
      if (control === 'jump') jumpQueued = true
      if (control === 'fire') fireQueued = true
    }, { signal })
    button.addEventListener('lostpointercapture', (event) => heldPointers.delete(event.pointerId), { signal })
  }

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-action]')) {
    button.addEventListener('click', () => {
      if (!active) return
      const act = button.dataset.action
      if (phoneOpen && act !== 'togglePhone') return
      if (act === 'fire') {
        fireQueued = true
      } else if (act === 'togglePhone') {
        queuePhone('toggle')
      } else if (act) {
        queuedActions.add(act as Action)
      }
    }, { signal })
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
      if (phoneOpen === value) return
      clear(false)
      phoneOpen = value
      if (value) {
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
        aim: mouseAim || isHeld('aim'),
        fire: fireQueued || mouseFire || isHeld('fire'),
        reload: queuedActions.has('reload'),
        cycleWeapon: queuedActions.has('cycleWeapon'),
        weaponSlot,
        phoneCommand: phoneCommands.shift(),
      }
      jumpQueued = false
      fireQueued = false
      weaponSlot = undefined
      queuedActions.clear()
      return input
    },
    dispose() {
      active = false
      hadLock = false
      clear()
      listeners.abort()
      if (document.pointerLockElement === canvas) document.exitPointerLock()
    },
  }
}
