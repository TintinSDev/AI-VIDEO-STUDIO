import { Router } from "express";
import { renderQueue } from "../queue/renderQueue";
// import { requireAuth } from "../middleware/auth";
import { v4 as uuid } from "uuid";
import { planScenes } from "../services/scenePlanner";
import { renderPipeline } from "../renderPipeline";
import { initRender, updateRender } from "../state/renderState";

const router = Router();

// router.post("/", requireAuth, async (req, res) => {
//   const { script } = req.body;

//   await renderQueue.add(
//     "render",
//     { script, userId: req.user.id },
//     { attempts: 3 }
//   );

//   res.json({ status: "queued" });
// });
// router.post("/retry/:renderId", requireAdmin, async (req, res) => {
//   const render = await prisma.render.findUnique({
//     where: { id: req.params.renderId },
//   });

//   if (!render) return res.sendStatus(404);

//   await renderQueue.add("render", {
//     script: render.script,
//     userId: render.userId,
//   });

//   res.json({ status: "requeued" });
// });

router.post("/render", async (req, res) => {
  const { script, mode = "full", style = "cinematic" } = req.body;

  if (!script?.trim()) {
    return res.status(400).json({ error: "Script required" });
  }

  // 1️⃣ Generate job ID
  const jobId = uuid();

  // 2️⃣ Plan scenes FAST (no API calls)
  const scenes = planScenes(script);

  // 3️⃣ ✅ REGISTER RENDER IMMEDIATELY
  initRender(jobId, scenes.length);
  updateRender(jobId, { status: "rendering" });

  // 4️⃣ Respond immediately (frontend starts polling)
  res.json({ jobId });

  // 5️⃣ 🔥 Run heavy work async (do NOT await)
  renderPipeline(jobId, script, {
    planLimitUSD: 5,
    mode,
    style,
  }).catch((err) => {
    console.error("Render failed:", err);
    updateRender(jobId, { status: "failed" });
  });
});

export default router;
