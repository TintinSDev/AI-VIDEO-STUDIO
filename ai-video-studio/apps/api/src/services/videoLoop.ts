import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { getAudioDuration } from "../utils/getAudioDuration";
import { getMediaDuration } from "../utils/videoUtils";

export function loopVideoToAudio(sceneIndex: number, jobId: string): string {
  const videoInput = `media/video/scenes/scene_${sceneIndex}_${jobId}.mp4`;
  const audioInput = `media/audio/narration/scene_${sceneIndex}_${jobId}.mp3`;
  const outputDir = "media/video/looped";

  fs.mkdirSync(outputDir, { recursive: true });

  const output = path.join(
    outputDir,
    `scene_${sceneIndex}_${jobId}_looped.mp4`
  );

  const clipDuration = getMediaDuration(videoInput);
  const audioDuration = getAudioDuration(audioInput);

  if (!fs.existsSync(videoInput))
    throw new Error(`Input video missing: ${videoInput}`);
  if (!fs.existsSync(audioInput))
    throw new Error(`Input audio missing: ${audioInput}`);

  const loops = Math.ceil(audioDuration / clipDuration);

  console.log(`🔁 Looping scene ${sceneIndex} [Job: ${jobId}]`);

  if (clipDuration === 0 || audioDuration === 0) {
    throw new Error(
      `Media duration error: Video(${clipDuration}s), Audio(${audioDuration}s)`
    );
  }
  console.log(
    `🔁 Looping: Video is ${clipDuration}s, Audio is ${audioDuration}s. Looping ${loops} times.`
  );

  execSync(
    `ffmpeg -y -stream_loop ${
      loops - 1
    } -i "${videoInput}" -t ${audioDuration} -c copy "${output}"`,
    { stdio: "inherit" }
  );

  return output;
}
