"use client";

interface Scene {
  id: number;
  name: string;
}

export default function SceneTimeline({ scenes }: { scenes: any[] }) {
  const retry = (id: number): void => {
    // Trigger re-generation for the scene with the given id
    // This would typically call an API endpoint or dispatch a state update
    console.log(`Retrying scene ${id}`);
    // TODO: Implement actual retry logic (e.g., API call, state update)
  };

  return (
    <div className="grid grid-cols-3 gap-4 mt-6">
      {scenes.map((scene) => (
        <div key={scene.id} className="border rounded p-3 text-sm">
          <div className="font-semibold">Scene {scene.id + 1}</div>

          <div>
            Status:{" "}
            {scene.status === "error" && (
              <button onClick={() => retry(scene.id)}>Retry</button>
            )}
          </div>

          {scene.thumbnail && (
            <img src={scene.thumbnail} className="mt-2 rounded" />
          )}
        </div>
      ))}
    </div>
  );
}
