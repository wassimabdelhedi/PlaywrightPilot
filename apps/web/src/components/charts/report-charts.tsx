"use client";

import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardTitle } from "@/components/ui/card";

interface StatsData {
  totalExecutions: number;
  passedCount: number;
  failedCount: number;
  flakyCount: number;
  successRate: number;
  failuresByClassification?: Record<string, number>;
}

export function ReportCharts({ stats }: { stats: StatsData }) {
  const pieData = useMemo(() => {
    return [
      { name: "Succès", value: stats.passedCount, color: "#10b981" }, // Emerald 500
      { name: "Échecs", value: stats.failedCount, color: "#ef4444" }, // Red 500
      { name: "Flaky", value: stats.flakyCount, color: "#f59e0b" }, // Amber 500
    ].filter((d) => d.value > 0);
  }, [stats]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-border bg-zinc-950 p-3 shadow-xl">
          <p className="font-medium text-white">{payload[0].name}</p>
          <p className="text-sm text-zinc-400">
            {payload[0].value} exécution{payload[0].value > 1 ? "s" : ""}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="flex flex-col h-[350px]">
      <CardTitle className="mb-4">Répartition des Résultats</CardTitle>
      
      {stats.totalExecutions === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted">
          Aucune donnée d'exécution
        </div>
      ) : (
        <div className="flex-1 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none mb-8">
            <div className="text-center">
              <span className="block text-3xl font-display font-bold text-foreground">
                {Math.round(stats.successRate)}%
              </span>
              <span className="block text-[10px] uppercase tracking-wider text-muted">
                Succès
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
