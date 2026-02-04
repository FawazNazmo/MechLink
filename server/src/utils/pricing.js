// server/src/utils/pricing.js

// Simple static profiles for demo – extend as needed
const PROFILES = [
  {
    serviceType: "front_brake_pads",
    carSize: "small",
    baseParts: 80,
    baseHours: 1.5,
    labourMin: 50,
    labourMax: 80,
    marginPercent: 0.25,
  },
  {
    serviceType: "oil_service",
    carSize: "small",
    baseParts: 60,
    baseHours: 1.0,
    labourMin: 40,
    labourMax: 70,
    marginPercent: 0.25,
  },
  {
    serviceType: "diagnostic",
    carSize: "any",
    baseParts: 0,
    baseHours: 0.5,
    labourMin: 50,
    labourMax: 80,
    marginPercent: 0.25,
  },
];

export function computeFairRange(serviceType, carSize) {
  if (!serviceType) return null;
  const size = carSize || "any";

  const profile =
    PROFILES.find(
      (p) => p.serviceType === serviceType && (p.carSize === size || p.carSize === "any")
    ) || null;

  if (!profile) return null;

  const { baseParts, baseHours, labourMin, labourMax, marginPercent } = profile;
  const min = baseParts + baseHours * labourMin;
  const max = baseParts + baseHours * labourMax;
  const softMax = max * (1 + (marginPercent || 0.25));

  return { min, max, softMax };
}

export function classifyPrice(cost, fair) {
  if (!fair || !cost || cost <= 0) {
    return { flag: "unknown" };
  }

  const { min, max, softMax } = fair;

  if (cost < min * 0.7) {
    return { flag: "low" }; // suspiciously cheap
  }
  if (cost <= max * 1.1) {
    return { flag: "fair" };
  }
  if (cost <= softMax) {
    return { flag: "slightly_high" };
  }
  return { flag: "high" };
}
