import subprocess

def create_short(start, duration, index):
    subprocess.run([
        "ffmpeg",
        "-i", "media/output/final.mp4",
        "-ss", start,
        "-t", duration,
        "-vf", "crop=ih*9/16:ih,scale=1080:1920",
        f"media/video/shorts/short_{index}.mp4"
    ])

create_short("00:00:10", "00:00:30", 1)
create_short("00:02:00", "00:00:30", 2)
create_short("00:05:00", "00:00:30", 3)
