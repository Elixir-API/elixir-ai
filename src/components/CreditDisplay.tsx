 export default function CreditDisplay({ credits }: { credits: number }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20">
      <span className="text-purple-400 text-xs">✦</span>
      <span className="text-purple-300 text-xs font-medium">{credits}</span>
      <span className="text-white/30 text-[10px]">credits</span>
    </div>
  )
}
