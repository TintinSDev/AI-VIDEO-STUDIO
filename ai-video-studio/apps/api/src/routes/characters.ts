import { Router } from "express";

const router = Router();

router.get("/", (_, res) => {
  res.json([
    { name: "Kong", locked: true },
    { name: "Godzilla", locked: true }
  ]);
});

export default router;
