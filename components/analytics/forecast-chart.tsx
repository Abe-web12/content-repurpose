"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ForecastChartCard = dynamic(() => import("@/components/charts").then((m) => ({ default: m.ForecastChart })), { ssr: false });

interface ForecastChartProps {
  data: Array<{ date: string; actual?: number; predicted: number; lowerBound: number; upperBound: number }>;
  title?: string;
}

export function ForecastChartDisplay({ data, title = "Forecast" }: ForecastChartProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ForecastChartCard data={data} label={title} />
      </CardContent>
    </Card>
  );
}
