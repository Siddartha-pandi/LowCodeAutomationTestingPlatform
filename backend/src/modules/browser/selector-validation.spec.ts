import { InteractiveSessionService } from './interactive-session.service';

describe('Selector Validation & Parser (Zero-AI Deterministic)', () => {
  let service: InteractiveSessionService;

  beforeEach(() => {
    service = new InteractiveSessionService(
      {} as any,
      {} as any,
      {} as any,
      { verifyProjectAccess: jest.fn().mockResolvedValue({ id: 'proj-1' }) } as any,
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

  it('should block SSRF metadata and private URLs in exploreDom', async () => {
    await expect(
      service.exploreDom({ url: 'http://169.254.169.254/latest/meta-data/' } as any, 'user-1', false),
    ).rejects.toThrow(/security policy|blocked/i);
  });

  it('should block cross-user access in getRecorderStatus', () => {
    (service as any).sessions.set('rec_123', {
      sessionId: 'rec_123',
      userId: 'owner-1',
      recordingActions: [],
      createdAt: new Date(),
    });

    expect(() => service.getRecorderStatus('rec_123', 'attacker-2', false)).toThrow(/Access denied/);
    const superView = service.getRecorderStatus('rec_123', 'super-1', true);
    expect(superView.session_id).toBe('rec_123');
  });
});
