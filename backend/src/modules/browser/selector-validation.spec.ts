import { InteractiveSessionService } from './interactive-session.service';

describe('Selector Validation & Parser (Zero-AI Deterministic)', () => {
  let service: InteractiveSessionService;

  beforeEach(() => {
    service = new InteractiveSessionService(
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it('should identify XPath selectors', () => {
    const res = service.validateSelector('//button[@id="submit"]');
    expect(res.is_valid).toBe(true);
    expect(res.selector_type).toBe('xpath');
  });

  it('should identify CSS ID selectors', () => {
    const res = service.validateSelector('#login-form');
    expect(res.is_valid).toBe(true);
    expect(res.selector_type).toBe('id');
  });

  it('should identify data-testid selectors', () => {
    const res = service.validateSelector('[data-testid="header-avatar"]');
    expect(res.is_valid).toBe(true);
    expect(res.selector_type).toBe('data_attribute');
  });

  it('should reject empty selector', () => {
    const res = service.validateSelector('');
    expect(res.is_valid).toBe(false);
    expect(res.error_message).toContain('empty');
  });
});
