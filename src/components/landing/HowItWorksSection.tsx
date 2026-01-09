import { howItWorksData } from "@/data/mock";

export function HowItWorksSection() {
  return (
    <section className="how-section" id="how-it-works">
      <div className="how-container">
        <h2 className="how-headline">{howItWorksData.headline}</h2>

        <div className="steps-container">
          {howItWorksData.steps.map((step, index) => (
            <div key={index} className="step-card">
              <div className="step-number-wrapper">
                <span className="step-number">{step.number}</span>
                {index < howItWorksData.steps.length - 1 && (
                  <div className="step-connector"></div>
                )}
              </div>
              <div className="step-content">
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
