import type { Metadata } from "next";
import { AddSanctuaryWizard } from "@/components/host/AddSanctuaryWizard";

export const metadata: Metadata = {
  title: "Add New Sanctuary — Aggarly by Lona",
  description:
    "Curate and publish a secluded architectural sanctuary to the Aggarly portfolio with real-time photographic and topological calibration.",
};

export default function AddSanctuaryPage() {
  return <AddSanctuaryWizard />;
}
