"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { promptLevelColor, promptLevelLabel } from "../lib/goal-utils";

interface ProgressDataPoint {
  date: string;
  accuracy: number;
  trials?: number;
  correct?: number;
  promptLevel?: "independent" | "verbal-cue" | "model" | "physical";
}

interface ProgressChartProps {
  data: ProgressDataPoint[];
  targetAccuracy: number;
}

function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: ProgressDataPoint;
}) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={promptLevelColor(payload.promptLevel)}
      stroke="white"
      strokeWidth={2}
    />
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ProgressDataPoint }>;
}) {
  if (!active || !payload?.[0]) return null;
  const dp = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-background p-3 shadow-md">
      <p className="text-sm font-medium">{dp.date}</p>
      <p className="text-sm">Accuracy: {dp.accuracy}%</p>
      {dp.trials !== undefined && (
        <p className="text-sm text-muted-foreground">
          {dp.correct}/{dp.trials} trials
        </p>
      )}
      {dp.promptLevel && (
        <p className="text-sm text-muted-foreground">
          Prompt: {promptLevelLabel(dp.promptLevel)}
        </p>
      )}
    </div>
  );
}

export function ProgressChart({ data, targetAccuracy }: ProgressChartProps) {
  if (data.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          {data.length === 0
            ? "No progress data yet."
            : "At least 2 data points needed to show a chart."}
        </p>
      </div>
    );
  }

  // Reverse to chronological order for the chart (data comes in desc)
  const chartData = [...data].reverse();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine
          y={targetAccuracy}
          stroke="var(--color-chart-target)"
          strokeDasharray="4 4"
          label={{ value: `Target: ${targetAccuracy}%`, position: "right", fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="accuracy"
          stroke="var(--color-chart-line)"
          strokeWidth={2}
          dot={<CustomDot />}
          activeDot={{ r: 7 }}
        />
        <Legend
          content={() => (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs">
              {(["independent", "verbal-cue", "model", "physical"] as const).map((level) => (
                <div key={level} className="flex items-center gap-1">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: promptLevelColor(level) }}
                  />
                  <span>{promptLevelLabel(level)}</span>
                </div>
              ))}
            </div>
          )}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
