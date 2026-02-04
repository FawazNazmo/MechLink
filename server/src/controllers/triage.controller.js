// server/src/controllers/triage.controller.js
import { triageSymptom } from "../utils/triage.js";

/**
 * POST /api/triage
 * Body: { description: string }
 */
export async function triageIssue(req, res, next) {
  try {
    const { description } = req.body;
    const result = triageSymptom(description || "");
    res.json({ description, result });
  } catch (err) {
    next(err);
  }
}
