import { NextRequest, NextResponse } from "next/server";
import { getPriceHistory } from "@/lib/db/queries";

export async function GET(
  _req: NextRequest,
  { params }: { params: { watchId: string } }
) {
  const history = await getPriceHistory(Number(params.watchId));
  return NextResponse.json(history.rows);
}
