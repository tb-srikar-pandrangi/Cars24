/**
 * orchestrator/src/index.ts — CARS24 parallel agent runner via Node.js worker_threads.
 *
 * This file is its own worker script — `isMainThread` splits the two roles.
 *
 * Thread topology (message-passing only, zero SharedArrayBuffer):
 *
 *   Worker 1 (ingestion)  ──[all events]────────────────────────→ main
 *   Worker 2 (diagnosis)  ──[all events]────────────────────────→ main
 *   Worker 3 (creative)   ──[all events]────────────────────────→ main
 *   Worker 4 (allocation) ──[all events]────────────────────────→ main
 *
 *   main ──[metrics_ready, funnel_health]────────────────────────→ Worker 2
 *   main ──[metrics_ready, diagnosis_ready]──────────────────────→ Worker 4
 *   main ──[diagnosis_ready]─────────────────────────────────────→ Worker 3
 *   main ──[every event via setImmediate]─────────────────────────→ bus
 *
 * Routing: O(1) per event via Map<type, WorkerRole[]> lookup.
 * Boot:    O(W=4) once per startOrchestrator call.
 * Memory:  O(n) per worker where n = campaigns; agents hold independent state.
 *
 * Allocation timing: Worker 4 (allocateCampaigns) accumulates metrics+diagnosis events
 * and runs its cycle when its input stream ends. The stream closes when main sends
 * {type:'shutdown'}, so allocation fires once per graceful shutdown. For periodic
 * allocation, restart the worker on a configured schedule via config.allocationIntervalMs.
 */

import {
  isMainThread,
  parentPort,
  workerData,
  Worker,
  type MessagePort,
} from 'node:worker_threads';
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';

import { bus as defaultBus } from '@cars24/shared';
import type { AgentEvent, TypedEventBus } from '@cars24/shared';

import {
  ingestCampaigns,
  diagnoseCampaigns,
  scoreAndImproveCreatives,
  allocateCampaigns,
} from '@cars24/agents';
import type { IngestionConfig, AllocationConfig } from '@cars24/agents';

// ─── Re-exports for callers ───────────────────────────────────────────────────

export type { IngestionConfig, AllocationConfig };

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkerRole = 'ingestion' | 'diagnosis' | 'creative' | 'allocation';

/** Config threaded into every worker via workerData. All fields present; workers use only what they need. */
type WorkerData = {
  role: WorkerRole;
  ingestion: IngestionConfig;
  allocation: AllocationConfig;
  anthropicApiKey: string;
};

/** Internal heartbeat from worker → main; never flows to the bus. */
type HeartbeatMsg = {
  type: '__heartbeat__';
  role: WorkerRole;
  eventCount: number;
  alertCount: number;
  lastAt: string;
};

type ShutdownMsg = { type: 'shutdown' };

type FromWorker = AgentEvent | HeartbeatMsg;
type ToWorker = AgentEvent | ShutdownMsg;

/** Mutable state the main thread holds per worker. */
type WorkerState = {
  worker: Worker;
  role: WorkerRole;
  degraded: boolean;
  crashCount: number;
  lastCrashAt: number;
  /** Cumulative totals across restarts; updated from heartbeats. */
  eventCount: number;
  alertCount: number;
  /** Tracked in main thread from events, not heartbeats. */
  creativesImproved: number;
  budgetShifts: number;
  lastHeartbeatAt: string;
};

export type OrchestratorConfig = {
  ingestion: IngestionConfig;
  allocation: AllocationConfig;
  anthropicApiKey: string;
  /**
   * Inject a custom bus. Defaults to the shared singleton.
   * The UI SSE route should subscribe to the same instance.
   */
  bus?: TypedEventBus;
};

// ─── Routing table — O(1) lookup per event ────────────────────────────────────

const WORKER_ROUTES = new Map<AgentEvent['type'], WorkerRole[]>([
  ['metrics_ready',   ['diagnosis', 'allocation']],
  ['funnel_health',   ['diagnosis']],
  ['diagnosis_ready', ['creative',  'allocation']],
]);

const WORKER_NAMES: Record<WorkerRole, string> = {
  ingestion:  'Worker-1/Ingestion',
  diagnosis:  'Worker-2/Diagnosis',
  creative:   'Worker-3/Creative',
  allocation: 'Worker-4/Allocation',
};

// ─── Worker-side async queue ──────────────────────────────────────────────────

/**
 * Converts parentPort message events into an AsyncGenerator.
 * O(1) push per message; O(1) shift per yield.
 * Terminates cleanly when a `{type:'shutdown'}` message is received.
 */
function makeInputQueue(port: MessagePort): {
  iterable: AsyncGenerator<AgentEvent, void, unknown>;
  push: (msg: ToWorker) => void;
} {
  const queue: Array<AgentEvent | null> = [];
  let wake: (() => void) | null = null;

  const push = (msg: ToWorker): void => {
    queue.push(msg.type === 'shutdown' ? null : (msg as AgentEvent));
    wake?.();
    wake = null;
  };

  async function* iterable(): AsyncGenerator<AgentEvent, void, unknown> {
    while (true) {
      while (queue.length > 0) {
        const item = queue.shift()!;
        if (item === null) return;
        yield item;
      }
      await new Promise<void>((res) => { wake = res; });
    }
  }

  port.on('message', push);
  return { iterable: iterable(), push };
}

// ─── Worker entry point ───────────────────────────────────────────────────────

if (!isMainThread) {
  void runWorker();
}

async function runWorker(): Promise<void> {
  if (!parentPort) {
    process.stderr.write('[worker] no parentPort — aborting\n');
    process.exit(1);
  }

  const data = workerData as WorkerData;
  const { role } = data;

  let eventCount = 0;
  let alertCount = 0;

  const send = (event: AgentEvent): void => {
    eventCount++;
    if (event.type === 'alert' || event.type === 'competitor_alert') alertCount++;
    (parentPort as MessagePort).postMessage(event);
  };

  const heartbeat = setInterval(() => {
    const msg: HeartbeatMsg = {
      type: '__heartbeat__',
      role,
      eventCount,
      alertCount,
      lastAt: new Date().toISOString(),
    };
    (parentPort as MessagePort).postMessage(msg);
  }, 60_000);

  try {
    if (role === 'ingestion') {
      // No input stream. Shutdown arrives as an external signal.
      (parentPort as MessagePort).on('message', (msg: ToWorker) => {
        if (msg.type === 'shutdown') process.exit(0);
      });

      for await (const event of ingestCampaigns(data.ingestion)) {
        send(event);
      }
    } else {
      // Streaming workers: consume input queue, run agent, emit results.
      const { iterable } = makeInputQueue(parentPort as MessagePort);

      switch (role) {
        case 'diagnosis': {
          for await (const event of diagnoseCampaigns(iterable)) {
            send(event);
          }
          break;
        }
        case 'creative': {
          for await (const event of scoreAndImproveCreatives(iterable, data.anthropicApiKey)) {
            send(event);
          }
          break;
        }
        case 'allocation': {
          for await (const event of allocateCampaigns(iterable, data.allocation)) {
            send(event);
          }
          break;
        }
      }
    }
  } finally {
    clearInterval(heartbeat);
  }
}

// ─── Main thread — worker lifecycle ──────────────────────────────────────────

const SELF = fileURLToPath(import.meta.url);
const CRASH_WINDOW_MS = 5 * 60 * 1_000; // 5 minutes
const RESTART_DELAY_MS = 2_000;
const DRAIN_TIMEOUT_MS = 5_000;
const HEALTH_LOG_INTERVAL_MS = 60_000;

function buildWorkerData(role: WorkerRole, cfg: OrchestratorConfig): WorkerData {
  return {
    role,
    ingestion: cfg.ingestion,
    allocation: cfg.allocation,
    anthropicApiKey: cfg.anthropicApiKey,
  };
}

function spawnWorker(
  role: WorkerRole,
  cfg: OrchestratorConfig,
  stateMap: Map<WorkerRole, WorkerState>,
  onEvent: (event: FromWorker, role: WorkerRole) => void,
  inheritCounters?: Pick<WorkerState, 'crashCount' | 'lastCrashAt' | 'eventCount' | 'alertCount' | 'creativesImproved' | 'budgetShifts'>,
): WorkerState {
  const worker = new Worker(SELF, {
    workerData: buildWorkerData(role, cfg),
  });

  const state: WorkerState = {
    worker,
    role,
    degraded: false,
    crashCount:         inheritCounters?.crashCount         ?? 0,
    lastCrashAt:        inheritCounters?.lastCrashAt        ?? 0,
    eventCount:         inheritCounters?.eventCount         ?? 0,
    alertCount:         inheritCounters?.alertCount         ?? 0,
    creativesImproved:  inheritCounters?.creativesImproved  ?? 0,
    budgetShifts:       inheritCounters?.budgetShifts       ?? 0,
    lastHeartbeatAt: new Date().toISOString(),
  };

  worker.on('message', (msg: FromWorker) => onEvent(msg, role));

  worker.on('error', (err) => {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[${WORKER_NAMES[role]}] uncaught error: ${msg}\n`);
  });

  worker.on('exit', (code) => {
    if (code === 0) return;
    const current = stateMap.get(role);
    if (!current || current.worker !== worker) return; // stale exit from old worker
    handleCrash(role, code, cfg, stateMap, onEvent, current);
  });

  stateMap.set(role, state);
  return state;
}

function handleCrash(
  role: WorkerRole,
  exitCode: number,
  cfg: OrchestratorConfig,
  stateMap: Map<WorkerRole, WorkerState>,
  onEvent: (event: FromWorker, role: WorkerRole) => void,
  prev: WorkerState,
): void {
  const now = Date.now();
  const sinceLastCrash = now - prev.lastCrashAt;
  const newCrashCount = prev.crashCount + 1;

  process.stderr.write(
    `[${WORKER_NAMES[role]}] exited with code ${exitCode} ` +
    `(crash #${newCrashCount}, ${sinceLastCrash}ms since last)\n`,
  );

  // Second crash within the window → degrade, don't restart
  if (sinceLastCrash < CRASH_WINDOW_MS && newCrashCount > 1) {
    process.stderr.write(
      `[${WORKER_NAMES[role]}] DEGRADED — crashed twice within 5 min. ` +
      `Continuing without this worker; downstream events will be absent.\n`,
    );
    const degradedState = stateMap.get(role);
    if (degradedState) degradedState.degraded = true;
    return;
  }

  // First crash (or crash outside window) → restart once after delay
  process.stderr.write(`[${WORKER_NAMES[role]}] restarting in ${RESTART_DELAY_MS}ms...\n`);

  setTimeout(() => {
    spawnWorker(role, cfg, stateMap, onEvent, {
      crashCount:        newCrashCount,
      lastCrashAt:       now,
      eventCount:        prev.eventCount,
      alertCount:        prev.alertCount,
      creativesImproved: prev.creativesImproved,
      budgetShifts:      prev.budgetShifts,
    });
  }, RESTART_DELAY_MS);
}

// ─── Main thread — event routing ──────────────────────────────────────────────

function makeRouter(
  stateMap: Map<WorkerRole, WorkerState>,
  theBus: TypedEventBus,
): (event: FromWorker, sourceRole: WorkerRole) => void {
  return function routeEvent(raw: FromWorker, sourceRole: WorkerRole): void {
    // Internal heartbeat — update stats, never forward to bus
    if (raw.type === '__heartbeat__') {
      const state = stateMap.get(sourceRole);
      if (state) {
        state.eventCount       = (raw as HeartbeatMsg).eventCount;
        state.alertCount       = (raw as HeartbeatMsg).alertCount;
        state.lastHeartbeatAt  = (raw as HeartbeatMsg).lastAt;
      }
      return;
    }

    const event = raw as AgentEvent;

    // Alerts and competitor signals: log to stderr immediately (blocking is acceptable for stderr)
    if (event.type === 'alert') {
      const p = event.payload;
      process.stderr.write(
        `[ALERT] ${p.funnel}/${p.geo} severity=${p.severity} ` +
        `issues=${p.issues.length} cma_impact=${
          p.recommendedActions.reduce((s, a) => s + a.estimatedCmaImpact, 0).toFixed(2)
        }\n`,
      );
    }
    if (event.type === 'competitor_alert') {
      const p = event.payload;
      process.stderr.write(
        `[COMPETITOR] keyword="${p.keyword}" competitor="${p.competitor}" ` +
        `impression_share_lost=${(p.impressionShareLost * 100).toFixed(1)}%\n`,
      );
    }

    // Track main-thread counters for final shutdown log
    const state = stateMap.get(sourceRole);
    if (state) {
      if (event.type === 'creative_improved') state.creativesImproved++;
      if (event.type === 'allocation_applied') state.budgetShifts++;
    }

    // Push to bus — setImmediate keeps the event loop unblocked
    setImmediate(() => { theBus.forward(event); });

    // Forward to downstream workers via O(1) Map lookup
    const targets = WORKER_ROUTES.get(event.type);
    if (!targets) return;

    for (const targetRole of targets) {
      const targetState = stateMap.get(targetRole);
      if (!targetState || targetState.degraded) continue;
      targetState.worker.postMessage(event as ToWorker);
    }
  };
}

// ─── Main thread — health check logger ───────────────────────────────────────

function logHealth(stateMap: Map<WorkerRole, WorkerState>): void {
  for (const [, state] of stateMap) {
    const name    = WORKER_NAMES[state.role];
    const status  = state.degraded ? 'DEGRADED' : 'alive';
    const funnels = 'SELL/BUY/FIN/SVC';
    process.stderr.write(
      `[${name}] ${status} | funnel=${funnels} | ` +
      `events=${state.eventCount} | alerts=${state.alertCount} | ` +
      `last=${state.lastHeartbeatAt}\n`,
    );
  }
}

// ─── Main thread — graceful shutdown ─────────────────────────────────────────

async function gracefulShutdown(
  stateMap: Map<WorkerRole, WorkerState>,
  healthTimer: ReturnType<typeof setInterval>,
): Promise<void> {
  clearInterval(healthTimer);

  // Send shutdown to all non-degraded workers
  for (const [, state] of stateMap) {
    if (!state.degraded) {
      state.worker.postMessage({ type: 'shutdown' } satisfies ShutdownMsg);
    }
  }

  // Await exit with 5s timeout per worker
  const drains = [...stateMap.values()].map((state) =>
    Promise.race([
      new Promise<void>((res) => state.worker.once('exit', () => res())),
      new Promise<void>((res) => setTimeout(res, DRAIN_TIMEOUT_MS)),
    ]),
  );
  await Promise.all(drains);

  // Final cycle stats
  let totalEvents = 0;
  let totalAlerts = 0;
  let totalCreatives = 0;
  let totalShifts = 0;

  for (const [, state] of stateMap) {
    totalEvents    += state.eventCount;
    totalAlerts    += state.alertCount;
    totalCreatives += state.creativesImproved;
    totalShifts    += state.budgetShifts;
  }

  process.stderr.write(
    `[shutdown] total_events=${totalEvents} | alerts_fired=${totalAlerts} | ` +
    `creatives_improved=${totalCreatives} | budget_shifts_executed=${totalShifts}\n`,
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

/**
 * Spawns 4 worker threads and wires the CARS24 agent pipeline.
 * Returns a Promise that resolves only after SIGINT or SIGTERM + clean drain.
 *
 * Usage:
 * ```ts
 * await startOrchestrator({
 *   ingestion: { mode: 'mock' },
 *   allocation: { dryRun: true },
 *   anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
 * });
 * ```
 *
 * @complexity O(W=4) boot; O(1) per event routing; O(n) per cycle for n campaigns.
 */
export function startOrchestrator(cfg: OrchestratorConfig): Promise<void> {
  if (!isMainThread) throw new Error('startOrchestrator must be called from the main thread');

  const theBus = cfg.bus ?? defaultBus;
  const stateMap = new Map<WorkerRole, WorkerState>();

  return new Promise<void>((resolve) => {
    const routeEvent = makeRouter(stateMap, theBus);
    const roles: WorkerRole[] = ['ingestion', 'diagnosis', 'creative', 'allocation'];

    for (const role of roles) {
      spawnWorker(role, cfg, stateMap, routeEvent);
    }

    const healthTimer = setInterval(() => logHealth(stateMap), HEALTH_LOG_INTERVAL_MS);
    // Unref so the health timer doesn't prevent the process from exiting if workers all exit
    healthTimer.unref();

    let shutdownInitiated = false;
    const onSignal = (): void => {
      if (shutdownInitiated) return;
      shutdownInitiated = true;
      void gracefulShutdown(stateMap, healthTimer).then(resolve);
    };

    process.once('SIGINT',  onSignal);
    process.once('SIGTERM', onSignal);
  });
}
