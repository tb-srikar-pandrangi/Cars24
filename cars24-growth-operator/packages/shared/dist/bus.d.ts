import type { AgentEvent } from './types.js';
type PayloadOf<T extends AgentEvent['type']> = Extract<AgentEvent, {
    type: T;
}>['payload'];
declare class TypedEventBus {
    private readonly emitter;
    constructor();
    emit<T extends AgentEvent['type']>(event: T, payload: PayloadOf<T>): void;
    on<T extends AgentEvent['type']>(event: T, listener: (payload: PayloadOf<T>) => void): () => void;
    once<T extends AgentEvent['type']>(event: T, listener: (payload: PayloadOf<T>) => void): () => void;
    off<T extends AgentEvent['type']>(event: T, listener: (payload: PayloadOf<T>) => void): void;
    /** Forward any AgentEvent from an async generator directly onto the bus. */
    forward(event: AgentEvent): void;
}
export type { TypedEventBus };
export declare const bus: TypedEventBus;
//# sourceMappingURL=bus.d.ts.map