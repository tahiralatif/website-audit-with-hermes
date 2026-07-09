import dns from 'dns';
import { URL } from 'url';

/**
 * Validate a URL and block private/internal IP ranges to prevent SSRF.
 * Returns { valid: true, url } or { valid: false, reason }.
 *
 * DNS resolution failures are NOT blocked here — the connectivity check
 * handles those. This only blocks URLs that resolve to private/reserved IPs.
 */
export async function validateUrl(input) {
  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, reason: 'Only HTTP and HTTPS URLs are allowed' };
  }

  const hostname = parsed.hostname.toLowerCase();
  const blockedHostnames = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    'metadata.google.internal',
    '169.254.169.254', // AWS/GCP/Azure metadata
  ];
  if (blockedHostnames.includes(hostname)) {
    return { valid: false, reason: 'Access to internal/metadata endpoints is blocked' };
  }

  // DNS resolve and check for private IPs
  // Note: DNS failures (ENOTFOUND, ENODATA) are intentionally NOT blocked here —
  // they are connectivity issues handled by the pre-flight check, not security issues.
  try {
    const addresses = await dns.promises.resolve4(hostname);
    for (const addr of addresses) {
      if (isPrivateOrReserved(addr)) {
        return {
          valid: false,
          reason: `URL resolves to a private/reserved IP (${addr}). SSRF protection active.`,
        };
      }
    }
  } catch {
    // DNS resolution failed — let the connectivity check handle it
  }

  return { valid: true, url: parsed.href };
}

/**
 * Check if an IPv4 address is in a private/reserved range.
 */
function isPrivateOrReserved(ip) {
  const parts = ip.split('.').map(Number);

  // 127.0.0.0/8 — Loopback
  if (parts[0] === 127) return true;
  // 10.0.0.0/8 — Private Class A
  if (parts[0] === 10) return true;
  // 172.16.0.0/12 — Private Class B
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16 — Private Class C
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 169.254.0.0/16 — Link-local
  if (parts[0] === 169 && parts[1] === 254) return true;
  // 0.0.0.0/8
  if (parts[0] === 0) return true;
  // 100.64.0.0/10 — Carrier-grade NAT
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  // 192.0.0.0/24 — IETF protocol assignments
  if (parts[0] === 192 && parts[1] === 0) return true;
  // 192.0.2.0/24 — Documentation (TEST-NET-1)
  if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) return true;
  // 198.51.100.0/24 — Documentation (TEST-NET-2)
  if (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) return true;
  // 203.0.113.0/24 — Documentation (TEST-NET-3)
  if (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) return true;
  // 224.0.0.0/4 — Multicast
  if (parts[0] >= 224 && parts[0] <= 239) return true;
  // 240.0.0.0/4 — Reserved
  if (parts[0] >= 240) return true;

  return false;
}
