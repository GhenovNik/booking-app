/**
 * Internal types for the Turkish Airlines API layer.
 * These types are decoupled from the raw TA API response shape.
 * All TA-specific mapping happens in adapter.ts.
 */

/** One price cell: a specific outbound+inbound date pair with price info. */
export interface PriceCell {
  outboundDate: string;    // "YYYY-MM-DD"
  inboundDate: string | null; // null for one-way
  price: number;
  currency: string;         // "EUR", "USD", "TRY", …
  isPromo: boolean;         // TA "Best Deal" flag
  raw: unknown;             // original JSON cell — stored as-is in DB
}

/** Result returned by the TA API client after a successful fetch. */
export interface FlightMatrix {
  cells: PriceCell[];
  fetchedAt: string; // ISO timestamp
}

/** Parameters passed to the TA API for an availability check. */
export interface AvailabilityRequest {
  origin: string;
  destination: string;
  cabin: "ECONOMY" | "BUSINESS" | "FIRST";
  pax: number;
  // Fixed mode
  departureDate?: string;
  returnDate?: string | null;
  // Flexible mode (date ranges)
  depFrom?: string;
  depTo?: string;
  retFrom?: string;
  retTo?: string | null;
}

/** Airport entry from the TA port list. */
export interface PortEntry {
  iataCode: string;
  name: string;
  city: string | null;
  country: string | null;
}
