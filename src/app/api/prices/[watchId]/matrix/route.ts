import { NextRequest, NextResponse } from "next/server";
import { getLatestMatrix } from "@/lib/db/queries";

export async function GET(
  _req: NextRequest,
  { params }: { params: { watchId: string } }
) {
  const matrix = await getLatestMatrix(Number(params.watchId));
  return NextResponse.json(matrix.rows);
}
