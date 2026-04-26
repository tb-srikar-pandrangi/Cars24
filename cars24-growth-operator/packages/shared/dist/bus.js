/**
 * Typed in-process event bus — thin wrapper over Node EventEmitter.
 * Provides correlated type safety between event names and their payloads.
 * O(k) per emit where k = listener count on the channel; keep k < 20 per channel.
 */
import { EventEmitter } from 'node:events';
class TypedEventBus {
    emitter = new EventEmitter();
    constructor() {
        this.emitter.setMaxListeners(50);
    }
    emit(event, payload) {
        this.emitter.emit(event, payload);
    }
    on(event, listener) {
        const handler = (payload) => listener(payload);
        this.emitter.on(event, handler);
        return () => this.emitter.off(event, handler);
    }
    once(event, listener) {
        const handler = (payload) => listener(payload);
        this.emitter.once(event, handler);
        return () => this.emitter.off(event, handler);
    }
    off(event, listener) {
        this.emitter.off(event, listener);
    }
    /** Forward any AgentEvent from an async generator directly onto the bus. */
    forward(event) {
        this.emitter.emit(event.type, event.payload);
    }
}
export const bus = new TypedEventBus();
//# sourceMappingURL=bus.js.map