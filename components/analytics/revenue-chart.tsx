"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AreaChartCard = dynamic(() => import("@/components/charts").then((m) => ({ default: m.AreaChartCard })), { ssr: false });

interface RevenueChartProps {
  data: Array<{ date: string; mrr: number; arr: number; grossRevenue: number; netRevenue: number }>;
  dataKey?: string;
  title?: string;
}

export function RevenueChart({ data, dataKey = "mrr", title = "Revenue Trend" }: RevenueChartProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <AreaChartCard data={data} dataKey={dataKey} label={title} />
      </CardContent>
    </Card>
  );
}
