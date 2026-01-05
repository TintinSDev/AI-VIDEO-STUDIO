export default function ScenePreview({ url }: { url: string }) {
  return (
    <video
      src={url}
      controls
      style={{ width: "100%", borderRadius: 8 }}
    />
  );
}
