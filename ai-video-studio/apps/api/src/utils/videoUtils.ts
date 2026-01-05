// src/utils/videoUtils.ts
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

export function getMediaDuration(filePath: string): number {
  try {
    const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    const output = execSync(command).toString().trim();
    const duration = parseFloat(output);
    return isNaN(duration) ? 0 : duration; // ✅ Never return NaN
  } catch (error) {
    console.error(`Failed to get duration for ${filePath}:`, error);
    return 0; // ✅ Fallback to 0
  }
}
export function generateThumbnail(jobId: string): string | null {
  const videoPath = path.resolve(
    process.cwd(),
    `media/output/final_${jobId}.mp4`
  );
  const thumbDir = path.resolve(process.cwd(), `media/thumbs`);
  const thumbPath = path.join(thumbDir, `thumb_${jobId}.jpg`);

  // Ensure directory exists
  if (!fs.existsSync(thumbDir)) {
    fs.mkdirSync(thumbDir, { recursive: true });
  }

  try {
    // -ss 00:00:01 takes a screenshot at the 1-second mark
    // -vframes 1 tells ffmpeg to output exactly one frame
    execSync(
      `ffmpeg -y -i "${videoPath}" -ss 00:00:01 -vframes 1 "${thumbPath}"`,
      { stdio: "ignore" }
    );
    return thumbPath;
  } catch (error) {
    console.error(`Failed to generate thumbnail for ${jobId}:`, error);
    return null;
  }
}
