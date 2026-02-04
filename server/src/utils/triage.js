// server/src/utils/triage.js

export const TRIAGE_RULES = [
  {
    id: "brake_squeal",
    keywords: ["brake", "squeak", "squealing", "screech"],
    likelyIssue: "Brake pad wear or rotor issue",
    urgency: "HIGH",
    advice: "Avoid high speeds and hard braking. Book a brake inspection as soon as possible.",
    recommendedAction: "SERVICE_SOON",
  },
  {
    id: "engine_overheat",
    keywords: ["overheat", "smoke", "steam", "temperature high"],
    likelyIssue: "Engine overheating / coolant issue",
    urgency: "CRITICAL",
    advice: "Stop driving immediately and request breakdown support.",
    recommendedAction: "BREAKDOWN",
  },
  {
    id: "pulling_side",
    keywords: ["pulling", "pulls", "alignment"],
    likelyIssue: "Wheel alignment or tyre pressure issue",
    urgency: "MEDIUM",
    advice: "Drive carefully and avoid long journeys. Book an alignment check.",
    recommendedAction: "SERVICE_SOON",
  },
  {
    id: "starting_issue",
    keywords: ["won't start", "no start", "clicking", "battery"],
    likelyIssue: "Battery or starter motor problem",
    urgency: "MEDIUM",
    advice: "Check battery and consider breakdown support if stranded.",
    recommendedAction: "BREAKDOWN_OR_SERVICE",
  },
];

export function triageSymptom(description = "") {
  const text = description.toLowerCase();
  const matches = [];

  TRIAGE_RULES.forEach((rule) => {
    const hit = rule.keywords.some((k) => text.includes(k.toLowerCase()));
    if (hit) {
      matches.push({
        likelyIssue: rule.likelyIssue,
        urgency: rule.urgency,
        advice: rule.advice,
        recommendedAction: rule.recommendedAction,
      });
    }
  });

  if (matches.length === 0) {
    matches.push({
      likelyIssue: "Unknown issue",
      urgency: "UNKNOWN",
      advice:
        "Unable to classify the symptom. If you feel unsafe, request breakdown assistance. Otherwise, book a diagnostic check.",
      recommendedAction: "CHECK",
    });
  }

  return matches;
}
