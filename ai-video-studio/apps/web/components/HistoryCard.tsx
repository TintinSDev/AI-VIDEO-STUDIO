interface HistoryCardProps {
  item: any;
  onDelete: (id: string) => void;
}
const ActionTooltip = ({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) => (
  <div className="relative group/tooltip flex justify-center items-center">
    {/* The Tooltip - Positioned high enough to clear the card border */}
    <div
      className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 
                    bg-slate-950/95 border border-pink-500/50 rounded-md
                    scale-0 group-hover/tooltip:scale-100 transition-all duration-200 origin-bottom
                    shadow-[0_0_20px_rgba(236,72,153,0.4)] z-[100] pointer-events-none"
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-pink-500/5 blur-md -z-10" />

      <span className="text-[10px] font-black uppercase tracking-widest text-pink-500 whitespace-nowrap">
        {label}
      </span>

      {/* The Arrow */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-950 border-r border-b border-pink-500/50 rotate-45" />
    </div>

    {children}
  </div>
);
export const HistoryCard = ({ item, onDelete }: any) => {
  return (
    /* Outer container: NO overflow-hidden here so tooltips can "pop out" */
    <div className="relative group p-[1px] rounded-xl bg-gradient-to-br from-pink-500 via-purple-600 to-cyan-500 glow-box transition-all duration-500 hover:scale-[1.02] z-10 hover:z-20">
      <div className="bg-[#020617]/95 rounded-xl relative">
        {" "}
        {/* Removed overflow-hidden */}
        {/* Internal Image Container: Keep overflow-hidden here for the picture corners */}
        <div className="aspect-video w-full bg-slate-900 relative overflow-hidden rounded-t-xl border-b border-white/5">
          <img
            src={`http://localhost:3001${item.thumbnail}`}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            alt="Preview"
          />
        </div>
        <div className="p-4">
          {/* ... prompt and ID text here ... */}

          {/* Updated Action Buttons with External Tooltips */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <ActionTooltip label="Watch_Recon">
              <a
                href={`http://localhost:3001${item.url}`}
                target="_blank"
                className="w-full text-center py-2 bg-slate-900 border border-white/10 text-[10px] font-bold text-gray-300 uppercase hover:bg-white/5 hover:text-cyan-400 rounded transition-colors"
              >
                View
              </a>
            </ActionTooltip>

            <ActionTooltip label="Pull_Data">
              <a
                href={`http://localhost:3001${item.url}?download=true`}
                download
                className="w-full text-center py-2 bg-cyan-600/20 border border-cyan-500/40 text-[10px] font-bold text-cyan-400 uppercase hover:bg-cyan-500/30 rounded transition-colors"
              >
                Get
              </a>
            </ActionTooltip>

            <ActionTooltip label="Purge_Record">
              <button
                onClick={() => onDelete(item.id)}
                className="w-full py-2 bg-pink-900/20 border border-pink-500/40 text-pink-500 hover:bg-pink-500/40 rounded transition-colors"
              >
                🗑️
              </button>
            </ActionTooltip>
          </div>
        </div>
      </div>
    </div>
  );
};
