/**
 * Agent-layer input/context types — one level above the shared domain types.
 * Not in @cars24/shared because they encode operational concerns, not domain.
 * O(1) — compile-time only.
 */
import type { Funnel, Sql } from '@cars24/shared';

/** Parameters threaded into every agent invocation. */
export type AgentRunParams = {
  /** UUID that correlates all events from a single orchestrator run. */
  runId: string;
  /** Restrict to specific funnels; defaults to all four. */
  funnels?: Funnel[];
  /** Restrict to specific geo slugs; defaults to all active geos. */
  geos?: string[];
  /** How far back to pull metrics data, in days. Defaults to 1. */
  lookbackDays?: number;
};

/** Injected dependencies available to every agent. */
export type AgentContext = {
  params: AgentRunParams;
  sql: Sql;
};
