import fs from "fs";
import path from "path";
// 1. Fixed: Added missing import
import { getMediaDuration } from "../utils/videoUtils";

export function createSrtFile(
  text: string,
  jobId: string | number,
  totalDurationInSeconds: number,
  outputPath: string
) {
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
  const durationPerSentence = totalDurationInSeconds / sentences.length;

  let srtContent = "";

  sentences.forEach((sentence, index) => {
    const start = index * durationPerSentence;
    const end = (index + 1) * durationPerSentence;

    srtContent += `${index + 1}\n`;
    srtContent += `${formatSrtTime(start)} --> ${formatSrtTime(end)}\n`;
    srtContent += `${sentence.trim()}\n\n`;
  });

  fs.writeFileSync(outputPath, srtContent);
  return outputPath;
}

// src/services/subtitleGenerator.ts

function formatSrtTime(seconds: number): string {
  // ✅ FIX: If seconds is NaN, undefined, or Infinity, default to 0
  const safeSeconds = !Number.isFinite(seconds) || seconds < 0 ? 0 : seconds;

  const date = new Date(0);
  date.setMilliseconds(safeSeconds * 1000);

  // Now toISOString() will never fail
  const timePart = date.toISOString().substring(11, 19);
  const msPart = Math.floor((safeSeconds % 1) * 1000)
    .toString()
    .padStart(3, "0");

  return `${timePart},${msPart}`;
}

export function mergeSrtFiles(
  scenes: any[],
  outputSrtPath: string,
  jobId: string | number
) {
  let masterSrt = "";
  let currentTimeOffset = 0;

  scenes.forEach((scene, index) => {
    const srtPath = path.resolve(
      process.cwd(),
      `media/output/scene_${index}_${jobId}.srt`
    );
    const audioPath = path.resolve(
      process.cwd(),
      `media/audio/narration/scene_${index}_${jobId}.mp3`
    );

    if (fs.existsSync(srtPath)) {
      let content = fs.readFileSync(srtPath, "utf8");

      // Shift timestamps of this scene by the current offset
      masterSrt += adjustSrtTimestamps(content, currentTimeOffset);

      // 2. Fixed: Correctly updating offset using audio duration
      if (fs.existsSync(audioPath)) {
        currentTimeOffset += getMediaDuration(audioPath);
      }
    }
  });

  fs.writeFileSync(outputSrtPath, masterSrt.trim());
}

function adjustSrtTimestamps(content: string, offset: number): string {
  return content.replace(
    /(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/g,
    (match, start, end) => {
      return `${shiftTime(start, offset)} --> ${shiftTime(end, offset)}`;
    }
  );
}

function shiftTime(timeStr: string, offsetSeconds: number): string {
  const [h, m, sMs] = timeStr.split(":");
  const [s, ms] = sMs.split(",");

  // Convert everything to milliseconds
  let totalMs =
    (parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s)) * 1000 + parseInt(ms);
  totalMs += offsetSeconds * 1000;

  // 3. Fixed: Robust time formatting that handles hours correctly
  const hours = Math.floor(totalMs / 3600000)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalMs % 3600000) / 60000)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor((totalMs % 60000) / 1000)
    .toString()
    .padStart(2, "0");
  const milliseconds = Math.floor(totalMs % 1000)
    .toString()
    .padStart(3, "0");

  return `${hours}:${minutes}:${seconds},${milliseconds}`;
}
