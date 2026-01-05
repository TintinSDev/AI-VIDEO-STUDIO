import { execSync } from "child_process";
import fs from "fs";

export function generateShorts(input: string) {
  fs.mkdirSync("media/video/shorts", { recursive: true });

  // 30s short
  execSync(`
    ffmpeg -y -i ${input} \
    -vf "crop=ih*9/16:ih,scale=1080:1920" \
    -t 30 \
    media/video/shorts/short_30s.mp4
  `);

  // 15s short
  execSync(`
    ffmpeg -y -i ${input} \
    -vf "crop=ih*9/16:ih,scale=1080:1920" \
    -t 15 \
    media/video/shorts/short_15s.mp4
  `);
}
