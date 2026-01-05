import subprocess
import os

SCENE_DIR = "media/video/scenes"
THUMB_DIR = "media/video/thumbs"
os.makedirs(THUMB_DIR, exist_ok=True)

for file in os.listdir(SCENE_DIR):
    if file.endswith(".mp4"):
        name = file.replace(".mp4", "")
        subprocess.run([
            "ffmpeg", "-y",
            "-i", f"{SCENE_DIR}/{file}",
            "-ss", "00:00:01",
            "-vframes", "1",
            f"{THUMB_DIR}/{name}.jpg"
        ])
