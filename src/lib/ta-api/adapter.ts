/**
 * TA API Adapter — maps raw TA API responses to internal types.
 *
 * THIS IS THE ONLY FILE THAT KNOWS ABOUT THE REAL TA API RESPONSE SHAPE.
 * All other code uses PriceCell / PortEntry from types.ts.
 *
 * When the real API key is obtained and actual responses are observed,
 * update the mappings below. The rest of the app stays unchanged.
 */

import type { AvailabilityRequest, FlightMatrix, PortEntry, PriceCell } from "./types";

// ─── Availability adapter ─────────────────────────────────────────────────────

export function adaptAvailability(
  raw: unknown,
  req: AvailabilityRequest
): FlightMatrix {
  const cells = extractFares(raw, req);
  return { cells, fetchedAt: new Date().toISOString() };
}

/**
 * Extract PriceCell[] from the raw TA API response.
 *
 * The TA API response shape is not yet confirmed. This function tries
 * several common structures. Adjust after seeing real responses.
 *
 * Possible locations for fare data:
 *   raw.data.fares[]
 *   raw.data.availabilities[]
 *   raw.fares[]
 *   raw[] (top-level array)
 */
function extractFares(raw: unknown, req: AvailabilityRequest): PriceCell[] {
  if (!raw || typeof raw !== "object") return [];

  const obj = raw as Record<string, unknown>;

  // Try common nesting patterns
  const fareArrays = [
    obj["fares"],
    (obj["data"] as Record<string, unknown> | undefined)?.["fares"],
    (obj["data"] as Record<string, unknown> | undefined)?.["availabilities"],
    Array.isArray(raw) ? raw : null,
  ].filter(Array.isArray) as unknown[][];

  const candidates = fareArrays[0] ?? [];

  if (candidates.length === 0) {
    console.warn(
      "[ta-api/adapter] No fares found in response. Raw keys:",
      Object.keys(obj)
    );
  }

  return candidates.map((item) => mapFare(item, req, raw));
}

function mapFare(
  item: unknown,
  req: AvailabilityRequest,
  rawResponse: unknown
): PriceCell {
  if (!item || typeof item !== "object") {
    return fallbackCell(req, rawResponse);
  }

  const f = item as Record<string, unknown>;

  // NOTE: Adjust field names to match real TA API response.
  const outboundDate =
    (f["departureDate"] as string | undefined) ??
    (f["depDate"] as string | undefined) ??
    req.departureDate ??
    req.depFrom ??
    "";

  const inboundDate =
    (f["returnDate"] as string | undefined) ??
    (f["retDate"] as string | undefined) ??
    req.returnDate ??
    req.retFrom ??
    null;

  const price =
    Number(f["totalPrice"] ?? f["price"] ?? f["amount"] ?? 0);

  const currency =
    (f["currency"] as string | undefined) ??
    (f["currencyCode"] as string | undefined) ??
    "EUR";

  const isPromo =
    Boolean(f["isBestDeal"] ?? f["isPromo"] ?? f["bestDeal"] ?? false);

  return {
    outboundDate,
    inboundDate: inboundDate || null,
    price,
    currency,
    isPromo,
    raw: item,
  };
}

function fallbackCell(req: AvailabilityRequest, raw: unknown): PriceCell {
  return {
    outboundDate: req.departureDate ?? req.depFrom ?? "",
    inboundDate: req.returnDate ?? req.retFrom ?? null,
    price: 0,
    currency: "EUR",
    isPromo: false,
    raw,
  };
}

// ─── Port list adapter ────────────────────────────────────────────────────────

export function adaptPortList(raw: unknown): PortEntry[] {
  if (!raw || typeof raw !== "object") return [];

  const obj = raw as Record<string, unknown>;

  const portArrays = [
    obj["ports"],
    obj["portList"],
    (obj["data"] as Record<string, unknown> | undefined)?.["ports"],
    (obj["data"] as Record<string, unknown> | undefined)?.["portList"],
    Array.isArray(raw) ? raw : null,
  ].filter(Array.isArray) as unknown[][];

  const candidates = portArrays[0] ?? [];

  return candidates
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const p = item as Record<string, unknown>;

      const iataCode =
        (p["portCode"] as string | undefined) ??
        (p["iataCode"] as string | undefined) ??
        (p["code"] as string | undefined) ??
        "";

      if (!iataCode) return null;

      return {
        iataCode: iataCode.toUpperCase(),
        name:
          (p["portName"] as string | undefined) ??
          (p["name"] as string | undefined) ??
          iataCode,
        city: (p["cityName"] as string | undefined) ?? null,
        country: (p["countryCode"] as string | undefined) ?? null,
      } satisfies PortEntry;
    })
    .filter((p): p is PortEntry => p !== null);
}
