"use client"

export default function TrainingPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Training Queue</h1>
        <p className="text-white/40 text-sm mt-1">Fine-tune jobs and model training status</p>
      </div>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {["Queued", "Running", "Completed", "Failed"].map((s) => (
          <div key={s} className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
            <p className="text-white/30 text-xs uppercase tracking-widest mb-1">{s}</p>
            <p className="text-white font-bold text-2xl">0</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-white/5 bg-white/[0.02] py-16 text-center">
        <p className="text-white/20 text-sm">No training jobs yet.</p>
        <p className="text-white/10 text-xs mt-1">Jobs will appear here when fine-tuning is triggered.</p>
      </div>
    </div>
  )
}