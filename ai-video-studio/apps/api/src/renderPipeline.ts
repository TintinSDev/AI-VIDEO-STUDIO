import fs from "fs";
import path from "path";
import { loopVideoToAudio } from "./services/videoLoop";
import { assembleVideo } from "./services/videoStitcher";
import { emitProgress } from "./socket";
import { generateVideo } from "./services/videoProvider"; // RUNWAY
import { generateImage } from "./services/imageProvider"; // RUNWAY
import { generateAudio } from "./services/elevenlabs";
import { calculateCost } from "./services/costTracker";
import { planScenes } from "./services/scenePlanner";
import { buildPrompt } from "./services/promptEngine";
import { initRender, updateRender, updateScene } from "./state/renderState";
import { generateShorts } from "./services/shortsCutter";
import { StylePresetKey } from "./services/stylePresets";
import { withRetry } from "./utils/withRetry";
import { createSrtFile } from "./services/subtitleGenerator";
import { mergeSrtFiles } from "./services/subtitleGenerator";
import { getMediaDuration, generateThumbnail } from "./utils/videoUtils";

import { getAuthClient } from "./auth/auth";

/**
 * Main render orchestrator
 */
export async function renderPipeline(
  jobId: string,
  script: any,
  user: {
    planLimitUSD: number;
    mode: "full" | "image" | "video" | "audio";
    style: StylePresetKey;
  }
) {
  console.log("=== RENDER PIPELINE START ===");
  emitProgress(jobId, { status: "started" });

  // 1. Plan scenes and initialize state
  const scenes = planScenes(script);
  initRender(jobId, scenes.length);
  updateRender(jobId, { status: "rendering" });

  // 💰 Cost guard
  const totalMinutes = scenes.reduce((s, x) => s + x.duration, 0) / 60;
  const estimatedCost = calculateCost(totalMinutes);

  if (estimatedCost > user.planLimitUSD) {
    updateRender(jobId, { status: "error" });
    throw new Error("Cost limit exceeded");
  }

  // Path to store the SRT for the first scene (used for the vertical short)
  let primarySrtPath = "";

  try {
    for (let i = 0; i < scenes.length; i++) {
      updateScene(jobId, i, { status: "rendering" });
      emitProgress(jobId, {
        status: "rendering",
        scene: i + 1,
        totalScenes: scenes.length,
      });

      const scene = scenes[i];
      // SAFETY: Fallback for different property names in your script object
      const sceneText = scene.narration || scene.text || "";
      const prompt = buildPrompt(scene, user.style);

      console.log(`🎬 Scene ${i} Processing...`);

      // 🎙 AUDIO & SRT GENERATION
      if (user.mode === "audio" || user.mode === "full") {
        // Generate audio file first
        await withRetry(() => generateAudio(i, sceneText, jobId));

        // 2. Define path (Ensure this matches exactly where generateAudio saves it)
        const audioPath = path.join(
          process.cwd(),
          "media",
          "audio",
          "narration",
          `scene_${i}_${jobId}.mp3`
        );
        if (!fs.existsSync(audioPath)) {
          console.error(`🚨 Audio file NOT found at: ${audioPath}`);
          // Optional: wait 500ms for disk write if needed
        }
        const duration = getMediaDuration(audioPath);

        // 5. Create SRT
        const srtPath = path.join(
          process.cwd(),
          "media",
          "output",
          `scene_${i}_${jobId}.srt`
        );
        if (!duration || isNaN(duration)) {
          console.error(`❌ Could not determine duration for ${audioPath}`);
          // Fallback to a default or throw a better error
        }
        createSrtFile(sceneText, jobId, duration, srtPath);

        // Store first scene SRT to use for the Short later
        if (i === 0) primarySrtPath = srtPath;
      }

      // 🖼 IMAGE
      if (user.mode === "image" || user.mode === "full") {
        await withRetry(() => generateImage(i, jobId, prompt));
      }

      // 🎥 VIDEO
      if (user.mode === "video" || user.mode === "full") {
        await withRetry(() => generateVideo(i, jobId, prompt));
        loopVideoToAudio(i, jobId);
      }

      updateScene(jobId, i, {
        status: "complete",
        thumbnail: `/media/thumbs/scene_${i}.jpg`,
      });
    }
  } catch (err: any) {
    fs.mkdirSync("media/errors", { recursive: true });
    fs.writeFileSync("media/errors/render.log", err?.stack || String(err));
    updateRender(jobId, { status: "error" });
    emitProgress(jobId, { status: "error" });
    throw err;
  }

  // 📦 Final Assembly Stage
  if (user.mode === "video" || user.mode === "full") {
    try {
      emitProgress(jobId, { status: "assembling" });
      console.log("📦 Starting Final Assembly...");

      // 1. Generate the Master SRT (The Sidecar file for YouTube)
      const masterSrtPath = path.resolve(
        process.cwd(),
        `media/output/final_${jobId}.srt`
      );
      mergeSrtFiles(scenes, masterSrtPath, jobId);
      console.log(`📜 Master SRT created at: ${masterSrtPath}`);

      // 1. Stitch scenes together for horizontal video
      const finalVideoPath = assembleVideo(scenes.length, jobId);

      const thumbDir = path.resolve(process.cwd(), "media/thumbs");
      if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });

      const thumbPath = path.join(thumbDir, `thumb_${jobId}.jpg`);
      generateThumbnail(jobId);
      console.log(`🖼️ Thumbnail generated at: ${thumbPath}`);

      // 2. Generate Vertical Short with Burn-in Captions
      if (typeof generateShorts === "function" && primarySrtPath) {
        console.log("📱 Generating Vertical Short with Captions...");
        await generateShorts(finalVideoPath, primarySrtPath, jobId);
      }
      // Inside renderPipeline.ts (the YouTube block)
      if (user.mode === "full") {
        // console.log("🚀 Starting YouTube Upload...");

        // 1. Get auth (Make sure client_secret.json is in the root now!)
        const auth = await getAuthClient();

        // 2. Generate the timestamped description
        const dynamicDescription = generateYoutubeDescription(scenes);

        // 3. Upload
        // const videoId = await uploadToYouTube(auth, {
        //   title: scenes[0].narration.substring(0, 50) + "...", // Auto-title from first scene
        //   description: dynamicDescription,
        //   videoPath: finalVideoPath,
        //   srtPath: masterSrtPath,
        // });

        // console.log(`🚀 Live on YouTube: https://youtu.be/${videoId}`);
      }

      console.log(`✅ Pipeline Complete. Final Video: ${finalVideoPath}`);
    } catch (assemblyError: any) {
      // console.error("❌ Assembly Stage Failed:", assemblyError.message);
    }
  }

  updateRender(jobId, { status: "complete" });
  emitProgress(jobId, { status: "complete" });
  console.log("🎬 FINAL VIDEO GENERATED");
  return { success: true };
}
function generateYoutubeDescription(scenes: any[]): string {
  let description = "🎬 AI Generated Story\n\n";
  description += "Chapters:\n";

  let currentTimestamp = 0;

  scenes.forEach((scene, index) => {
    const minutes = Math.floor(currentTimestamp / 60);
    const seconds = Math.floor(currentTimestamp % 60);
    const timeStr = `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;

    // Clean up narration for the chapter title (first 40 chars)
    const title =
      (scene.narration || "Scene " + index)
        .substring(0, 40)
        .replace(/\n/g, " ") + "...";

    description += `${timeStr} - ${title}\n`;

    // Increment timestamp by scene duration
    currentTimestamp += scene.duration || 5;
  });

  description +=
    "\n---\nCreated with AIVS (AI Video Studio)\n#AI #Automation #Storytelling";
  return description;
}
