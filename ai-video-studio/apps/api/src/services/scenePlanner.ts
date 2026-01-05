type Scene = {
  id: number;
  narration: string;
  duration: number;
  mood: string;
  camera: string;
  action: string;
};

export function planScenes(script: string): Scene[] {
  const words = script.trim().split(/\s+/);
  const wordsPerScene = 70; // ~25s narration

  const scenes: Scene[] = [];
  let index = 0;

  for (let i = 0; i < words.length; i += wordsPerScene) {
    const chunk = words.slice(i, i + wordsPerScene).join(" ");

    scenes.push({
      id: index++,
      narration: chunk,
      duration: 15 + Math.floor(Math.random() * 15), // 15-30s
      mood: detectMood(chunk),
      camera: "slow cinematic wide",
      action: extractAction(chunk),
    });
  }

  return scenes;
}

function detectMood(text: string): string {
  if (/destroy|explode|chaos/i.test(text)) return "intense";
  if (/dark|mystery|unknown/i.test(text)) return "ominous";
  return "cinematic";
}

function extractAction(text: string): string {
  if (/Kong/i.test(text)) return "Kong in jungle environment";
  if (/Godzilla/i.test(text)) return "Godzilla emerging from ocean";
  return "abstract cinematic environment";
}
