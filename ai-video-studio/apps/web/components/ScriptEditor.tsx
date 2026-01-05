"use client";
import { useState } from "react";

export default function ScriptEditor() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");

  async function render() {
    setStatus("Rendering…");
    await fetch("http://localhost:3001/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ script: text })
    });
    setStatus("Queued");
  }

  return (
    <>
      <textarea
        className="w-full h-64 border p-4"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <button onClick={render} className="mt-4 px-6 py-2 bg-black text-white">
        One-Click Render
      </button>
      <p>{status}</p>
    </>
  );
}
