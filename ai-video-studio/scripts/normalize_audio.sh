#!/usr/bin/env bash
set -e

INPUT=$1
OUTPUT=$2

if [ -z "$INPUT" ] || [ -z "$OUTPUT" ]; then
  echo "Usage: ./normalize_audio.sh input.wav output.wav"
  exit 1
fi

ffmpeg -y -i "$INPUT" \
-af loudnorm=I=-16:TP=-1.5:LRA=11 \
"$OUTPUT"

echo "🔊 Audio normalized: $OUTPUT"
