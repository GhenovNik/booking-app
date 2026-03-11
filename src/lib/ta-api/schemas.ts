import { z } from "zod";

/**
 * Zod schemas for Turkish Airlines API responses.
 *
 * NOTE: The actual TA API response format has not been confirmed with a real
 * API key yet. These schemas are based on the assumed shape from the TA
 * Developer Portal documentation. Update adapter.ts once real responses
 * are observed — the rest of the app stays unchanged.
 */

// ─── Availability response ───────────────────────────────────────────────────

/**
 * A single flight/price option within the availability response.
 * Field names are guesses — adjust after seeing real responses.
 */
export const TaFareSchema = z
  .object({
    departureDate: z.string(),          // "2026-05-10"
    returnDate: z.string().nullable().optional(),
    totalPrice: z.number(),
    currency: z.string(),
    cabinClass: z.string().optional(),
    isBestDeal: z.boolean().optional(), // TA promotional flag
  })
  .passthrough(); // keep unknown fields in raw

export type TaFare = z.infer<typeof TaFareSchema>;

export const TaAvailabilityResponseSchema = z
  .object({
    status: z.string().optional(),
    data: z
      .object({
        fares: z.array(TaFareSchema).optional(),
        // Some APIs nest differently — handle both shapes in adapter
        availabilities: z.array(TaFareSchema).optional(),
      })
      .passthrough()
      .optional(),
    // Top-level fares (some APIs flatten it)
    fares: z.array(TaFareSchema).optional(),
  })
  .passthrough();

export type TaAvailabilityResponse = z.infer<typeof TaAvailabilityResponseSchema>;

// ─── Port list response ──────────────────────────────────────────────────────

export const TaPortSchema = z
  .object({
    portCode: z.string(),   // IATA code, e.g. "AMS"
    portName: z.string().optional(),
    cityName: z.string().optional(),
    countryCode: z.string().optional(),
  })
  .passthrough();

export type TaPort = z.infer<typeof TaPortSchema>;

export const TaPortListResponseSchema = z
  .object({
    data: z
      .object({
        ports: z.array(TaPortSchema).optional(),
        portList: z.array(TaPortSchema).optional(),
      })
      .passthrough()
      .optional(),
    ports: z.array(TaPortSchema).optional(),
  })
  .passthrough();

export type TaPortListResponse = z.infer<typeof TaPortListResponseSchema>;
