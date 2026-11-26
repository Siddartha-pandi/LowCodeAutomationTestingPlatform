import * as dns from 'node:dns/promises';
import * as net from 'node:net';
import { Page, Request, Route } from 'playwright';

const METADATA_HOSTS = new Set([
  '169.254.169.254',
  'metadata.google.internal',
  'metadata.goog',
  '100.100.100.200',
]);

export function isLocalhostBypassActive(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.ALLOW_LOCALHOST_AUTOMATION === 'true';
}

/**
 * Checks whether an IPv4 address belongs to a private, loopback, link-local,
 * CGNAT, documentation, benchmark, multicast, or unspecified range.
 */
export function isRestrictedIpv4(ip: string, options: { allowLoopback?: boolean } = {}): boolean {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b, c] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
  if (a === 127) return !options.allowLoopback; // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local / cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24
  if (a === 192 && b === 0 && c === 2) return true; // 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15
  if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24 (TEST-NET-2)
  if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24 (TEST-NET-3)
  if (a >= 224) return true; // Multicast / reserved
  return false;
}

/**
 * Checks whether an IPv6 address is loopback, unspecified, link-local, ULA,
 * multicast, documentation, or IPv4-mapped restricted.
 */
export function isRestrictedIpv6(rawIp: string, options: { allowLoopback?: boolean } = {}): boolean {
  const ip = rawIp.toLowerCase().replace(/^\[|\]$/g, '').split('%')[0];
  if (ip === '::1') return !options.allowLoopback;
  if (ip === '::') return true;
  if (ip.startsWith('::ffff:')) {
    const tail = ip.slice(7);
    if (net.isIPv4(tail)) {
      return isRestrictedIpv4(tail, options);
    }
    // Handle hex-encoded IPv4-mapped IPv6 e.g. ::ffff:7f00:1 or ::ffff:a9fe:a9fe
    const hexParts = tail.split(':');
    if (hexParts.length === 2) {
      const hi = parseInt(hexParts[0], 16);
      const lo = parseInt(hexParts[1], 16);
      if (!Number.isNaN(hi) && !Number.isNaN(lo)) {
        const v4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
        return isRestrictedIpv4(v4, options);
      }
    }
    return true;
  }
  if (ip.startsWith('fe80:') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb')) {
    return true; // fe80::/10 link-local
  }
  if (ip.startsWith('fc') || ip.startsWith('fd')) {
    return true; // fc00::/7 ULA
  }
  if (ip.startsWith('ff')) {
    return true; // ff00::/8 multicast
  }
  if (ip.startsWith('2001:db8:') || ip.startsWith('2001:0db8:')) {
    return true; // documentation prefix
  }
  return false;
}

export function isRestrictedIp(ip: string, options: { allowLoopback?: boolean } = {}): boolean {
  const cleaned = ip.replace(/^\[|\]$/g, '');
  if (net.isIPv4(cleaned)) return isRestrictedIpv4(cleaned, options);
  if (net.isIPv6(cleaned)) return isRestrictedIpv6(cleaned, options);
  return false;
}

export function isHostInAllowlist(host: string, allowedDomains: string[]): boolean {
  if (!allowedDomains || allowedDomains.length === 0 || allowedDomains.includes('*')) {
    return true;
  }
  const normalizedHost = host.toLowerCase();
  return allowedDomains.some((pattern) => {
    const clean = pattern.trim().toLowerCase();
    if (!clean) return false;
    if (clean.startsWith('*.')) {
      const suffix = clean.slice(2);
      return normalizedHost === suffix || normalizedHost.endsWith(`.${suffix}`);
    }
    return normalizedHost === clean;
  });
}

export interface UrlCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Synchronous URL policy check for Playwright route interception.
 * Separates domain allowlist enforcement from network/IP security policy so an
 * allowlisted domain can never bypass private IP or metadata protections.
 */
export function evaluateRequestUrl(
  urlStr: string,
  allowedDomains: string[] = [],
  options: { allowSubresourceSchemes?: boolean } = {},
): UrlCheckResult {
  if (
    options.allowSubresourceSchemes &&
    (urlStr === 'about:blank' || urlStr.startsWith('data:') || urlStr.startsWith('blob:'))
  ) {
    return { allowed: true };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { allowed: false, reason: 'Malformed URL' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { allowed: false, reason: `Disallowed URL scheme: ${parsed.protocol}` };
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) {
    return { allowed: false, reason: 'Missing hostname' };
  }

  // 1. Strictly block cloud metadata endpoints regardless of allowlist or dev bypass
  if (METADATA_HOSTS.has(host) || host.startsWith('169.254.')) {
    return { allowed: false, reason: `Cloud metadata host blocked: ${host}` };
  }

  // 2. Network/IP policy: private, link-local, ULA, CGNAT, and multicast are ALWAYS blocked.
  // Loopback is only permitted in non-production when ALLOW_LOCALHOST_AUTOMATION=true.
  const allowLoopback = isLocalhostBypassActive();
  if ((host === 'localhost' || host.endsWith('.localhost')) && !allowLoopback) {
    return { allowed: false, reason: `Loopback address blocked: ${host}` };
  }
  if (net.isIP(host) && isRestrictedIp(host, { allowLoopback })) {
    return { allowed: false, reason: `Restricted IP address blocked: ${host}` };
  }

  // 3. Domain allowlist check (independent of IP/network security)
  if (allowedDomains.length > 0 && !allowedDomains.includes('*') && !isHostInAllowlist(host, allowedDomains)) {
    return { allowed: false, reason: `Host not in allowed domains: ${host}` };
  }

  return { allowed: true };
}

export interface DnsResolvers {
  lookup?: (hostname: string, options: { all: true }) => Promise<Array<{ address: string; family: number }>>;
  resolve4?: (hostname: string) => Promise<string[]>;
  resolve6?: (hostname: string) => Promise<string[]>;
}

/**
 * Asynchronous pre-navigation and post-redirect check that resolves both A and AAAA
 * records (plus OS getaddrinfo lookup) to prevent DNS-rebinding and private-IP SSRF.
 */
export async function validateNavigationUrl(
  urlStr: string,
  allowedDomains: string[] = [],
  resolvers: DnsResolvers = {},
): Promise<UrlCheckResult> {
  const syncCheck = evaluateRequestUrl(urlStr, allowedDomains, { allowSubresourceSchemes: false });
  if (!syncCheck.allowed) return syncCheck;

  const parsed = new URL(urlStr);
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  // If host is already an IP literal, syncCheck already validated it
  if (net.isIP(host)) {
    return { allowed: true };
  }

  const allowLoopback = isLocalhostBypassActive();
  if (allowLoopback && (host === 'localhost' || host.endsWith('.localhost'))) {
    return { allowed: true };
  }

  const lookupFn = resolvers.lookup || ((h, opts) => dns.lookup(h, opts));
  const resolve4Fn = resolvers.resolve4 || ((h) => dns.resolve4(h));
  const resolve6Fn = resolvers.resolve6 || ((h) => dns.resolve6(h));

  const resolvedIps = new Set<string>();
  let anyLookupSucceeded = false;

  try {
    const entries = await lookupFn(host, { all: true });
    if (entries && entries.length > 0) {
      anyLookupSucceeded = true;
      for (const e of entries) resolvedIps.add(e.address);
    }
  } catch {
    // fallback to explicit A/AAAA resolution below
  }

  const [v4Res, v6Res] = await Promise.allSettled([resolve4Fn(host), resolve6Fn(host)]);
  if (v4Res.status === 'fulfilled' && v4Res.value.length > 0) {
    anyLookupSucceeded = true;
    for (const ip of v4Res.value) resolvedIps.add(ip);
  }
  if (v6Res.status === 'fulfilled' && v6Res.value.length > 0) {
    anyLookupSucceeded = true;
    for (const ip of v6Res.value) resolvedIps.add(ip);
  }

  if (!anyLookupSucceeded || resolvedIps.size === 0) {
    return {
      allowed: false,
      reason: `DNS resolution failed for host '${host}'`,
    };
  }

  for (const ip of resolvedIps) {
    if (isRestrictedIp(ip, { allowLoopback })) {
      return {
        allowed: false,
        reason: `DNS resolution for '${host}' points to restricted IP ${ip}`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Shared Playwright page security policy enforcing SSRF validation across
 * main documents, redirects, subresources, fetch/XHR, iframes, and downloads.
 */
export async function attachPageSecurityPolicies(
  page: Page,
  allowedDomains: string[] = [],
  onBlocked?: (reason: string, url: string) => void,
): Promise<void> {
  await page.route('**/*', (route: Route, request: Request) => {
    const urlStr = request.url();
    const check = evaluateRequestUrl(urlStr, allowedDomains, { allowSubresourceSchemes: true });
    if (!check.allowed) {
      onBlocked?.(check.reason || 'Blocked by SSRF policy', urlStr);
      return route.abort('accessdenied');
    }
    return route.continue();
  });

  page.on('download', async (download) => {
    const dlUrl = download.url();
    const check = evaluateRequestUrl(dlUrl, allowedDomains, { allowSubresourceSchemes: false });
    if (!check.allowed) {
      onBlocked?.(`Blocked download: ${check.reason}`, dlUrl);
      await download.cancel().catch(() => {});
    }
  });
}
