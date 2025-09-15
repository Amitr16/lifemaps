// Lightweight global event bus (singleton)
class EventBus {
  constructor() {
    this.events = {}
  }
  subscribe(event, callback) {
    if (!this.events[event]) this.events[event] = []
    this.events[event].push(callback)
    return () => {
      this.events[event] = (this.events[event] || []).filter(cb => cb !== callback)
    }
  }
  emit(event, data) {
    const listeners = this.events[event]
    if (Array.isArray(listeners)) {
      listeners.forEach(cb => {
        try { cb(data) } catch (e) { console.error('EventBus listener error for', event, e) }
      })
    }
  }
}
export const eventBus = new EventBus()
