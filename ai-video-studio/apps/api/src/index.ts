import express from "express";
import cors from "cors";
import http from "http";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getAuthClient } from "./auth/auth";
import renderRouter from "./routes/render";
import { renderQueue } from "./queue/renderQueue";
import { initSocket } from "./socket";
import { getRender } from "./state/renderState";
import { uploadToYouTube } from "./services/youtubeUploader";

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use("/media", express.static("media"));

initSocket(server);

const getDirSize = (dirPath: string): number => {
  let size = 0;
  if (!fs.existsSync(dirPath)) return 0;

  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    if (stats.isFile()) size += stats.size;
    else if (stats.isDirectory()) size += getDirSize(filePath);
  }
  return size;
};
app.get("/", (_, res) => {
  res.send("API running");
});

app.use("/", renderRouter);
// or app.use("/api", renderRouter);

app.post("/render", async (req, res) => {
  const { script, style, mode = "cinematic" } = req.body;

  if (!script) {
    return res.status(400).json({ error: "Script required" });
  }

  const jobId = crypto.randomUUID();

  await renderQueue.add("render", {
    jobId,
    script,
    style,
    mode,
  });

  res.json({ jobId });
});

app.get("/render/:jobId", (req, res) => {
  const render = getRender(req.params.jobId);

  if (!render) {
    return res.status(404).json({ error: "Render not found" });
  }

  res.json(render);
});

app.get("/oauth2callback", async (req, res) => {
  const { code } = req.query;
  if (code) {
    res.send(
      "✅ Authentication successful! You can close this tab and check your terminal."
    );
  } else {
    res.status(400).send("❌ No code found in the URL.");
  }
});
app.post("/api/upload-youtube", async (req, res) => {
  const { jobId, title, description } = req.body;

  try {
    const videoPath = path.resolve(
      process.cwd(),
      `media/output/final_${jobId}.mp4`
    );

    const auth = await getAuthClient();

    const videoId = await uploadToYouTube(auth, {
      title: title || "AI Generated Video",
      description: description || "Created with AI Video Studio",
      videoPath: videoPath,
    });

    res.json({ success: true, url: `https://youtu.be/${videoId}`, videoId });
  } catch (error: any) {
    console.error("Upload failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/storage-stats", (req, res) => {
  try {
    const mediaPath = path.resolve(process.cwd(), "media");
    const totalBytes = getDirSize(mediaPath);
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);

    res.json({
      sizeMB: parseFloat(totalMB),
      formatted: totalMB + " MB",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to calculate storage" });
  }
});
app.get("/api/history", (req, res) => {
  try {
    const outputDir = path.resolve(process.cwd(), "media/output");
    const thumbDir = path.resolve(process.cwd(), "media/thumbs");

    // Create directories if they don't exist to prevent crash
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });

    const files = fs
      .readdirSync(outputDir)
      .filter((file) => file.startsWith("final_") && file.endsWith(".mp4"))
      .map((file) => {
        const jobId = file.replace("final_", "").replace(".mp4", "");
        const filePath = path.join(outputDir, file);
        const stats = fs.statSync(filePath);

        return {
          id: jobId,
          url: `/media/output/${file}`,
          thumbnail: `/media/thumbs/thumb_${jobId}.jpg`, // Ensure this matches renderPipeline
          createdAt: stats.birthtime,
          size: (stats.size / (1024 * 1024)).toFixed(2) + " MB",
        };
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    res.json(files);
  } catch (error) {
    console.error("History API Error:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});
app.use(
  "/media/output",
  (req, res, next) => {
    if (req.query.download) {
      res.setHeader("Content-Disposition", "attachment");
    }
    next();
  },
  express.static(path.join(process.cwd(), "media/output"))
);
app.delete("/api/history/:jobId", (req, res) => {
  const { jobId } = req.params;

  const targetFolders = [
    "media/images",
    "media/audio",
    "media/video",
    "media/output",
    "media/thumbs",
  ];

  try {
    let deletedCount = 0;

    targetFolders.forEach((folder) => {
      const dirPath = path.resolve(process.cwd(), folder);

      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);

        files.forEach((file) => {
          // This matches any file containing the Unique Job ID
          if (file.includes(jobId)) {
            fs.unlinkSync(path.join(dirPath, file));
            deletedCount++;
          }
        });
      }
    });

    console.log(
      `🧹 Deep Clean Complete: Removed ${deletedCount} files for Job ${jobId}`
    );
    res.json({ success: true, message: `Removed ${deletedCount} assets.` });
  } catch (error) {
    console.error("Cleanup Error:", error);
    res.status(500).json({ error: "Failed to clear all assets." });
  }
});
server.listen(3001, () => {
  console.log("API + WS running on http://localhost:3001");
});
