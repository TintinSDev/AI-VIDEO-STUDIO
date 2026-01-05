"use client";

type Props = {
  status:
    | "idle"
    | "queued"
    | "rendering"
    | "assembling"
    | "complete"
    | "failed";
  scene: number;
  total: number;
};

export default function RenderProgress({ status, scene, total }: Props) {
  const label = {
    idle: "Idle",
    queued: "Queued",
    rendering: "Rendering…",
    assembling: "Assembling…",
    complete: "Complete",
    failed: "Error",
  }[status];

  return (
    <div className="mt-4 p-4 border rounded">
      <strong>Status:</strong> {label}
      {status !== "idle" && total > 0 && (
        <p className="mt-2 text-sm">
          Scene {scene} / {total}
        </p>
      )}
      {(status === "rendering" || status === "assembling") && (
        <div className="mt-2 w-full bg-gray-200 h-2 rounded">
          <div className="bg-black h-2 w-1/2 rounded animate-pulse" />
        </div>
      )}
    </div>
  );
}
