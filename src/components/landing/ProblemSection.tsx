"use client";

import { problemData } from "@/data/mock";
import { AlertTriangle, TrendingDown, Target, LucideIcon } from "lucide-react";

const iconMap: Record<number, LucideIcon> = {
  0: AlertTriangle,
  1: TrendingDown,
  2: Target,
};

export function ProblemSection() {
  return (
    <section className="problem-section" id="problem">
      <div className="problem-container">
        <div className="problem-stat-block">
          <span className="problem-stat">{problemData.stat}</span>
          <span className="problem-stat-label">{problemData.statLabel}</span>
        </div>

        <div className="problem-content">
          <h2 className="problem-headline">{problemData.headline}</h2>
          <p className="problem-description">{problemData.description}</p>

          <div className="problem-cards">
            {problemData.problems.map((problem, index) => {
              const Icon = iconMap[index];
              return (
                <div key={index} className="problem-card">
                  <div className="problem-card-icon">
                    <Icon size={24} />
                  </div>
                  <h3 className="problem-card-title">{problem.title}</h3>
                  <p className="problem-card-description">
                    {problem.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
