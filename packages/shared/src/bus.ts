/**
 * Typed in-process event bus — thin wrapper over Node EventEmitter.
 * Provides correlated type safety between event names and their payloads.
 * O(k) per emit where k = listener count on the channel; keep k < 20 per channel.
 */
import { EventEmitter } from 'node:events';
import type { AgentEvent } from './types.js';

type PayloadOf<T extends AgentEvent['type']> = Extract<AgentEvent, { type: T }>['payload'];

class TypedEventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  emit<T extends AgentEvent['type']>(event: T, payload: PayloadOf<T>): void {
    this.emitter.emit(event, payload);
  }

  on<T extends AgentEvent['type']>(
    event: T,
    listener: (payload: PayloadOf<T>) => void,
  ): () => void {
    const handler = (payload: unknown) => listener(payload as PayloadOf<T>);
    this.emitter.on(event, handler);
    return () => this.emitter.off(event, handler);
  }

  once<T extends AgentEvent['type']>(
    event: T,
    listener: (payload: PayloadOf<T>) => void,
  ): () => void {
    const handler = (payload: unknown) => listener(payload as PayloadOf<T>);
    this.emitter.once(event, handler);
    return () => this.emitter.off(event, handler);
  }

  off<T extends AgentEvent['type']>(
    event: T,
    listener: (payload: PayloadOf<T>) => void,
  ): void {
    this.emitter.off(event, listener as (arg: unknown) => void);
  }

  /** Forward any AgentEvent from an async generator directly onto the bus. */
  forward(event: AgentEvent): void {
    this.emitter.emit(event.type, event.payload);
  }
}

export type { TypedEventBus };
export const bus = new TypedEventBus();
