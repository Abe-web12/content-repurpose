"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LineChartCard = dynamic(() => import("@/components/charts").then((m) => ({ default: m.LineChartCard })), { ssr: false });

interface AIUsageChartProps {
  data: Array<{ date: string; requests: number; tokens: number; cost: number }>;
  dataKey?: string;
  title?: string;
}

export function AIUsageChart({ data, dataKey = "requests", title = "AI Usage" }: AIUsageChartProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <LineChartCard data={data} dataKey={dataKey} label={title} />
      </CardContent>
    </Card>
  );
}
