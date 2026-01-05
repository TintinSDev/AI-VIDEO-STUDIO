const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function startRender(script: string) {
  const res = await fetch(`${API_URL}/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ script })
  });

  if (!res.ok) {
    throw new Error("Failed to start render");
  }

  return res.json();
}

export async function fetchScenes() {
  const res = await fetch(`${API_URL}/scenes`);
  return res.json();
}
