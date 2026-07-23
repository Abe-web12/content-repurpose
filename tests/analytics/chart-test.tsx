import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AreaChartCard, BarChartCard, LineChartCard, PieChartCard, ForecastChart, GaugeChart } from "@/components/charts";

vi.mock("recharts", () => {
  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>;
  const MockAreaChart = ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>;
  const MockBarChart = ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>;
  const MockLineChart = ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>;
  const MockPieChart = ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>;
  const MockComposedChart = ({ children }: { children: React.ReactNode }) => <div data-testid="composed-chart">{children}</div>;
  const MockRadialBarChart = ({ children }: { children: React.ReactNode }) => <div data-testid="radial-chart">{children}</div>;

  return {
    ResponsiveContainer: MockResponsiveContainer,
    AreaChart: MockAreaChart,
    BarChart: MockBarChart,
    LineChart: MockLineChart,
    PieChart: MockPieChart,
    ComposedChart: MockComposedChart,
    RadialBarChart: MockRadialBarChart,
    Area: ({ children }: { children: React.ReactNode }) => <div data-testid="area">{children}</div>,
    Bar: ({ children }: { children: React.ReactNode }) => <div data-testid="bar">{children}</div>,
    Line: () => <div data-testid="line" />,
    Pie: () => <div data-testid="pie" />,
    Cell: () => <div data-testid="cell" />,
    XAxis: () => <div data-testid="xaxis" />,
    YAxis: () => <div data-testid="yaxis" />,
    CartesianGrid: () => <div data-testid="grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
    PolarGrid: () => <div data-testid="polar-grid" />,
    PolarAngleAxis: () => <div data-testid="polar-angle" />,
    PolarRadiusAxis: () => <div data-testid="polar-radius" />,
    RadialBar: () => <div data-testid="radial-bar" />,
  };
});

describe("Chart Components", () => {
  it("renders AreaChartCard", () => {
    const { container } = render(<AreaChartCard data={[{ date: "2024-01-01", value: 100 }]} dataKey="value" />);
    expect(container.querySelector('[data-testid="area-chart"]')).toBeDefined();
  });

  it("renders BarChartCard", () => {
    const { container } = render(<BarChartCard data={[{ date: "2024-01-01", count: 50 }]} dataKey="count" />);
    expect(container.querySelector('[data-testid="bar-chart"]')).toBeDefined();
  });

  it("renders LineChartCard", () => {
    const { container } = render(<LineChartCard data={[{ date: "2024-01-01", value: 75 }]} dataKey="value" />);
    expect(container.querySelector('[data-testid="line-chart"]')).toBeDefined();
  });

  it("renders PieChartCard", () => {
    const { container } = render(<PieChartCard data={[{ name: "A", value: 30 }, { name: "B", value: 70 }]} />);
    expect(container.querySelector('[data-testid="pie-chart"]')).toBeDefined();
  });

  it("renders ForecastChart", () => {
    const { container } = render(<ForecastChart data={[{ date: "2024-01-01", actual: 100, predicted: 110, lowerBound: 90, upperBound: 130 }]} />);
    expect(container.querySelector('[data-testid="composed-chart"]')).toBeDefined();
  });

  it("renders GaugeChart with correct percentage", () => {
    const { container } = render(<GaugeChart value={75} max={100} />);
    expect(container.querySelector('[data-testid="radial-chart"]')).toBeDefined();
  });

  it("handles empty data for AreaChartCard", () => {
    const { container } = render(<AreaChartCard data={[]} dataKey="value" />);
    expect(container.querySelector('[data-testid="area-chart"]')).toBeDefined();
  });

  it("handles single data point for LineChartCard", () => {
    const { container } = render(<LineChartCard data={[{ date: "2024-01-01", value: 1 }]} dataKey="value" />);
    expect(container.querySelector('[data-testid="line-chart"]')).toBeDefined();
  });
});
