"use client";

import { useAudioStore } from "./useAudioStore";

export function AudioControls({ className }: { className: string }) {
  const muted = useAudioStore((state) => state.muted);
  const volume = useAudioStore((state) => state.volume);
  const status = useAudioStore((state) => state.status);
  return <div data-audio-controls className="pointer-events-auto flex flex-col items-stretch gap-3">
    <button className={className} disabled={status === "unavailable"} aria-label={status === "ready" && !muted ? "Mute car audio" : "Enable car audio"} aria-pressed={status === "ready" && !muted}
      onClick={() => {
        if (status === "ready") useAudioStore.getState().toggleMuted();
        else { useAudioStore.setState({ muted: false }); window.dispatchEvent(new Event("genting-enable-audio")); }
      }}>
      {status === "unavailable" ? "No audio" : status === "locked" ? "Start sound" : muted ? "Sound off" : "Sound on"}
    </button>
    <label className="flex items-center gap-2 bg-[var(--panel)] px-2 py-1 text-[9px] uppercase tracking-widest">
      Vol<input aria-label="Car audio volume" type="range" min="0" max="100" value={Math.round(volume * 100)} onChange={(event) => useAudioStore.getState().setVolume(Number(event.target.value) / 100)} className="h-4 w-16 accent-[var(--accent)] sm:w-24" />
    </label>
  </div>;
}
