"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const StackedBarChart = dynamic(() => import("@/components/charts").then((m) => ({ default: m.StackedBarChart })), { ssr: false });

interface UserGrowthChartProps {
  data: Array<{ date: string; activeCustomers: number; newCustomers: number; churnedCustomers: number }>;
}

export function UserGrowthChart({ data }: UserGrowthChartProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">User Growth</CardTitle>
      </CardHeader>
      <CardContent>
        <StackedBarChart data={data} keys={["newCustomers", "churnedCustomers"]} label="User Growth" />
      </CardContent>
    </Card>
  );
}
