// server/src/utils/scoring.js
import dayjs from "dayjs";

export function calculateHealthScore(vehicle, recentRecords = []) {
  const now = dayjs();

  // Age factor
  const ageYears = vehicle.year ? now.year() - vehicle.year : 0;
  let agePenalty = Math.min(ageYears * 3, 25); // max 25 points

  // Last service factor
  let servicePenalty = 20;
  if (vehicle.lastServiceDate) {
    const monthsSinceService = now.diff(dayjs(vehicle.lastServiceDate), "month");
    servicePenalty = Math.min(monthsSinceService * 2, 30); // max 30
  }

  // Mileage factor
  let mileagePenalty = 0;
  if (vehicle.mileage) {
    const steps = Math.floor(vehicle.mileage / 20000); // every 20k
    mileagePenalty = Math.min(steps * 5, 25);
  }

  // Breakdowns factor
  const breakdowns = recentRecords.filter((r) => r.type === "BREAKDOWN").length;
  const breakdownPenalty = Math.min(breakdowns * 8, 20);

  let score = 100 - (agePenalty + servicePenalty + mileagePenalty + breakdownPenalty);
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  return Math.round(score);
}

export function getHealthRecommendations(vehicle, healthScore) {
  const recs = [];

  if (!vehicle.lastServiceDate) {
    recs.push("No previous service recorded. Book a full service soon.");
  }

  if (healthScore < 50) {
    recs.push("Vehicle health is poor. Avoid long trips and book a service immediately.");
  } else if (healthScore < 75) {
    recs.push("Consider a check-up within the next month to prevent issues.");
  } else {
    recs.push("Vehicle appears healthy. Maintain regular service intervals.");
  }

  if (vehicle.mileage && vehicle.mileage % 10000 < 1000) {
    recs.push("You are close to a 10,000km interval. Plan an oil and filter change.");
  }

  return recs;
}
