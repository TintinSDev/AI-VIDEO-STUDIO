#!/usr/bin/env bash
set -e

echo "🧹 Cleaning generated files..."

rm -f scenes.txt
rm -rf media/video/scenes/*
rm -rf media/video/shorts/*
rm -rf media/audio/narration/*
rm -rf media/errors/*

echo "✅ Cleanup complete."
