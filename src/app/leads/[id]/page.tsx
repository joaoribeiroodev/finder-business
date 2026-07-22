import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LeadDetailCard } from "@/components/LeadDetailCard";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      mensagens: { orderBy: { createdAt: "desc" }, take: 10 },
      scrapeJob: true,
    },
  });

  if (!lead) notFound();

  return (
    <div className="p-8 max-w-4xl">
      <LeadDetailCard lead={lead} />
    </div>
  );
}
