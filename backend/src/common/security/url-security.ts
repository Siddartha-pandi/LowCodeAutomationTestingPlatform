import * as dns from 'node:dns/promises';
import * as net from 'node:net';

const METADATA_HOSTS = new Set([
  '169.254.169.254',
  'metadata.google.internal',
  'metadata.goog',
  '100.100.100.200',
]);

/**
 * Checks whether an IPv4 address belongs to a private, loopback, link-local,
 * CGNAT, or unspecified range.
 */
export function isRestrictedIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
  if (a === 127) return true; // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local / cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a >= 224) return true; // Multicast / reserved
  return false;
}

/**
 * Checks whether an IPv6 address is loopback, unspecified, link-local, ULA, or IPv4-mapped restricted.
 */
export function isRestrictedIpv6(rawIp: string): boolean {
  const ip = rawIp.toLowerCase().replace(/^\[|\]$/g, '').split('%')[0];
  if (ip === '::1' || ip === '::') return true;
  if (ip.startsWith('::ffff:')) {
    const v4 = ip.slice(7);
    if (net.isIPv4(v4)) return isRestrictedIpv4(v4);
  }
  if (ip.startsWith('fe80:') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb')) {
    return true; // fe80::/10 link-local
  }
  if (ip.startsWith('fc') || ip.startsWith('fd')) {
    return true; // fc00::/7 ULA
  }
  return false;
}

export function isRestrictedIp(ip: string): boolean {
  const cleaned = ip.replace(/^\[|\]$/g, '');
  if (net.isIPv4(cleaned)) return isRestrictedIpv4(cleaned);
  if (net.isIPv6(cleaned)) return isRestrictedIpv6(cleaned);
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

  // Always block cloud metadata endpoints regardless of allowlist
  if (METADATA_HOSTS.has(host) || host.startsWith('169.254.')) {
    return { allowed: false, reason: `Cloud metadata host blocked: ${host}` };
  }

  const explicitlyAllowlisted =
    allowedDomains.length > 0 &&
    !allowedDomains.includes('*') &&
    isHostInAllowlist(host, allowedDomains);

  // Block localhost / private IPs unless explicitly allowlisted or opted-in via env
  const allowLocalhost = process.env.ALLOW_LOCALHOST_AUTOMATION === 'true' || explicitlyAllowlisted;
  if (!allowLocalhost) {
    if (host === 'localhost' || host.endsWith('.localhost') || isRestrictedIp(host)) {
      return { allowed: false, reason: `Private or loopback address blocked: ${host}` };
    }
  }

  if (allowedDomains.length > 0 && !allowedDomains.includes('*') && !explicitlyAllowlisted) {
    return { allowed: false, reason: `Host not in allowed domains: ${host}` };
  }

  return { allowed: true };
}

/**
 * Asynchronous pre-navigation check that also resolves DNS to prevent DNS-rebinding SSRF.
 */
export async function validateNavigationUrl(
  urlStr: string,
  allowedDomains: string[] = [],
): Promise<UrlCheckResult> {
  const syncCheck = evaluateRequestUrl(urlStr, allowedDomains, { allowSubresourceSchemes: false });
  if (!syncCheck.allowed) return syncCheck;

  const parsed = new URL(urlStr);
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  // If host is already an IP literal, syncCheck already validated it
  if (net.isIP(host)) {
    return { allowed: true };
  }

  const explicitlyAllowlisted =
    allowedDomains.length > 0 &&
    !allowedDomains.includes('*') &&
    isHostInAllowlist(host, allowedDomains);
  const allowLocalhost = process.env.ALLOW_LOCALHOST_AUTOMATION === 'true' || explicitlyAllowlisted;

  if (!allowLocalhost) {
    try {
      const addresses = await dns.lookup(host, { all: true });
      for (const entry of addresses) {
        if (isRestrictedIp(entry.address)) {
          return {
            allowed: false,
            reason: `DNS resolution for '${host}' points to restricted IP ${entry.address}`,
          };
        }
      }
    } catch {
      // If DNS lookup fails (e.g. offline test or Playwright route mock), let Playwright handle network error
    }
  }

  return { allowed: true };
}
