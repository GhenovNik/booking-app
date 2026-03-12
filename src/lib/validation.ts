import { z } from "zod";

const iata = z.string().regex(/^[A-Z]{3}$/, "Must be a 3-letter IATA code");
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");

export const CreateWatchSchema = z
  .discriminatedUnion("mode", [
    z.object({
      name: z.string().min(1).max(100),
      origin: iata,
      destination: iata,
      mode: z.literal("fixed"),
      depDate: dateStr,
      retDate: dateStr.nullable().optional(),
      pax: z.number().int().min(1).max(9).default(1),
      cabin: z.enum(["ECONOMY", "BUSINESS", "FIRST"]).default("ECONOMY"),
      fetchIntervalH: z.number().int().min(1).max(168).default(12),
      alertMinDrop: z.number().min(0).optional(), // min $ drop from baseline to trigger alert
    }),
    z.object({
      name: z.string().min(1).max(100),
      origin: iata,
      destination: iata,
      mode: z.literal("flexible"),
      depFrom: dateStr,
      depTo: dateStr,
      retFrom: dateStr.nullable().optional(),
      retTo: dateStr.nullable().optional(),
      pax: z.number().int().min(1).max(9).default(1),
      cabin: z.enum(["ECONOMY", "BUSINESS", "FIRST"]).default("ECONOMY"),
      fetchIntervalH: z.number().int().min(1).max(168).default(12),
      alertMinDrop: z.number().min(0).optional(),
    }),
  ])
  .refine(
    (v) => v.origin !== v.destination,
    "Origin and destination must differ"
  );

export const UpdateWatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  fetchIntervalH: z.number().int().min(1).max(168).optional(),
  isActive: z.boolean().optional(),
});

export type CreateWatchInput = z.infer<typeof CreateWatchSchema>;
export type UpdateWatchInput = z.infer<typeof UpdateWatchSchema>;
