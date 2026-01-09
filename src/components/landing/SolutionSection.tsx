"use client";

import { solutionData, type Feature } from "@/data/mock";
import {
  MessageSquare,
  Shield,
  Zap,
  CheckCircle,
  LucideIcon,
} from "lucide-react";

const iconComponents: Record<Feature["icon"], LucideIcon> = {
  MessageSquare,
  Shield,
  Zap,
  CheckCircle,
};

export function SolutionSection() {
  return (
    <section className="solution-section" id="features">
      <div className="solution-container">
        <div className="solution-header">
          <h2 className="solution-headline">{solutionData.headline}</h2>
          <p className="solution-subheadline">{solutionData.subheadline}</p>
        </div>

        <div className="solution-grid">
          {solutionData.features.map((feature, index) => {
            const Icon = iconComponents[feature.icon];
            return (
              <div key={index} className="feature-card">
                <div className="feature-card-header">
                  <div className="feature-icon">
                    <Icon size={24} />
                  </div>
                  <h3 className="feature-title">{feature.title}</h3>
                </div>
                <p className="feature-description">{feature.description}</p>
                <div className="feature-card-glow"></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
