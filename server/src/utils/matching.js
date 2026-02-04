// server/src/utils/matching.js

export function calculateMechanicMatchScore({
  rating = 0,
  similarJobsCount = 0,
  avgResponseMinutes = 60,
  distanceKm = 5, // if you later add distance, else keep 5
}) {
  // Normalise values
  const normRating = rating / 5; // 0–1
  const normJobs = Math.min(similarJobsCount / 20, 1); // cap at 20 jobs
  const normResponse = 1 - Math.min(avgResponseMinutes / 60, 1); // faster -> higher
  const normDistance = 1 - Math.min(distanceKm / 20, 1); // closer -> higher

  const score =
    0.4 * normRating + 0.3 * normJobs + 0.2 * normResponse + 0.1 * normDistance;

  return Math.round(score * 100); // 0–100
}
