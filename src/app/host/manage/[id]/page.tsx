import React, { Suspense } from "react";
import { ManageSanctuaryView } from "@/components/host/ManageSanctuaryView";
import { Loader2 } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ManagePropertyPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#EFEEEC] flex items-center justify-center">
          <div className="p-8 rounded-[28px] bg-[#0A0A0C] border border-[#2A2A2E] text-center flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[#8FAE97] animate-spin" />
            <span className="text-[#F5F4F1] font-medium text-sm">
              Loading Sanctuary Management Console...
            </span>
          </div>
        </div>
      }
    >
      <ManageSanctuaryView propertyId={id} />
    </Suspense>
  );
}
