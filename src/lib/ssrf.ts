import dns from "dns";
import net from "net";

export const SSRF_GENERIC_ERROR = "This server address isn't allowed.";

/**
 * Checks if an IPv4 address is in a private, loopback, link-local, or reserved range:
 * - 0.0.0.0/8 (Current network / default route)
 * - 10.0.0.0/8 (RFC 1918 Private)
 * - 100.64.0.0/10 (Carrier-Grade NAT)
 * - 127.0.0.0/8 (Loopback / localhost)
 * - 169.254.0.0/16 (Link-Local / Cloud metadata e.g. 169.254.169.254)
 * - 172.16.0.0/12 (RFC 1918 Private)
 * - 192.0.0.0/24 (IETF Protocol Assignments)
 * - 192.0.2.0/24 (TEST-NET-1 documentation)
 * - 192.88.99.0/24 (6to4 Relay Anycast)
 * - 192.168.0.0/16 (RFC 1918 Private)
 * - 198.18.0.0/15 (Network benchmark tests)
 * - 198.51.100.0/24 (TEST-NET-2 documentation)
 * - 203.0.113.0/24 (TEST-NET-3 documentation)
 * - 224.0.0.0/4 (Multicast)
 * - 240.0.0.0/4 (Reserved / Future use / Limited broadcast)
 */
export function isPrivateOrReservedIPv4(ip: string): boolean {
  const parts = ip.split(".").map((part) => parseInt(part, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IPv4 treated as unsafe
  }

  const [a, b, c] = parts;

  // 0.0.0.0/8 - Current network ("this" host)
  if (a === 0) return true;

  // 10.0.0.0/8 - RFC 1918 Private network
  if (a === 10) return true;

  // 100.64.0.0/10 - Carrier-Grade NAT
  if (a === 100 && (b & 0xc0) === 64) return true;

  // 127.0.0.0/8 - Loopback (127.0.0.1, etc.)
  if (a === 127) return true;

  // 169.254.0.0/16 - Link-Local (Cloud metadata e.g. 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 - RFC 1918 Private network (172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.0.0.0/24 - IETF Protocol Assignments
  if (a === 192 && b === 0 && c === 0) return true;

  // 192.0.2.0/24 - TEST-NET-1 documentation
  if (a === 192 && b === 0 && c === 2) return true;

  // 192.88.99.0/24 - 6to4 Relay Anycast
  if (a === 192 && b === 88 && c === 99) return true;

  // 192.168.0.0/16 - RFC 1918 Private network
  if (a === 192 && b === 168) return true;

  // 198.18.0.0/15 - Network benchmark tests
  if (a === 198 && (b === 18 || b === 19)) return true;

  // 198.51.100.0/24 - TEST-NET-2 documentation
  if (a === 198 && b === 51 && c === 100) return true;

  // 203.0.113.0/24 - TEST-NET-3 documentation
  if (a === 203 && b === 0 && c === 113) return true;

  // 224.0.0.0/4 - Multicast
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 - Reserved / Broadcast (240.0.0.0 - 255.255.255.255)
  if (a >= 240) return true;

  return false;
}

/**
 * Checks if an IPv6 address is in a private, loopback, link-local, or reserved range:
 * - ::1 (Loopback)
 * - :: (Unspecified)
 * - ::ffff:0:0/96 (IPv4-mapped IPv6)
 * - fc00::/7 (Unique Local Address - private)
 * - fe80::/10 (Link-Local)
 * - ff00::/8 (Multicast)
 * - 2001:db8::/32 (Documentation)
 * - 100::/64 (Discard)
 */
export function isPrivateOrReservedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().trim();
  const cleanIp = normalized.replace(/^\[|\]$/g, "");

  // Loopback ::1
  if (cleanIp === "::1" || cleanIp === "0:0:0:0:0:0:0:1") return true;

  // Unspecified ::
  if (cleanIp === "::" || cleanIp === "0:0:0:0:0:0:0:0") return true;

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:169.254.169.254)
  if (cleanIp.startsWith("::ffff:") || cleanIp.startsWith("0:0:0:0:0:ffff:")) {
    const lastPart = cleanIp.split(":").pop() || "";
    if (net.isIPv4(lastPart)) {
      return isPrivateOrReservedIPv4(lastPart);
    }
    // Also handle hex IPv4-mapped representation if present
    const hexParts = cleanIp.split(":");
    if (hexParts.length >= 2) {
      const h1 = parseInt(hexParts[hexParts.length - 2], 16);
      const h2 = parseInt(hexParts[hexParts.length - 1], 16);
      if (!isNaN(h1) && !isNaN(h2)) {
        const ip4 = `${(h1 >> 8) & 0xff}.${h1 & 0xff}.${(h2 >> 8) & 0xff}.${h2 & 0xff}`;
        return isPrivateOrReservedIPv4(ip4);
      }
    }
  }

  // Unique Local Address (ULA) - fc00::/7 (fc00:: - fdff::)
  if (cleanIp.startsWith("fc") || cleanIp.startsWith("fd")) return true;

  // Link-Local - fe80::/10 (fe80:: - febf::)
  if (
    cleanIp.startsWith("fe8") ||
    cleanIp.startsWith("fe9") ||
    cleanIp.startsWith("fea") ||
    cleanIp.startsWith("feb")
  ) {
    return true;
  }

  // Multicast - ff00::/8
  if (cleanIp.startsWith("ff")) return true;

  // Documentation - 2001:db8::/32
  if (cleanIp.startsWith("2001:db8:") || cleanIp.startsWith("2001:0db8:")) return true;

  // Discard prefix - 100::/64
  if (cleanIp.startsWith("100:")) return true;

  return false;
}

/**
 * Checks whether an IP (v4 or v6) is private or reserved.
 */
export function isPrivateOrReservedIP(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) {
    return isPrivateOrReservedIPv4(ip);
  }
  if (version === 6) {
    return isPrivateOrReservedIPv6(ip);
  }
  return true; // Not a valid IP -> unsafe
}

export interface SsrValidationResult {
  safe: boolean;
  error?: string;
  resolvedIps?: string[];
}

/**
 * Validates a user-supplied URL against Server-Side Request Forgery (SSRF):
 * - Confirms scheme is http: or https:
 * - Checks hostname for reserved/internal labels
 * - Resolves hostname to its actual IPs (handling DNS rebinding)
 * - Validates EVERY resolved IP against private/loopback/link-local/cloud-metadata ranges
 * - Returns a generic error ("This server address isn't allowed.") on any validation failure
 */
export async function validateSafeMcpUrl(rawUrl: string): Promise<SsrValidationResult> {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { safe: false, error: SSRF_GENERIC_ERROR };
  }

  const trimmed = rawUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { safe: false, error: SSRF_GENERIC_ERROR };
  }

  // 1. Only allow http: and https: schemes
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { safe: false, error: SSRF_GENERIC_ERROR };
  }

  // 2. Prohibit embedded credentials (e.g. http://user:pass@host)
  if (parsed.username || parsed.password) {
    return { safe: false, error: SSRF_GENERIC_ERROR };
  }

  const hostname = parsed.hostname.toLowerCase().trim();
  if (!hostname) {
    return { safe: false, error: SSRF_GENERIC_ERROR };
  }

  // 3. Prohibit known internal and metadata hostnames
  const lowerHost = hostname.replace(/\.$/, ""); // strip trailing dot
  if (
    lowerHost === "localhost" ||
    lowerHost.endsWith(".localhost") ||
    lowerHost === "local" ||
    lowerHost.endsWith(".local") ||
    lowerHost === "internal" ||
    lowerHost.endsWith(".internal") ||
    lowerHost === "localdomain" ||
    lowerHost.endsWith(".localdomain") ||
    lowerHost === "lan" ||
    lowerHost.endsWith(".lan") ||
    lowerHost === "home" ||
    lowerHost.endsWith(".home") ||
    lowerHost === "corp" ||
    lowerHost.endsWith(".corp") ||
    lowerHost === "instance-data" ||
    lowerHost === "metadata" ||
    lowerHost.includes("metadata.google.internal")
  ) {
    return { safe: false, error: SSRF_GENERIC_ERROR };
  }

  // 4. If hostname is a literal IP address, check immediately
  const cleanHost = lowerHost.replace(/^\[|\]$/g, "");
  if (net.isIP(cleanHost)) {
    if (isPrivateOrReservedIP(cleanHost)) {
      return { safe: false, error: SSRF_GENERIC_ERROR };
    }
  }

  // 5. Resolve DNS to get all IP addresses (protects against DNS rebinding & nip.io / localtest.me aliases)
  try {
    const lookupPromise = dns.promises.lookup(cleanHost, {
      all: true,
      verbatim: true,
    });

    // 3-second DNS resolution timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("DNS timeout")), 3000)
    );

    const addresses = await Promise.race([lookupPromise, timeoutPromise]);

    if (!addresses || addresses.length === 0) {
      return { safe: false, error: SSRF_GENERIC_ERROR };
    }

    const resolvedIps: string[] = [];
    for (const record of addresses) {
      resolvedIps.push(record.address);
      if (isPrivateOrReservedIP(record.address)) {
        return { safe: false, error: SSRF_GENERIC_ERROR };
      }
    }

    return { safe: true, resolvedIps };
  } catch (dnsErr) {
    // If domain cannot be resolved or lookup timed out, reject generically
    return { safe: false, error: SSRF_GENERIC_ERROR };
  }
}
