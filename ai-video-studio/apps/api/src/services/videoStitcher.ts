import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export function assembleVideo(totalScenes: number, jobId: string): string {
  const root = process.cwd();
  // 🔥 IMPORTANT: We now look in the 'looped' folder because that's where the sync'd video is
  const scenesDir = path.resolve(root, "media/video/looped");
  const audioDir = path.resolve(root, "media/audio/narration");
  const outputDir = path.resolve(root, "media/output");

  // Create unique names for temp files to avoid collisions between parallel renders
  const videoListPath = path.resolve(outputDir, `video_list_${jobId}.txt`);
  const audioListPath = path.resolve(outputDir, `audio_list_${jobId}.txt`);

  const stitchedVideo = path.resolve(outputDir, `temp_video_${jobId}.mp4`);
  const stitchedAudio = path.resolve(outputDir, `temp_narration_${jobId}.mp3`);

  // 🔥 Create a unique final output name to bypass browser cache
  const finalOutput = path.resolve(outputDir, `final_${jobId}.mp4`);

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const videoFiles = [];
  const audioFiles = [];

  for (let i = 0; i < totalScenes; i++) {
    // ✅ Use the jobId to find the CORRECT Superman/Spider-Man files
    const vPath = path.join(scenesDir, `scene_${i}_${jobId}_looped.mp4`);
    const aPath = path.join(audioDir, `scene_${i}_${jobId}.mp3`);

    if (!fs.existsSync(vPath)) {
      throw new Error(`Critical Error: Scene file not found: ${vPath}`);
    }

    videoFiles.push(`file '${vPath}'`);
    audioFiles.push(`file '${aPath}'`);
  }

  fs.writeFileSync(videoListPath, videoFiles.join("\n"));
  fs.writeFileSync(audioListPath, audioFiles.join("\n"));

  console.log(`🎬 Step 1: Stitching Video Scenes for Job ${jobId}...`);
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${videoListPath}" -c copy "${stitchedVideo}"`
  );

  console.log("🎙️ Step 2: Stitching Narration Files...");
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${audioListPath}" -c libmp3lame -q:a 2 "${stitchedAudio}"`
  );

  console.log("🎞️ Step 3: Merging Video and Audio...");
  const command = `ffmpeg -y -i "${stitchedVideo}" -i "${stitchedAudio}" -c:v copy -c:a aac -shortest "${finalOutput}"`;

  try {
    execSync(command, { stdio: "inherit" });

    // Cleanup temporary files
    [videoListPath, audioListPath, stitchedVideo, stitchedAudio].forEach(
      (f) => {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }
    );

    console.log(`✅ Final Video Created: ${finalOutput}`);
    return finalOutput;
  } catch (error) {
    console.error("❌ Final Assembly failed:", error);
    throw error;
  }
}
