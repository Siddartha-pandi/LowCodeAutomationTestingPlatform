import * as dns from 'node:dns';
import * as net from 'node:net';

let applied = false;

/**
 * Configures Node.js networking to use IPv4 exclusively and disables Node 20+
 * Happy Eyeballs (autoSelectFamily) 250ms connection racing, which causes
 * AggregateError [ETIMEDOUT] / ENETUNREACH against high-latency cloud DBs (e.g. Neon).
 */
export function forceIpv4Dns(): void {
  if (applied) return;
  applied = true;

  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
  }

  if (typeof (net as any).setDefaultAutoSelectFamily === 'function') {
    (net as any).setDefaultAutoSelectFamily(false);
  }

  const origLookup = dns.lookup;
  const ipv4Lookup = (hostname: string, options: any, callback?: any) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    if (options && options.all) {
      return origLookup(
        hostname,
        { ...options, family: 4 },
        (err: NodeJS.ErrnoException | null, addresses: unknown) => {
          if (err) return callback(err);
          const list = Array.isArray(addresses) ? (addresses as dns.LookupAddress[]) : [];
          callback(null, list.filter((a) => a.family === 4));
        },
      );
    }
    return origLookup(hostname, { ...options, family: 4 }, callback);
  };

  (dns as any).lookup = Object.assign(ipv4Lookup, origLookup);
}
