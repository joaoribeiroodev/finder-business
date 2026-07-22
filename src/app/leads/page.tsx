import { prisma } from "@/lib/prisma";
import { LeadsPageClient } from "@/components/LeadsPageClient";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const limit = 20;
  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.lead.count(),
  ]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Painel de Leads</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Gerencie e prospecte seus contatos B2B
        </p>
      </div>
      <LeadsPageClient
        initialLeads={leads}
        initialPagination={{
          page: 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        }}
      />
    </div>
  );
}
