import {
  evaluateRequestUrl,
  isRestrictedIp,
  isRestrictedIpv4,
  isRestrictedIpv6,
  validateNavigationUrl,
} from './url-security';

describe('URL Security & SSRF Protection', () => {
  const origAllowLocalhost = process.env.ALLOW_LOCALHOST_AUTOMATION;
  const origNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.ALLOW_LOCALHOST_AUTOMATION = origAllowLocalhost;
    process.env.NODE_ENV = origNodeEnv;
  });

  it('blocks non-HTTP(S) schemes and malformed URLs', () => {
    expect(evaluateRequestUrl('file:///etc/passwd').allowed).toBe(false);
    expect(evaluateRequestUrl('javascript:alert(1)').allowed).toBe(false);
    expect(evaluateRequestUrl('data:text/html,<script>alert(1)</script>').allowed).toBe(false);
    expect(evaluateRequestUrl('ftp://example.com/file').allowed).toBe(false);
    expect(evaluateRequestUrl('not-a-valid-url').allowed).toBe(false);
  });

  it('always blocks cloud metadata endpoints even with wildcard or explicit allowlist', () => {
    expect(evaluateRequestUrl('http://169.254.169.254/latest/meta-data/', ['*']).allowed).toBe(false);
    expect(evaluateRequestUrl('http://metadata.google.internal/computeMetadata/v1/', ['*']).allowed).toBe(false);
    expect(evaluateRequestUrl('http://169.254.169.254/', ['169.254.169.254']).allowed).toBe(false);
    expect(evaluateRequestUrl('http://100.100.100.200/latest/meta-data/', ['*']).allowed).toBe(false);
  });

  it('blocks IPv4 private, loopback, link-local, CGNAT, and reserved ranges', () => {
    delete process.env.ALLOW_LOCALHOST_AUTOMATION;
    expect(isRestrictedIpv4('10.0.0.1')).toBe(true);
    expect(isRestrictedIpv4('172.16.5.4')).toBe(true);
    expect(isRestrictedIpv4('192.168.1.100')).toBe(true);
    expect(isRestrictedIpv4('127.0.0.1')).toBe(true);
    expect(isRestrictedIpv4('169.254.10.1')).toBe(true);
    expect(isRestrictedIpv4('100.64.0.1')).toBe(true);
    expect(isRestrictedIpv4('0.0.0.0')).toBe(true);
    expect(isRestrictedIpv4('224.0.0.1')).toBe(true);
    expect(isRestrictedIpv4('8.8.8.8')).toBe(false);

    expect(evaluateRequestUrl('http://127.0.0.1:8000/health', ['*']).allowed).toBe(false);
    expect(evaluateRequestUrl('http://localhost:3000', ['*']).allowed).toBe(false);
    expect(evaluateRequestUrl('http://10.20.30.40/admin', ['*']).allowed).toBe(false);
  });

  it('blocks IPv6 loopback, ULA, link-local, and IPv4-mapped IPv6 addresses', () => {
    expect(isRestrictedIpv6('::1')).toBe(true);
    expect(isRestrictedIpv6('::')).toBe(true);
    expect(isRestrictedIpv6('fc00::1')).toBe(true);
    expect(isRestrictedIpv6('fd12:3456::1')).toBe(true);
    expect(isRestrictedIpv6('fe80::1')).toBe(true);
    expect(isRestrictedIpv6('::ffff:127.0.0.1')).toBe(true);
    expect(isRestrictedIpv6('::ffff:10.0.0.1')).toBe(true);
    expect(isRestrictedIpv6('::ffff:7f00:1')).toBe(true);
    expect(isRestrictedIpv6('::ffff:a9fe:a9fe')).toBe(true);
    expect(isRestrictedIp('[::ffff:192.168.1.1]')).toBe(true);
    expect(evaluateRequestUrl('http://[::1]:8000/', ['*']).allowed).toBe(false);
    expect(evaluateRequestUrl('http://[::ffff:127.0.0.1]:8000/', ['*']).allowed).toBe(false);
  });

  it('enforces domain allowlisting independently without bypassing private IP blocks', () => {
    expect(evaluateRequestUrl('https://example.com/login', ['*']).allowed).toBe(true);
    expect(evaluateRequestUrl('https://app.company.internal/login', ['*.company.internal']).allowed).toBe(true);
    expect(evaluateRequestUrl('https://evil.com', ['*.company.internal']).allowed).toBe(false);
    // Allowlisted private IP must still be blocked
    expect(evaluateRequestUrl('http://192.168.1.50/admin', ['192.168.1.50']).allowed).toBe(false);
    expect(evaluateRequestUrl('http://10.0.0.5/api', ['10.0.0.5']).allowed).toBe(false);
  });

  it('blocks ALLOW_LOCALHOST_AUTOMATION in production and keeps private IPs blocked in dev', () => {
    process.env.ALLOW_LOCALHOST_AUTOMATION = 'true';
    process.env.NODE_ENV = 'development';
    expect(evaluateRequestUrl('http://localhost:3000', ['*']).allowed).toBe(true);
    expect(evaluateRequestUrl('http://127.0.0.1:8000', ['*']).allowed).toBe(true);
    // Private RFC1918 and metadata remain blocked even with ALLOW_LOCALHOST_AUTOMATION=true
    expect(evaluateRequestUrl('http://10.0.0.1:5432', ['*']).allowed).toBe(false);
    expect(evaluateRequestUrl('http://169.254.169.254/latest', ['*']).allowed).toBe(false);

    // Production ignores ALLOW_LOCALHOST_AUTOMATION
    process.env.NODE_ENV = 'production';
    expect(evaluateRequestUrl('http://localhost:3000', ['*']).allowed).toBe(false);
    expect(evaluateRequestUrl('http://127.0.0.1:8000', ['*']).allowed).toBe(false);
  });

  it('validates A and AAAA DNS records, rejects mixed/private results, and fails closed on DNS errors', async () => {
    const publicResolvers = {
      lookup: jest.fn().mockResolvedValue([{ address: '93.184.216.34', family: 4 }]),
      resolve4: jest.fn().mockResolvedValue(['93.184.216.34']),
      resolve6: jest.fn().mockResolvedValue(['2606:2800:220:1:248:1893:25c8:1946']),
    };
    const ok = await validateNavigationUrl('https://example.com', ['example.com'], publicResolvers);
    expect(ok.allowed).toBe(true);

    // Allowlisted domain resolving to private IP (DNS rebinding / internal DNS) must be rejected
    const rebindResolvers = {
      lookup: jest.fn().mockResolvedValue([
        { address: '93.184.216.34', family: 4 },
        { address: '10.0.0.15', family: 4 },
      ]),
      resolve4: jest.fn().mockResolvedValue(['93.184.216.34', '10.0.0.15']),
      resolve6: jest.fn().mockResolvedValue([]),
    };
    const rebind = await validateNavigationUrl('https://example.com', ['example.com'], rebindResolvers);
    expect(rebind.allowed).toBe(false);
    expect(rebind.reason).toContain('10.0.0.15');

    // AAAA record pointing to IPv6 ULA must be rejected
    const v6PrivateResolvers = {
      lookup: jest.fn().mockResolvedValue([{ address: '93.184.216.34', family: 4 }]),
      resolve4: jest.fn().mockResolvedValue(['93.184.216.34']),
      resolve6: jest.fn().mockResolvedValue(['fd00::1']),
    };
    const v6Bad = await validateNavigationUrl('https://example.com', ['*'], v6PrivateResolvers);
    expect(v6Bad.allowed).toBe(false);

    // DNS failure must fail closed
    const failedResolvers = {
      lookup: jest.fn().mockRejectedValue(new Error('ENOTFOUND')),
      resolve4: jest.fn().mockRejectedValue(new Error('ENOTFOUND')),
      resolve6: jest.fn().mockRejectedValue(new Error('ENOTFOUND')),
    };
    const dnsFail = await validateNavigationUrl('https://nonexistent.invalid', ['*'], failedResolvers);
    expect(dnsFail.allowed).toBe(false);
  });
});
