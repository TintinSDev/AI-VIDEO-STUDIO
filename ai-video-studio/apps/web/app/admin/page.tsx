"use client";
import { useEffect, useState } from "react";

export default function AdminRenders() {
  const [renders, setRenders] = useState([]);

  useEffect(() => {
    fetch("/admin/renders")
      .then(res => res.json())
      .then(setRenders);
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Render Inspector</h1>

      {renders.map((r: any) => (
        <div key={r.id} className="border p-4 mt-3 rounded">
          <p><b>ID:</b> {r.id}</p>
          <p><b>Status:</b> {r.status}</p>
          <p><b>Cost:</b> ${r.costUSD}</p>
          <p><b>User:</b> {r.userId}</p>
        </div>
      ))}
    </div>
  );
}
