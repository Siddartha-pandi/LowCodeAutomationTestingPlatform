import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { RbacGuard } from './rbac.guard';

describe('RbacGuard (Enterprise Permission Enforcement)', () => {
  let guard: RbacGuard;
  let reflectorMock: any;

  beforeEach(() => {
    reflectorMock = {
      getAllAndOverride: jest.fn(),
    };
    guard = new RbacGuard(reflectorMock);
  });

  const createMockContext = (user: any) => ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  });

  it('should allow access if no permissions are required', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(null);
    const context = createMockContext({ id: 'user-1' });

    expect(guard.canActivate(context as any)).toBe(true);
  });

  it('should allow access to superusers unconditionally', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(['tests:execute', 'admin:manage']);
    const context = createMockContext({ id: 'user-1', isSuperuser: true });

    expect(guard.canActivate(context as any)).toBe(true);
  });

  it('should allow access if user has wildcard (*) permission', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(['flows:create_edit']);
    const context = createMockContext({
      id: 'user-1',
      isSuperuser: false,
      permissions: ['*'],
    });

    expect(guard.canActivate(context as any)).toBe(true);
  });

  it('should allow access if user has one of the required permissions', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(['flows:read', 'reports:read']);
    const context = createMockContext({
      id: 'user-1',
      isSuperuser: false,
      permissions: ['flows:read'],
    });

    expect(guard.canActivate(context as any)).toBe(true);
  });

  it('should throw ForbiddenException if user lacks required permissions', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(['admin:manage']);
    const context = createMockContext({
      id: 'user-1',
      isSuperuser: false,
      permissions: ['flows:read', 'reports:read'],
    });

    expect(() => guard.canActivate(context as any)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if user is not present on request', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(['flows:read']);
    const context = createMockContext(null);

    expect(() => guard.canActivate(context as any)).toThrow(ForbiddenException);
  });
});
