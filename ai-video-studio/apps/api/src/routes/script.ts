import { Router } from "express";

const router = Router();

router.post("/analyze", (req, res) => {
  const words = req.body.text.split(" ").length;
  res.json({ estimatedMinutes: words / 140 });
});

export default router;
