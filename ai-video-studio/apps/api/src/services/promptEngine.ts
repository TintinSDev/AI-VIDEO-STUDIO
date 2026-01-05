import { STYLE_PRESETS, StylePresetKey } from "./stylePresets";

export function buildPrompt(
  scene: {
    narration: string;
    action?: string;
    duration?: number;
  },
  style: StylePresetKey
) {
  const preset = STYLE_PRESETS[style];

  return `
${scene.narration}

Visual interpretation of the narration above.

Style: ${preset.description}
Camera: ${preset.camera}
Lighting: ${preset.lighting}
Mood: ${preset.mood}

Environment: ${scene.action || "derived from narration"}
No text, no logos, no watermarks.
Photorealistic, sharp focus.
Duration: ${scene.duration ?? 5} seconds.
`.trim();
}
