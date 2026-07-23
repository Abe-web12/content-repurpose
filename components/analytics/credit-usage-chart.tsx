"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AreaChartCard = dynamic(() => import("@/components/charts").then((m) => ({ default: m.AreaChartCard })), { ssr: false });

interface CreditUsageChartProps {
  data: Array<{ date: string; credits: number }>;
}

export function CreditUsageChart({ data }: CreditUsageChartProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Credit Consumption</CardTitle>
      </CardHeader>
      <CardContent>
        <AreaChartCard data={data} dataKey="credits" label="Credits" />
      </CardContent>
    </Card>
  );
}
