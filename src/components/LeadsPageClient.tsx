"use client";

import { useState } from "react";
import type { Lead } from "@prisma/client";
import { ScraperForm } from "./ScraperForm";
import { LeadTable } from "./LeadTable";

interface LeadsPageClientProps {
  initialLeads: Lead[];
  initialPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function LeadsPageClient({ initialLeads, initialPagination }: LeadsPageClientProps) {
  const [tableVersion, setTableVersion] = useState(0);

  return (
    <>
      <div className="mb-8">
        <ScraperForm
          onComplete={() => {
            setTableVersion((current) => current + 1);
          }}
        />
      </div>
      <LeadTable
        key={tableVersion}
        initialLeads={initialLeads}
        initialPagination={initialPagination}
      />
    </>
  );
}
