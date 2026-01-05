## AI Video Studio

Create faceless YouTube videos using AI.

### Run
docker-compose up --build

### Stack
- Next.js
- Node
- Prisma
- Redis
- Stripe
- ElevenLabs
- ffmpeg

### License
MIT

``ai-video-studio/
│
├── apps/
│   ├── web/                     # Frontend (Next.js)
│   │   ├── app/
│   │   │   ├── page.tsx         # Dashboard
│   │   │   ├── script/
│   │   │   ├── characters/
│   │   │   ├── timeline/
│   │   │   ├── render/
│   │   │   └── settings/
│   │   ├── components/
│   │   │   ├── ScriptEditor.tsx
│   │   │   ├── SceneTimeline.tsx
│   │   │   ├── CharacterCard.tsx
│   │   │   ├── RenderProgress.tsx
│   │   │   └── VideoPreview.tsx
│   │   ├── styles/
│   │   └── lib/
│   │       └── api.ts
│   │
│   └── api/                     # Backend (Node.js)
│       ├── src/
│       │   ├── routes/
│       │   │   ├── script.ts
│       │   │   ├── scenes.ts
│       │   │   ├── render.ts
│       │   │   └── characters.ts
│       │   ├── services/
│       │   │   ├── promptEngine.ts
│       │   │   ├── elevenlabs.ts
│       │   │   ├── videoProvider.ts
│       │   │   └── scenePlanner.ts
│       │   ├── queue/
│       │   │   └── renderQueue.ts
│       │   └── index.ts
│       └── prisma/
│
├── media/
│   ├── audio/
│   │   ├── narration/
│   │   └── music/
│   ├── video/
│   │   ├── scenes/
│   │   └── shorts/
│   └── output/
│       └── final.mp4
│
├── ffmpeg/
│   ├── assemble.py
│   ├── shorts.py
│   └── filters/
│
├── prompts/
│   ├── cinematic.txt
│   ├── documentary.txt
│   ├── horror.txt
│   └── shorts.txt
│
├── scripts/
│   ├── normalize_audio.sh
│   └── cleanup.sh
│
├── .env
├── package.json
└── README.md ``
Scene one.
This is a simple test video.

Scene two.
The system should split this into multiple scenes.

Scene three.
If this renders, the pipeline works.
