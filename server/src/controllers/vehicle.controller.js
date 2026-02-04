// server/src/controllers/vehicle.controller.js
import Vehicle from "../models/Vehicle.js";
import ServiceRecord from "../models/ServiceRecord.js";
import { calculateHealthScore, getHealthRecommendations } from "../utils/scoring.js";

/**
 * GET /api/vehicles/my
 * Get vehicles for logged-in user
 */
export async function getMyVehicles(req, res, next) {
  try {
    const vehicles = await Vehicle.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/vehicles/:id/health
 */
export async function getVehicleHealth(req, res, next) {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    const recentRecords = await ServiceRecord.find({ vehicle: vehicle._id })
      .sort({ createdAt: -1 })
      .limit(20);

    const healthScore = calculateHealthScore(vehicle, recentRecords);
    vehicle.healthScore = healthScore;
    await vehicle.save();

    const recommendations = getHealthRecommendations(vehicle, healthScore);

    res.json({
      vehicleId: vehicle._id,
      healthScore,
      recommendations,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/vehicles/:id/compliance
 * Update MOT / insurance / tax dates
 */
export async function updateCompliance(req, res, next) {
  try {
    const { motDueDate, insuranceDueDate, taxDueDate } = req.body;

    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { motDueDate, insuranceDueDate, taxDueDate },
      { new: true }
    );

    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    res.json(vehicle);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/vehicles/:id/compliance
 */
export async function getCompliance(req, res, next) {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    res.json({
      motDueDate: vehicle.motDueDate,
      insuranceDueDate: vehicle.insuranceDueDate,
      taxDueDate: vehicle.taxDueDate,
    });
  } catch (err) {
    next(err);
  }
}
