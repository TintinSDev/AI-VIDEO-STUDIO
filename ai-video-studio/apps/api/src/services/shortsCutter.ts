import { execSync } from "child_process";
import path from "path";
import fs from "fs";

// 1. We now accept srtPath as an argument
export async function generateShorts(
  finalVideoPath: string,
  srtPath: string,
  jobId: string
) {
  if (!finalVideoPath || finalVideoPath === "undefined") {
    console.error("❌ Cannot generate shorts: finalVideoPath is undefined");
    return;
  }

  // Safety check for SRT
  if (!srtPath || !fs.existsSync(srtPath)) {
    console.warn("⚠️ No SRT file found, generating short without captions.");
  }

  const outputDir = path.resolve(process.cwd(), "media/video/shorts");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log("✂️ Cutting vertical shorts with captions...");

  // 2. Escape the SRT path for FFmpeg (converts /home/path to /home\\:path for the filter)
  const escapedSrtPath = srtPath.replace(/\\/g, "/").replace(/:/g, "\\:");

  // 3. Chain the subtitle filter to the existing crop/scale filter
  // Alignment=2 puts it at the bottom. BorderStyle=3 adds a semi-transparent background box.
  let filter = "scale=-1:1920,crop=1080:1920,setsar=1";

  if (srtPath && fs.existsSync(srtPath)) {
    filter += `,subtitles='${escapedSrtPath}':force_style='Alignment=2,FontSize=24,Outline=1,BorderStyle=3,PrimaryColour=&H00FFFFFF'`;
  }

  const outputPath = path.join(outputDir, `short_${jobId}.mp4`);
  const command = `ffmpeg -y -i "${finalVideoPath}" -vf "${filter}" -c:v libx264 -crf 23 -c:a copy "${outputPath}"`;

  try {
    execSync(command, { stdio: "inherit" });
    console.log(`✅ Short created with captions: ${outputPath}`);
    return outputPath;
  } catch (e) {
    console.error("❌ Shorts cutting failed", e);
    throw e;
  }
}
