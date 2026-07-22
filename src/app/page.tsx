import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Visão geral do funil de prospecção — Finder Business
        </p>
      </div>
      <DashboardClient />
    </div>
  );
}
