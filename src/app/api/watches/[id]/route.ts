import { NextRequest, NextResponse } from "next/server";
import { getWatch, updateWatch, deleteWatch } from "@/lib/db/queries";
import { UpdateWatchSchema } from "@/lib/validation";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const id = Number(params.id);
  const watch = await getWatch(id);
  if (!watch) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(watch);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const id = Number(params.id);
  const body = await req.json();
  const result = UpdateWatchSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation error", issues: result.error.issues },
      { status: 400 }
    );
  }

  const watch = await updateWatch(id, result.data);
  if (!watch) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(watch);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const id = Number(params.id);
  const existing = await getWatch(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteWatch(id);
  return new NextResponse(null, { status: 204 });
}
