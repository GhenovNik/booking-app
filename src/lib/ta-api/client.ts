import pRetry, { AbortError } from "p-retry";
import type { AvailabilityRequest, FlightMatrix, PortEntry } from "./types";
import {
  TaAvailabilityResponseSchema,
  TaPortListResponseSchema,
} from "./schemas";
import { adaptAvailability, adaptPortList } from "./adapter";

const BASE_URL = process.env.TA_API_BASE ?? "https://api.turkishairlines.com";
const API_KEY = process.env.TA_API_KEY ?? "";
const RATE_LIMIT = Number(process.env.TA_RATE_LIMIT_PER_MIN ?? "50");

// ─── Token bucket (in-process, Docker / persistent process only) ─────────────

let tokenBucket = RATE_LIMIT;
let bucketResetAt = Date.now() + 60_000;

function consumeToken(): boolean {
  const now = Date.now();
  if (now >= bucketResetAt) {
    tokenBucket = RATE_LIMIT;
    bucketResetAt = now + 60_000;
  }
  if (tokenBucket <= 0) return false;
  tokenBucket--;
  return true;
}

// ─── Circuit breaker ──────────────────────────────────────────────────────────

const CIRCUIT_FAIL_THRESHOLD = 5;
const CIRCUIT_COOLDOWN_MS = 30 * 60 * 1000; // 30 min

let consecutiveFailures = 0;
let circuitOpenUntil: number | null = null;

function recordSuccess() {
  consecutiveFailures = 0;
  circuitOpenUntil = null;
}

function recordFailure() {
  consecutiveFailures++;
  if (consecutiveFailures >= CIRCUIT_FAIL_THRESHOLD) {
    circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
    console.warn(
      `[ta-api] Circuit breaker OPEN — too many failures. Cooling down for 30 min.`
    );
  }
}

function isCircuitOpen(): boolean {
  if (circuitOpenUntil === null) return false;
  if (Date.now() >= circuitOpenUntil) {
    circuitOpenUntil = null;
    consecutiveFailures = 0;
    console.info("[ta-api] Circuit breaker CLOSED — retrying requests.");
    return false;
  }
  return true;
}

// ─── Base fetch ───────────────────────────────────────────────────────────────

async function taFetch(
  path: string,
  options: RequestInit = {}
): Promise<unknown> {
  if (!API_KEY) {
    throw new AbortError(
      "TA_API_KEY is not set. Configure it in .env to enable price fetching."
    );
  }

  if (isCircuitOpen()) {
    throw new AbortError(
      "TA API circuit breaker is open. Skipping request for 30 minutes after repeated failures."
    );
  }

  if (!consumeToken()) {
    throw new Error("TA API rate limit reached. Try again next minute.");
  }

  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 429 || res.status === 503) {
    // Retriable — let p-retry handle it
    throw new Error(`TA API ${res.status}: ${await res.text()}`);
  }

  if (!res.ok) {
    // Non-retriable (4xx other than 429)
    throw new AbortError(
      `TA API error ${res.status}: ${await res.text()}`
    );
  }

  return res.json();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Fetch price matrix for a watch from the TA getAvailability endpoint. */
export async function fetchAvailability(
  req: AvailabilityRequest
): Promise<FlightMatrix> {
  const body = buildAvailabilityBody(req);

  const raw = await pRetry(
    () =>
      taFetch("/getAvailability", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    {
      retries: 3,
      minTimeout: 1_000,
      factor: 2,
      onFailedAttempt: (err) => {
        console.warn(
          `[ta-api] fetchAvailability attempt ${err.attemptNumber} failed: ${err.message}`
        );
        recordFailure();
      },
    }
  );

  recordSuccess();

  const parsed = TaAvailabilityResponseSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[ta-api] Unexpected response shape:", parsed.error.format());
    // Still try to adapt — store raw anyway
  }

  return adaptAvailability(raw, req);
}

/** Fetch the airport/city list from the TA getPortList endpoint. */
export async function fetchPortList(): Promise<PortEntry[]> {
  const raw = await pRetry(() => taFetch("/getPortList", { method: "GET" }), {
    retries: 3,
    minTimeout: 1_000,
    factor: 2,
    onFailedAttempt: (err) => {
      console.warn(
        `[ta-api] fetchPortList attempt ${err.attemptNumber} failed: ${err.message}`
      );
    },
  });

  const parsed = TaPortListResponseSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[ta-api] Unexpected port list shape:", parsed.error.format());
  }

  return adaptPortList(raw);
}

// ─── Request builder ─────────────────────────────────────────────────────────

function buildAvailabilityBody(req: AvailabilityRequest): unknown {
  // NOTE: Adjust this mapping once real TA API request shape is confirmed.
  return {
    scheduledFlightModel: {
      originAirportCode: req.origin,
      destinationAirportCode: req.destination,
      departureDate: req.departureDate ?? req.depFrom,
      returnDate: req.returnDate ?? req.retFrom ?? null,
      // Flexible range support — may need separate field names in real API
      ...(req.depTo ? { departureDateTo: req.depTo } : {}),
      ...(req.retTo ? { returnDateTo: req.retTo } : {}),
      passengerTypeCode: "ADULT",
      passengerCount: req.pax,
      cabin: req.cabin,
    },
  };
}
