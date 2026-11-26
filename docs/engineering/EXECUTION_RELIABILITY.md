# Execution Engine Reliability — LowCodeAutomationTestingPlatform

## 1. Execution State Machine (`execution-state.ts`)

Valid lifecycle states: `queued`, `running`, `passed`, `failed`, `cancelled`, `timed_out`.
- Terminal states (`passed`, `failed`, `cancelled`, `timed_out`) cannot transition to any other state.
- `ExecutionWorker` and `FlowsService` enforce `canTransitionExecutionStatus()` and `isTerminalExecutionStatus()` before updating terminal records so cancelled or timed-out executions cannot be overwritten as `passed`.

## 2. Single-Dispatch & Idempotency

- `FlowsService.executeFlow()` dispatches to **one** path: BullMQ (`status: 'queued'`) when `QueueService.isQueueHealthy()` is true and `async_exec !== false`, or in-process background fallback (`status: 'running'`) only when Redis is unavailable or `async_exec === false`.
- `QueueService.addExecutionJob()` uses `jobId: exec-${execution_id}` with `attempts: 1`.
- `ExecutionWorker.processJob()` verifies the DB row is not already terminal/non-transitionable before launching Playwright.

## 3. Cancellation & Bounded Timeouts

- `FlowExecutorService.executeFlow()` enforces:
  - Bounded `executionTimeoutMs` (default 300s, max 900s) and per-step `stepTimeoutMs` (default 30s, max 120s).
  - Pre-step and in-retry cancellation checks via `state.isCancelled()`, wired to Redis cancellation keys (`execution:cancelled:<id>`).
  - `SuiteWorker` preserves `'cancelled'` terminal status if a suite is cancelled mid-run.

## 4. Resource Cleanup

- `ExecutionWorker` and `FlowsService.runBackgroundExecution()` close the isolated Playwright `BrowserContext` (and flush trace files) inside `finally` blocks regardless of success, failure, timeout, or cancellation.
