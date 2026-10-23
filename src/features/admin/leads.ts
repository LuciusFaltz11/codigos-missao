import type { NatalChartView } from "@/features/astrology/wheel";

export type AdminLeadChart = {
  id: string;
  status: string;
  engine: string;
  engineStatus: string;
  errorCode: string | null;
  createdAt: string;
  highlightPointId: string | null;
  chart: NatalChartView | null;
};

export type AdminLead = {
  id: string;
  name: string;
  email: string;
  marketingOptIn: boolean;
  createdAt: string;
  privacyAccepted: boolean | null;
  policyVersion: string | null;
  birth: null | {
    date: string;
    time: string;
    city: string;
    country: string | null;
    timezone: string;
  };
  charts: AdminLeadChart[];
};
