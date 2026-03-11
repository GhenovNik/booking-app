import Link from "next/link";
import { listWatches } from "@/lib/db/queries";
import { WatchCard } from "@/components/WatchCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let watches: Awaited<ReturnType<typeof listWatches>> = [];
  let dbError = false;

  try {
    watches = await listWatches();
  } catch {
    dbError = true;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">Watches</h1>
        <Link
          href="/watches/new"
          className="bg-blue-600 hover:bg-blue-500 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          + New watch
        </Link>
      </div>

      {dbError ? (
        <div className="bg-red-950 border border-red-800 rounded-xl p-4 text-sm text-red-400">
          Database connection error — check logs and ensure PostgreSQL is running.
        </div>
      ) : watches.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-4">✈️</p>
          <p className="text-base mb-1">No watches yet</p>
          <p className="text-sm mb-6">Create one to start tracking fares.</p>
          <Link
            href="/watches/new"
            className="bg-blue-600 hover:bg-blue-500 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Create your first watch
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {watches.map((watch) => (
            <WatchCard key={watch.id} watch={watch} />
          ))}
        </div>
      )}
    </div>
  );
}
