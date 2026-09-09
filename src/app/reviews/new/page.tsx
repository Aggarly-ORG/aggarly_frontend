import React, { Suspense } from "react";
import { Metadata } from "next";
import { GuestReviewView } from "@/components/reviews/GuestReviewView";
import { RotateCw } from "lucide-react";

export const metadata: Metadata = {
  title: "Guest Stay Review & Reflection — Aggarly by Lona",
  description: "Curatorial appraisal and architectural reflection for your completed sanctuary residence.",
};

export default function NewReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#EFEEEC] flex items-center justify-center p-8">
          <div className="rounded-[28px] bg-[#0A0A0C] border border-[#2A2A2E] text-[#F5F4F1] p-12 flex flex-col items-center gap-4 shadow-2xl">
            <RotateCw className="w-8 h-8 text-white animate-spin" />
            <p className="font-serif text-lg tracking-wider uppercase text-[#F5F4F1]">
              Calibrating Residence Reflection...
            </p>
          </div>
        </div>
      }
    >
      <GuestReviewView />
    </Suspense>
  );
}
