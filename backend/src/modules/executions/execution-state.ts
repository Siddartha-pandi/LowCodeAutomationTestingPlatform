export type ExecutionStatus =
  | 'queued'
  | 'running'
  | 'passed'
  | 'failed'
  | 'cancelled'
  | 'timed_out';

export const TERMINAL_EXECUTION_STATUSES = new Set<string>([
  'passed',
  'failed',
  'cancelled',
  'timed_out',
]);

const ALLOWED_TRANSITIONS: Record<ExecutionStatus, Set<ExecutionStatus>> = {
  queued: new Set(['running', 'cancelled', 'failed', 'timed_out']),
  running: new Set(['passed', 'failed', 'cancelled', 'timed_out']),
  passed: new Set(),
  failed: new Set(),
  cancelled: new Set(),
  timed_out: new Set(),
};

export function isTerminalExecutionStatus(status: string | undefined | null): boolean {
  return Boolean(status && TERMINAL_EXECUTION_STATUSES.has(status));
}

export function canTransitionExecutionStatus(
  from: string | undefined | null,
  to: ExecutionStatus,
): boolean {
  if (!from) return true;
  if (from === to) return true;
  const allowed = ALLOWED_TRANSITIONS[from as ExecutionStatus];
  return allowed ? allowed.has(to) : false;
}

export function boundTimeoutMs(
  requestedMs: number | undefined,
  defaultMs: number,
  minMs = 1000,
  maxMs = 900_000,
): number {
  const val = Number(requestedMs);
  if (!Number.isFinite(val) || val <= 0) return defaultMs;
  return Math.min(Math.max(val, minMs), maxMs);
}
