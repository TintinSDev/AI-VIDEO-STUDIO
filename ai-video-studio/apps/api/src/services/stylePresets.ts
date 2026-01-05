export type StylePresetKey =
  | "cinematic"
  | "documentary"
  | "horror"
  | "bright"
  | "minimal"
  | "animation"
  | "anime_ghibli"
  | "noir"
  | "cyberpunk"
  | "fine_art";

export const STYLE_PRESETS: Record<
  StylePresetKey,
  {
    description: string;
    camera: string;
    lighting: string;
    mood: string;
  }
> = {
  cinematic: {
    description: "Ultra-photorealistic cinematic style",
    camera: "slow cinematic wide shot",
    lighting: "dramatic but balanced lighting, high dynamic range",
    mood: "epic, cinematic",
  },

  documentary: {
    description: "Natural documentary realism",
    camera: "handheld or steady observational camera",
    lighting: "natural daylight, realistic exposure",
    mood: "grounded, realistic",
  },

  horror: {
    description: "Dark atmospheric horror style",
    camera: "slow creeping camera movement",
    lighting: "low-key lighting, deep shadows",
    mood: "ominous, tense",
  },

  bright: {
    description: "Bright, uplifting visual style",
    camera: "smooth wide camera movement",
    lighting: "bright daylight, no crushed blacks",
    mood: "optimistic, vibrant",
  },

  minimal: {
    description: "Minimalist clean visuals",
    camera: "static or gentle movement",
    lighting: "soft neutral lighting",
    mood: "calm, simple",
  },

  animation: {
    description:
      "Stylized 3D with 2D overlays, halftone textures, and comic book ink lines",
    camera: "dynamic low-angle tracking shot with extreme perspective",
    lighting: "vibrant neon rim lighting with colorful chromatic aberration",
    mood: "energetic, kinetic, and expressive",
  },

  anime_ghibli: {
    description:
      "Hand-drawn 2D aesthetic with lush watercolor-painted backgrounds",
    camera: "steady medium shot with a soft focus on the environment",
    lighting: "soft natural sunlight, dappled shadows, high-key daytime glow",
    mood: "whimsical, peaceful, and nostalgic",
  },

  noir: {
    description:
      "High-contrast monochrome, heavy ink-wash textures, and film grain",
    camera: "static dutch angle, extreme close-up or silhouette framing",
    lighting: "chiaroscuro, harsh single-source light through venetian blinds",
    mood: "mysterious, dark, and suspenseful",
  },

  cyberpunk: {
    description:
      "High-tech futuristic armor, rain-slicked surfaces, and holographic UI",
    camera: "wide anamorphic lens shot with heavy lens flares",
    lighting: "dark environment saturated with pink and cyan neon pulses",
    mood: "gritty, advanced, and dystopian",
  },

  fine_art: {
    description: "Classical oil on canvas, visible thick impasto brushstrokes",
    camera: "epic eye-level portrait, centered hero composition",
    lighting: "warm golden-hour glow, Tenebrism (dramatic dark vs light)",
    mood: "majestic, heroic, and timeless",
  },
};
