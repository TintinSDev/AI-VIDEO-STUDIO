import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import RunwayML, { TaskFailedError } from "@runwayml/sdk";
import { execSync } from "child_process";
/**
 * 1. PROACTIVE CREDIT/AVAILABILITY CHECK
 * This ensures we don't even try a provider if the configuration is broken.
 */
async function getBestProvider(): Promise<"krea" | "runway"> {
  const preferred = (process.env.VIDEO_PROVIDER as "krea" | "runway") || "krea";

  const hasKreaKey =
    !!process.env.KREA_API_KEY && process.env.KREA_API_KEY !== "";
  const hasRunwayKey = !!(
    process.env.RUNWAY_API_KEY || process.env.RUNWAYML_API_SECRET
  );

  console.log(
    `🔍 Checking Provider Health: Krea(${hasKreaKey}) | Runway(${hasRunwayKey})`
  );

  // If preferred is Krea but key is missing, pivot to Runway
  if (preferred === "krea" && !hasKreaKey && hasRunwayKey) {
    console.warn(
      "ℹ️ Krea credentials missing. Proactively switching to Runway."
    );
    return "runway";
  }

  // If preferred is Runway but key is missing, pivot to Krea
  if (preferred === "runway" && !hasRunwayKey && hasKreaKey) {
    console.warn(
      "ℹ️ Runway credentials missing. Proactively switching to Krea."
    );
    return "krea";
  }

  // If both missing, this will fail later in the provider call with a clear error
  return preferred;
}

/**
 * 2. MAIN ENTRY POINT
 * Handles the fallback logic if the first choice fails mid-generation.
 */
export async function generateVideo(
  sceneIndex: number,
  jobId: string | number,
  prompt: string,
  duration = 6
) {
  // If you set VIDEO_PROVIDER=mock in .env, use this
  if (process.env.VIDEO_PROVIDER === "mock") {
    return await generateVideoMock(sceneIndex, jobId);
  }
  const provider = await getBestProvider();

  if (provider === "krea") {
    try {
      return await generateVideoKrea(sceneIndex, prompt);
    } catch (err) {
      console.error(
        `❌ Krea failed: ${err.message}. Attempting Runway Fallback...`
      );
      return await generateVideoRunway(sceneIndex, prompt, duration);
    }
  } else {
    try {
      return await generateVideoRunway(sceneIndex, prompt, duration);
    } catch (err) {
      console.error(
        `❌ Runway failed: ${err.message}. Attempting Krea Fallback...`
      );
      return await generateVideoKrea(sceneIndex, prompt);
    }
  }
}

/**
 * 3. KREA PROVIDER
 */
async function generateVideoKrea(
  sceneIndex: number,
  prompt: string,
  jobId: string | number
) {
  const apiKey = process.env.KREA_API_KEY;
  if (!apiKey) throw new Error("KREA_API_KEY missing");

  const imagePath = path.resolve(
    process.cwd(),
    `media/images/scene_${sceneIndex}_${jobId}.png`
  );
  const imageBase64 = fs.readFileSync(imagePath, "base64");

  console.log(`🎥 [KREA] Starting Scene ${sceneIndex}...`);

  // ✅ FIX: Updated to Krea's current recommended endpoint structure
  const response = await fetch("https://api.krea.ai/v1/video/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "video-gen-v1",
      prompt: prompt,
      image: `data:image/png;base64,${imageBase64}`,
    }),
  });

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error(
      `Krea API Endpoint changed or returned HTML. Status: ${response.status}`
    );
  }

  const data = await response.json();
  if (!response.ok)
    throw new Error(`Krea Error: ${data.message || "Check Balance"}`);

  const videoUrl = await pollKreaVideo(data.id, apiKey);
  return await downloadVideoAsset(videoUrl, sceneIndex, jobId, "krea");
}

/**
 * 4. RUNWAY PROVIDER
 */
async function generateVideoRunway(
  sceneIndex: number,
  prompt: string,
  jobId: string,
  duration = 6
) {
  console.log(
    `🔁 Looping scene ${sceneIndex}: ${loops}× to match ${audioDuration}s audio`
  );
  const apiKey = process.env.RUNWAY_API_KEY || process.env.RUNWAYML_API_SECRET;
  if (!apiKey) throw new Error("RUNWAY_API_KEY is not configured");

  const runway = new RunwayML({ apiKey });
  const imagePath = path.resolve(
    process.cwd(),
    `media/images/scene_${sceneIndex}_${jobId}.png`
  );
  const imageBase64 = fs.readFileSync(imagePath, "base64");

  console.log(`🎥 [RUNWAY] Starting Scene ${sceneIndex}...`);

  try {
    const task = await runway.imageToVideo
      .create({
        model: "gen3a_turbo",
        promptText: prompt,
        promptImage: `data:image/png;base64,${imageBase64}`,
        // Runway Gen3 Turbo only accepts 5 or 10.
        duration: duration > 7 ? 10 : 5,
        // ✅ FIX: Runway specifically requested this exact string format
        ratio: "1280:768",
      })
      .waitForTaskOutput({ timeout: 10 * 60 * 1000 });

    const videoUrl = task.output?.[0];
    if (!videoUrl) throw new Error("Runway task completed but returned no URL");

    return await downloadVideoAsset(videoUrl, sceneIndex, jobId, "runway");
  } catch (err) {
    if (err instanceof TaskFailedError) {
      throw new Error(
        `Runway Task Failed: ${err.taskDetails?.code || "Unknown"}`
      );
    }
    throw err;
  }
}
async function generateVideoMock(sceneIndex: number, jobId: string | number) {
  const outDir = path.resolve(process.cwd(), "media/video/scenes");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, `scene_${sceneIndex}_${jobId}.mp4`);
  const imagePath = path.resolve(
    process.cwd(),
    `media/images/scene_${sceneIndex}_${jobId}.png`
  );

  console.log(`🎬 [MOCK + KEN BURNS] Animating scene ${sceneIndex}...`);

  const duration = 5;
  const fps = 25;
  const totalFrames = duration * fps;

  // Alternates Zoom In for even scenes and Zoom Out for odd scenes
  const isEven = sceneIndex % 2 === 0;
  const zoomDirection = isEven
    ? "min(zoom+0.0015,1.5)" // Slow Zoom In
    : "max(1.5-0.0015*on,1.0)"; // Slow Zoom Out

  /**
   * FFmpeg Filter Chain:
   * 1. scale=3840:-1 -> Upscale to 4K for smooth sub-pixel movement
   * 2. zoompan -> The actual Ken Burns movement
   * 3. setsar=1 -> Fixes aspect ratio pixel issues
   */
  const sceneSrtPath = path.resolve(
    process.cwd(),
    `media/output/scene_${sceneIndex}.srt`
  );
  //const escapedSrt = sceneSrtPath.replace(/\\/g, "/").replace(/:/g, "\\:");
  const filter = [
    `scale=3840:-1`,
    `zoompan=z='${zoomDirection}':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720`,
    //`subtitles='${escapedSrt}':force_style='Alignment=2,FontSize=20,Outline=1,BorderStyle=3'`,
    `setsar=1`,
  ].join(",");

  const command = `ffmpeg -y -loop 1 -i "${imagePath}" -vf "${filter}" -c:v libx264 -t ${duration} -pix_fmt yuv420p -r ${fps} "${outFile}"`;

  try {
    // Using 'pipe' or 'inherit' to see progress
    execSync(command, { stdio: "inherit" });
    return outFile;
  } catch (e) {
    console.error("❌ Ken Burns Mock failed:", e);
    throw new Error(
      "Mock video failed. Ensure FFmpeg is installed and the image exists."
    );
  }
}

// --- UTILITIES & HELPERS ---

async function pollKreaVideo(taskId: string, apiKey: string): Promise<string> {
  const maxAttempts = 60; // 5 minutes at 5s intervals
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`https://api.krea.ai/v1/video/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json();

    if (data.status === "succeeded") return data.uri;
    if (data.status === "failed")
      throw new Error("Krea video generation task failed");

    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("Krea polling timed out after 5 minutes");
}

async function downloadVideoAsset(
  url: string,
  sceneIndex: number,
  providerName: string,
  jobId: string | number
) {
  const outDir = path.resolve(process.cwd(), "media/video/scenes");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download video from ${providerName}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const outFile = path.join(outDir, `scene_${sceneIndex}_${jobId}.mp4`);

  fs.writeFileSync(outFile, buffer);

  console.log(
    `✅ Scene ${sceneIndex} saved successfully via [${providerName.toUpperCase()}]`
  );
  return outFile;
}
