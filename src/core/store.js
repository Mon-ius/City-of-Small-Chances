// Tiny reactive store. The whole game shares one mutable state object; systems
// mutate it and then call emit() so the UI re-renders. No framework, no deps.

export class Store {
  constructor(state) {
    this.state = state;
    this._subs = new Set();
    this._channels = new Map(); // event name -> Set of handlers
  }

  // Subscribe to *every* state change (used by the HUD / screen renderer).
  subscribe(fn) {
    this._subs.add(fn);
    return () => this._subs.delete(fn);
  }

  // Broadcast that state changed.
  emit() {
    for (const fn of this._subs) fn(this.state);
  }

  // Named event bus, for one-off game events (toast, day-ended, etc.).
  on(channel, fn) {
    if (!this._channels.has(channel)) this._channels.set(channel, new Set());
    this._channels.get(channel).add(fn);
    return () => this._channels.get(channel)?.delete(fn);
  }

  fire(channel, payload) {
    const set = this._channels.get(channel);
    if (set) for (const fn of set) fn(payload, this.state);
  }

  // Convenience: mutate via a function then emit once.
  update(mutator) {
    mutator(this.state);
    this.emit();
  }
}
