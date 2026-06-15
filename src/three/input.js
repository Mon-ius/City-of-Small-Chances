// Keyboard + pointer input for the harbour. Pure DOM; no Three.js here.
//
// Movement keys are read as a live held-key set (WASD + arrows). A pointer drag
// on the canvas yaws the follow camera. Everything is gated so it never fights
// the browser (we ignore keys while a form field is focused, though the game has
// none yet) and cleans up after itself.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    // One-shot actions (interact / cancel), edge-triggered and consumed once.
    this._actions = [];
    // Accumulated drag, consumed by the camera each frame.
    this.dragYaw = 0;
    this.dragPitch = 0;
    this._dragging = false;
    this._lastX = 0;
    this._lastY = 0;

    this._onKeyDown = (e) => {
      if (this._typing(e.target)) return;
      const act = this._action(e);
      if (act) {
        this._actions.push(act);
        if (act === "interact") e.preventDefault();
        return;
      }
      const k = this._code(e);
      if (!k) return;
      this.keys.add(k);
      // Stop arrow keys / space from scrolling — belt and braces atop overflow:hidden.
      if (k === "up" || k === "down" || k === "left" || k === "right") e.preventDefault();
    };
    this._onKeyUp = (e) => {
      const k = this._code(e);
      if (k) this.keys.delete(k);
    };
    this._onBlur = () => this.keys.clear();

    this._onPointerDown = (e) => {
      this._dragging = true;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
      canvas.setPointerCapture?.(e.pointerId);
    };
    this._onPointerMove = (e) => {
      if (!this._dragging) return;
      this.dragYaw += (e.clientX - this._lastX) * 0.005;
      this.dragPitch += (e.clientY - this._lastY) * 0.004;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
    };
    this._onPointerUp = (e) => {
      this._dragging = false;
      canvas.releasePointerCapture?.(e.pointerId);
    };

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("blur", this._onBlur);
    this._canvas = canvas;
    canvas.addEventListener("pointerdown", this._onPointerDown);
    window.addEventListener("pointermove", this._onPointerMove);
    window.addEventListener("pointerup", this._onPointerUp);
  }

  _typing(el) {
    if (!el) return false;
    const tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
  }

  _code(e) {
    switch (e.key) {
      case "w": case "W": case "ArrowUp": return "up";
      case "s": case "S": case "ArrowDown": return "down";
      case "a": case "A": case "ArrowLeft": return "left";
      case "d": case "D": case "ArrowRight": return "right";
      default: return null;
    }
  }

  _action(e) {
    switch (e.key) {
      case "e": case "E": return "interact";
      case "Escape": return "cancel";
      default: return null;
    }
  }

  // Consume the oldest pending one-shot action, or null.
  takeAction() {
    return this._actions.shift() || null;
  }

  // Per-frame movement axes in screen space: x = strafe (right+), z = forward(+).
  axis() {
    const x = (this.keys.has("right") ? 1 : 0) - (this.keys.has("left") ? 1 : 0);
    const z = (this.keys.has("up") ? 1 : 0) - (this.keys.has("down") ? 1 : 0);
    return { x, z };
  }

  // Consume accumulated drag (so the camera applies it once).
  takeDrag() {
    const d = { yaw: this.dragYaw, pitch: this.dragPitch };
    this.dragYaw = 0;
    this.dragPitch = 0;
    return d;
  }

  dispose() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("blur", this._onBlur);
    this._canvas?.removeEventListener("pointerdown", this._onPointerDown);
    window.removeEventListener("pointermove", this._onPointerMove);
    window.removeEventListener("pointerup", this._onPointerUp);
  }
}
