import { evaluateRequestUrl, isRestrictedIp, isRestrictedIpv4, isRestrictedIpv6 } from './url-security';

describe('URL Security & SSRF Protection', () => {
  const origEnv = process.env.ALLOW_LOCALHOST_AUTOMATION;

  afterEach(() => {
    process.env.ALLOW_LOCALHOST_AUTOMATION = origEnv;
  });

  it('blocks non-HTTP(S) schemes such as file:// and javascript:', () => {
    expect(evaluateRequestUrl('file:///etc/passwd').allowed).toBe(false);
    expect(evaluateRequestUrl('javascript:alert(1)').allowed).toBe(false);
    expect(evaluateRequestUrl('ftp://example.com/file').allowed).toBe(false);
  });

  it('always blocks cloud metadata endpoints even if allowlist is wildcard', () => {
    expect(evaluateRequestUrl('http://169.254.169.254/latest/meta-data/', ['*']).allowed).toBe(false);
    expect(evaluateRequestUrl('http://metadata.google.internal/computeMetadata/v1/', ['*']).allowed).toBe(false);
    expect(evaluateRequestUrl('http://169.254.169.254/', ['169.254.169.254']).allowed).toBe(false);
  });

  it('blocks private RFC1918, loopback, and IPv6 ULA/loopback addresses by default', () => {
    delete process.env.ALLOW_LOCALHOST_AUTOMATION;
    expect(isRestrictedIpv4('10.0.0.1')).toBe(true);
    expect(isRestrictedIpv4('172.16.5.4')).toBe(true);
    expect(isRestrictedIpv4('192.168.1.100')).toBe(true);
    expect(isRestrictedIpv4('127.0.0.1')).toBe(true);
    expect(isRestrictedIpv4('8.8.8.8')).toBe(false);

    expect(isRestrictedIpv6('::1')).toBe(true);
    expect(isRestrictedIpv6('fc00::1')).toBe(true);
    expect(isRestrictedIpv6('fe80::1')).toBe(true);
    expect(isRestrictedIpv6('::ffff:127.0.0.1')).toBe(true);

    expect(isRestrictedIp('192.168.0.1')).toBe(true);
    expect(evaluateRequestUrl('http://127.0.0.1:8000/health', ['*']).allowed).toBe(false);
    expect(evaluateRequestUrl('http://localhost:3000', ['*']).allowed).toBe(false);
    expect(evaluateRequestUrl('http://10.20.30.40/admin', ['*']).allowed).toBe(false);
  });

  it('allows public HTTPS URLs and explicitly allowlisted domains', () => {
    expect(evaluateRequestUrl('https://example.com/login', ['*']).allowed).toBe(true);
    expect(evaluateRequestUrl('https://app.company.internal/login', ['*.company.internal']).allowed).toBe(true);
    expect(evaluateRequestUrl('https://evil.com', ['*.company.internal']).allowed).toBe(false);
  });
});
