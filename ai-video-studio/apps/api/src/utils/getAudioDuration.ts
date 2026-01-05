import { execSync } from "child_process";

export function getAudioDuration(file: string): number {
  const output = execSync(
    `ffprobe -v error -show_entries format=duration \
     -of default=noprint_wrappers=1:nokey=1 "${file}"`
  ).toString();

  return Math.ceil(Number(output));
}
