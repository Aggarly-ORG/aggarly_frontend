import type { Metadata } from "next";
import { HostPortfolioView } from "../../components/host/HostPortfolioView";

export const metadata: Metadata = {
  title: "Host Portfolio & Sanctuaries — Aggarly by Lona",
  description:
    "Curator and host portal for managing secluded architectural sanctuaries, resident arrivals, and real operational telemetry.",
};

export default function HostPage() {
  return <HostPortfolioView />;
}
