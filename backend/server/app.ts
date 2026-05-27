import express, { type Request, type Response } from "express";

const router = express.Router();

/**
 * TEMP IMPLEMENTATION
 * Replace DB calls once real repo pattern is confirmed
 */

const fakeDB: any[] = [];

router.get("/:petId", async (req: Request, res: Response) => {
  const { petId } = req.params;

  const record = fakeDB.find((x) => x.pet_id === petId);

  res.json(record || null);
});

router.put("/:petId", async (req: Request, res: Response) => {
  const { petId } = req.params;

  const {
    weight_min,
    weight_max,
    temperature_min,
    temperature_max,
    heart_rate_min,
    heart_rate_max,
    activity_min,
    activity_max,
  } = req.body;

  // validation
  if (temperature_min < 30 || temperature_max > 45) {
    return res.status(400).json({ error: "Unsafe temperature range" });
  }

  if (heart_rate_min < 20 || heart_rate_max > 300) {
    return res.status(400).json({ error: "Unsafe heart rate range" });
  }

  const existingIndex = fakeDB.findIndex((x) => x.pet_id === petId);

  const newRecord = {
    pet_id: petId,
    weight_min,
    weight_max,
    temperature_min,
    temperature_max,
    heart_rate_min,
    heart_rate_max,
    activity_min,
    activity_max,
    updated_at: new Date(),
  };

  if (existingIndex === -1) {
    fakeDB.push(newRecord);
  } else {
    fakeDB[existingIndex] = newRecord;
  }

  res.json({ success: true });
});

export default router;