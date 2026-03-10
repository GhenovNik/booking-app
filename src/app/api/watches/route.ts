import { NextRequest, NextResponse } from "next/server";
import { listWatches, createWatch, createAlertRule } from "@/lib/db/queries";
import { CreateWatchSchema } from "@/lib/validation";

export async function GET() {
  const watches = await listWatches();
  return NextResponse.json(watches);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = CreateWatchSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation error", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { alertMaxPrice, alertCurrency, ...watchData } = result.data;

  const watch = await createWatch({
    name: watchData.name,
    origin: watchData.origin,
    destination: watchData.destination,
    mode: watchData.mode,
    pax: watchData.pax,
    cabin: watchData.cabin,
    fetchIntervalH: watchData.fetchIntervalH,
    ...(watchData.mode === "fixed"
      ? { depDate: watchData.depDate, retDate: watchData.retDate ?? null }
      : {
          depFrom: watchData.depFrom,
          depTo: watchData.depTo,
          retFrom: watchData.retFrom ?? null,
          retTo: watchData.retTo ?? null,
        }),
  });

  if (alertMaxPrice) {
    await createAlertRule({
      watchId: watch.id,
      type: "absolute_max",
      value: String(alertMaxPrice),
      currency: alertCurrency ?? "EUR",
    });
  }

  return NextResponse.json(watch, { status: 201 });
}
