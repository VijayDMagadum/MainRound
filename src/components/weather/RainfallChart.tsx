"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from "recharts";

interface RainfallChartProps {
  hourlyTimes: string[];
  precipProb: number[];
  precipitation: number[];
  temperature: number[];
  locale: string;
}

export default function RainfallChart({
  hourlyTimes,
  precipProb,
  precipitation,
  temperature,
  locale
}: RainfallChartProps) {
  const [mounted, setMounted] = useState(false);

  // Prevent SSR hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-64 w-full bg-slate-900/50 border border-slate-850 rounded-2xl animate-pulse flex items-center justify-center">
        <span className="text-xs text-slate-500">Loading chart interface...</span>
      </div>
    );
  }

  // Map first 24 hours of data
  const chartData = hourlyTimes.slice(0, 24).map((time, index) => {
    const date = new Date(time);
    const hourLabel = date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
    
    return {
      name: hourLabel,
      Rainfall: parseFloat(precipitation[index]?.toFixed(1) || "0"),
      "Rain Prob %": precipProb[index] || 0,
      Temp: parseFloat(temperature[index]?.toFixed(1) || "0")
    };
  });

  return (
    <div className="w-full space-y-6">
      <div className="h-64 w-full bg-slate-950/40 p-4 rounded-xl border border-slate-900">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: "10px" }} />
            <YAxis yAxisId="left" stroke="#06b6d4" style={{ fontSize: "10px" }} />
            <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" style={{ fontSize: "10px" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                borderColor: "#1e293b",
                borderRadius: "12px",
                fontSize: "11px"
              }}
            />
            <Legend wrapperStyle={{ fontSize: "10px" }} />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="Rainfall"
              stroke="#06b6d4"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRain)"
              name="Rain (mm)"
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="Temp"
              stroke="#f59e0b"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorTemp)"
              name="Temp (°C)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Rainfall Probability Bar Chart */}
        <div className="h-60 w-full bg-slate-950/40 p-4 rounded-xl border border-slate-900">
          <h4 className="text-xs font-bold text-slate-400 mb-2 px-1">Rainfall Probability (%)</h4>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: "8px" }} />
              <YAxis stroke="#22d3ee" style={{ fontSize: "8px" }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#1e293b",
                  borderRadius: "8px",
                  fontSize: "10px"
                }}
              />
              <Bar dataKey="Rain Prob %" fill="#00bbf9" radius={[4, 4, 0, 0]} name="Probability %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Textual summary for screen-readers */}
        <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-900 flex flex-col justify-center text-xs space-y-2 text-slate-400">
          <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">Forecast Chart Summary</h4>
          <p>
            This visualization graphs the upcoming 24-hour weather timeline. The primary line charts rainfall volume 
            in millimeters (blue axis), overlaid with temperature curves (orange axis).
          </p>
          <p>
            If the rainfall bars exceed **15mm**, you should avoid taking low-lying routes. A probability index 
            nearing **80%** suggests rainfall is almost guaranteed.
          </p>
        </div>
      </div>
    </div>
  );
}
