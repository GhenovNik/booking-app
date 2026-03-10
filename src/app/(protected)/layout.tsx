import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-sm">FareTicketHunter</span>
        <form action="/api/auth/logout" method="POST">
          <button className="text-xs text-gray-400 hover:text-gray-200 transition-colors">
            Sign out
          </button>
        </form>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
