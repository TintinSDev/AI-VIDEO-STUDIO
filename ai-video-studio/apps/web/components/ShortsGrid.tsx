export default function ShortsGrid({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-3 gap-4 mt-6">
      {Array.from({ length: count }).map((_, i) => (
        <video
          key={i}
          src={`http://localhost:3001/media/video/shorts/short_${i}.mp4`}
          controls
          className="rounded"
        />
      ))}
    </div>
  );
}
