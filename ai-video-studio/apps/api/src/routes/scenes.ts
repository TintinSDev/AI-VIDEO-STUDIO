import express from "express";
import fs from "fs";
const router = express.Router();

router.get("/", (req, res) => {
  const files = fs.readdirSync("media/video/scenes");
  res.json(
    files.map(f => ({
      name: f,
      url: `http://localhost:3001/media/video/scenes/${f}`
    }))
  );
});

export default router;
