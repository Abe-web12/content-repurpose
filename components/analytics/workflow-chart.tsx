"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BarChartCard = dynamic(() => import("@/components/charts").then((m) => ({ default: m.BarChartCard })), { ssr: false });

interface WorkflowChartProps {
  data: Array<{ date: string; runs: number; successCount: number; failedCount: number }>;
}

export function WorkflowChart({ data }: WorkflowChartProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Workflow Runs</CardTitle>
      </CardHeader>
      <CardContent>
        <BarChartCard data={data} dataKey="runs" label="Workflow Runs" />
      </CardContent>
    </Card>
  );
}
