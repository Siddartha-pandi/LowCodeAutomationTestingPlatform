import {
  boundTimeoutMs,
  canTransitionExecutionStatus,
  isTerminalExecutionStatus,
} from './execution-state';

describe('Execution State Machine & Bounded Timeouts', () => {
  it('allows valid lifecycle transitions from queued and running', () => {
    expect(canTransitionExecutionStatus('queued', 'running')).toBe(true);
    expect(canTransitionExecutionStatus('queued', 'cancelled')).toBe(true);
    expect(canTransitionExecutionStatus('running', 'passed')).toBe(true);
    expect(canTransitionExecutionStatus('running', 'failed')).toBe(true);
    expect(canTransitionExecutionStatus('running', 'cancelled')).toBe(true);
    expect(canTransitionExecutionStatus('running', 'timed_out')).toBe(true);
  });

  it('prevents invalid transitions from terminal states', () => {
    expect(isTerminalExecutionStatus('passed')).toBe(true);
    expect(isTerminalExecutionStatus('timed_out')).toBe(true);
    expect(canTransitionExecutionStatus('cancelled', 'passed')).toBe(false);
    expect(canTransitionExecutionStatus('passed', 'failed')).toBe(false);
    expect(canTransitionExecutionStatus('timed_out', 'running')).toBe(false);
  });

  it('bounds timeout values within safe min/max limits', () => {
    expect(boundTimeoutMs(undefined, 30000)).toBe(30000);
    expect(boundTimeoutMs(100, 30000, 1000, 120000)).toBe(1000);
    expect(boundTimeoutMs(99999999, 30000, 1000, 120000)).toBe(120000);
    expect(boundTimeoutMs(45000, 30000, 1000, 120000)).toBe(45000);
  });
});
