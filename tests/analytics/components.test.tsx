import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sparkles } from "lucide-react";
import { StatCard } from "@/components/analytics/stat-card";
import { KPIGrid } from "@/components/analytics/kpi-grid";
import { EmptyState } from "@/components/analytics/empty-state";
import { LoadingSkeleton } from "@/components/analytics/loading-skeleton";
import { BenchmarkCard } from "@/components/analytics/benchmark-card";
import { DateRangePicker } from "@/components/analytics/date-range-picker";
import { AlertCard } from "@/components/analytics/alert-card";

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: any[]) => inputs.filter(Boolean).join(" "),
  formatRelativeTime: () => "2 days ago",
}));

describe("StatCard", () => {
  it("renders with title and value", () => {
    render(<StatCard title="Revenue" value="$10,000" icon={Sparkles} />);
    expect(screen.getByText("Revenue")).toBeDefined();
    expect(screen.getByText("$10,000")).toBeDefined();
  });

  it("shows positive change percentage", () => {
    render(<StatCard title="Users" value="500" changePct={15} icon={Sparkles} subtitle="vs last month" />);
    expect(screen.getByText("+15%")).toBeDefined();
    expect(screen.getByText("vs last month")).toBeDefined();
  });

  it("shows negative change percentage", () => {
    render(<StatCard title="Churn" value="5" changePct={-10} icon={Sparkles} />);
    expect(screen.getByText("-10%")).toBeDefined();
  });

  it("shows zero change as stable", () => {
    render(<StatCard title="MRR" value="10000" changePct={0} icon={Sparkles} />);
    expect(screen.getByText("0%")).toBeDefined();
  });
});

describe("KPIGrid", () => {
  it("renders multiple KPI items", () => {
    const items = [
      { label: "MRR", value: 10000, change: 5, format: "currency" as const },
      { label: "Users", value: 500, change: 10, format: "number" as const },
      { label: "Churn", value: 2, change: -1, format: "percent" as const },
    ];
    render(<KPIGrid items={items} />);
    expect(screen.getByText("MRR")).toBeDefined();
    expect(screen.getByText("Users")).toBeDefined();
    expect(screen.getByText("Churn")).toBeDefined();
  });

  it("formats currency values", () => {
    const items = [{ label: "Revenue", value: 25000, format: "currency" as const }];
    render(<KPIGrid items={items} />);
    expect(screen.getByText("$25,000")).toBeDefined();
  });

  it("formats percent values", () => {
    const items = [{ label: "Rate", value: 85, format: "percent" as const }];
    render(<KPIGrid items={items} />);
    expect(screen.getByText("85%")).toBeDefined();
  });

  it("handles string values", () => {
    const items = [{ label: "Plan", value: "Pro" }];
    render(<KPIGrid items={items} />);
    expect(screen.getByText("Pro")).toBeDefined();
  });
});

describe("EmptyState", () => {
  it("renders default empty state", () => {
    render(<EmptyState />);
    expect(screen.getByText("No data available")).toBeDefined();
  });

  it("renders custom title and description", () => {
    render(<EmptyState title="No results" description="Try a different filter." />);
    expect(screen.getByText("No results")).toBeDefined();
    expect(screen.getByText("Try a different filter.")).toBeDefined();
  });
});

describe("LoadingSkeleton", () => {
  it("renders skeleton cards", () => {
    const { container } = render(<LoadingSkeleton cards={4} charts={1} />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("BenchmarkCard", () => {
  it("renders benchmark metrics", () => {
    render(
      <BenchmarkCard
        metric="mrr"
        orgValue={15000}
        percentile={75}
        average={10000}
        median={9500}
        topPerformer={50000}
      />
    );
    expect(screen.getByText("Mrr")).toBeDefined();
    expect(screen.getByText("75th")).toBeDefined();
  });

  it("shows above average indicator", () => {
    render(
      <BenchmarkCard
        metric="revenue"
        orgValue={20000}
        percentile={90}
        average={10000}
        median={9500}
        topPerformer={50000}
      />
    );
    expect(screen.getByText("Above average")).toBeDefined();
  });

  it("shows below average indicator", () => {
    render(
      <BenchmarkCard
        metric="churn"
        orgValue={500}
        percentile={25}
        average={1000}
        median={950}
        topPerformer={200}
      />
    );
    expect(screen.getByText("Below average")).toBeDefined();
  });
});

describe("DateRangePicker", () => {
  it("renders date range options", () => {
    render(<DateRangePicker value={30} onChange={() => {}} />);
    expect(screen.getByText("7D")).toBeDefined();
    expect(screen.getByText("30D")).toBeDefined();
    expect(screen.getByText("90D")).toBeDefined();
    expect(screen.getByText("1Y")).toBeDefined();
  });

  it("highlights selected option", () => {
    render(<DateRangePicker value={30} onChange={() => {}} />);
    const button = screen.getByText("30D");
    expect(button.className).toContain("bg-brand-500");
  });
});

describe("AlertCard", () => {
  const baseEvent = {
    id: "e1",
    metric: "mrr",
    value: 5000,
    condition: "lt",
    threshold: 10000,
    message: "MRR dropped below threshold: 5000 (threshold: 10000)",
    status: "triggered",
    createdAt: new Date().toISOString(),
    alert: { name: "MRR Drop Alert", metric: "mrr" },
  };

  it("renders triggered alert", () => {
    render(<AlertCard event={baseEvent} />);
    expect(screen.getByText("MRR Drop Alert")).toBeDefined();
    expect(screen.getByText("triggered")).toBeDefined();
  });

  it("renders acknowledged alert", () => {
    render(<AlertCard event={{ ...baseEvent, status: "acknowledged" }} />);
    expect(screen.getByText("acknowledged")).toBeDefined();
  });

  it("renders resolved alert", () => {
    render(<AlertCard event={{ ...baseEvent, status: "resolved" }} />);
    expect(screen.getByText("resolved")).toBeDefined();
  });

  it("shows acknowledge button for triggered alerts", () => {
    const onAck = vi.fn();
    render(<AlertCard event={baseEvent} onAcknowledge={onAck} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("shows resolve button for non-resolved alerts", () => {
    const onResolve = vi.fn();
    render(<AlertCard event={baseEvent} onResolve={onResolve} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});
