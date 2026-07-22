import { prisma } from "@/lib/prisma";

import { BuscasTable } from "@/components/BuscasTable";



export const dynamic = "force-dynamic";



export default async function BuscasPage() {

  const jobs = await prisma.scrapeJob.findMany({

    orderBy: { iniciadoEm: "desc" },

    take: 50,

  });



  return (

    <div className="p-8">

      <div className="mb-8">

        <h1 className="text-2xl font-bold text-white">Histórico de Buscas</h1>

        <p className="text-zinc-400 text-sm mt-1">

          Todas as pesquisas realizadas no Google Maps — exporte a planilha ou relatório de cada busca

        </p>

      </div>



      <BuscasTable jobs={jobs} />

    </div>

  );

}

