import os
import subprocess

SCENE_DIR = "media/video/scenes"
OUTPUT = "media/output/final.mp4"
LIST_FILE = "scenes.txt"

files = sorted([
    f for f in os.listdir(SCENE_DIR)
    if f.endswith(".mp4")
])

if not files:
    raise RuntimeError("No scene videos found.")

with open(LIST_FILE, "w") as f:
    for file in files:
        f.write(f"file '{SCENE_DIR}/{file}'\n")

subprocess.run([
    "ffmpeg", "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", LIST_FILE,
    "-vf", "eq=brightness=0.08:contrast=1.05:saturation=1.1",
    "-preset", "slow",
    "-crf", "18",
    OUTPUT
], check=True)

print("🎬 Final video assembled:", OUTPUT)
