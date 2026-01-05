type SceneState = {
  id: number;
  status: "pending" | "rendering" | "complete" | "failed";
  thumbnail?: string;
};

type RenderState = {
  jobId: string;
  status: "queued" | "rendering" | "assembling" | "complete" | "failed";
  scenes: SceneState[];
};

const renders = new Map<string, RenderState>();

export function initRender(jobId: string, sceneCount: number) {
  renders.set(jobId, {
    jobId,
    status: "queued",
    scenes: Array.from({ length: sceneCount }, (_, i) => ({
      id: i,
      status: "pending",
    })),
  });
}

export function updateRender(jobId: string, update: Partial<RenderState>) {
  const r = renders.get(jobId);
  if (!r) return;
  Object.assign(r, update);
}

export function updateScene(
  jobId: string,
  sceneId: number,
  update: Partial<SceneState>
) {
  const r = renders.get(jobId);
  if (!r) return;
  Object.assign(r.scenes[sceneId], update);
}

export function getRender(jobId: string) {
  return renders.get(jobId);
}
