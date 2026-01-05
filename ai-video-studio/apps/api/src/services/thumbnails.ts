import { execSync } from "child_process";
import fs from "fs";

export function generateThumbnail() {
  fs.mkdirSync("media/thumbnails", { recursive: true });

  execSync(
    `ffmpeg -y -i media/output/final.mp4 \
     -ss 00:00:01 -vframes 1 media/thumbnails/cover.jpg`
  );
}
