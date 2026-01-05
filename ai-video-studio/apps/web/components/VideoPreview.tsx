export default function VideoPreview({ src }: { src: string }) {
  return <video src={src} controls className="w-full" />;
}
