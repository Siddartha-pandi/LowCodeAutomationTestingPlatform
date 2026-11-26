import { ForbiddenException } from '@nestjs/common';
import { CsrfMiddleware } from './csrf.middleware';

describe('CsrfMiddleware', () => {
  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'app.corsOrigins') return ['http://localhost:3000'];
      return null;
    }),
  } as any;

  let middleware: CsrfMiddleware;

  beforeEach(() => {
    middleware = new CsrfMiddleware(mockConfig);
  });

  it('allows safe GET requests without CSRF header', () => {
    const next = jest.fn();
    middleware.use({ method: 'GET', url: '/api/v1/projects', headers: {}, cookies: { access_token: 'jwt' } } as any, {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('allows Bearer token requests without CSRF header', () => {
    const next = jest.fn();
    middleware.use(
      {
        method: 'POST',
        url: '/api/v1/projects',
        headers: { authorization: 'Bearer some.jwt.token' },
        cookies: {},
      } as any,
      {} as any,
      next,
    );
    expect(next).toHaveBeenCalled();
  });

  it('rejects cookie-authenticated POST without matching X-CSRF-Token', () => {
    const next = jest.fn();
    expect(() =>
      middleware.use(
        {
          method: 'POST',
          originalUrl: '/api/v1/projects',
          headers: { origin: 'http://localhost:3000' },
          cookies: { access_token: 'jwt', csrf_token: 'abc123' },
        } as any,
        {} as any,
        next,
      ),
    ).toThrow(ForbiddenException);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows cookie-authenticated POST with valid X-CSRF-Token and trusted origin', () => {
    const next = jest.fn();
    middleware.use(
      {
        method: 'POST',
        originalUrl: '/api/v1/projects',
        headers: { origin: 'http://localhost:3000', 'x-csrf-token': 'abc123' },
        cookies: { access_token: 'jwt', csrf_token: 'abc123' },
      } as any,
      {} as any,
      next,
    );
    expect(next).toHaveBeenCalled();
  });

  it('rejects untrusted origin even when CSRF token matches', () => {
    const next = jest.fn();
    expect(() =>
      middleware.use(
        {
          method: 'DELETE',
          originalUrl: '/api/v1/projects/123',
          headers: { origin: 'https://evil.example', 'x-csrf-token': 'abc123' },
          cookies: { access_token: 'jwt', csrf_token: 'abc123' },
        } as any,
        {} as any,
        next,
      ),
    ).toThrow(ForbiddenException);
  });
});
