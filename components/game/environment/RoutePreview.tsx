"use client";
// @refresh reset

import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useEffect, useState, type ReactNode } from "react";
import { GENTING_ASSETS } from "./gentingAssets";

const Scene = dynamic(() => import("./RoutePreviewScene"), { ssr: false });

export type Alignment = {
  report: {
    sourcePointCount: number;
    sampleCount: number;
    roadCoveragePercent: number;
    scale: number;
    optimizedBytes: number;
    medianElevationResidualMeters: number;
    p95ElevationResidualMeters: number;
    segmentsAbove30PercentGrade: number;
  };
  points: [number, number, number][];
  missing: number[];
  steepSegments: { sampleIndex: number; grade: number; riseMeters: number }[];
};

class PreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="grid h-full place-content-center gap-4 p-6 text-white">
      <p>The 3D preview could not load. Check your connection and WebGL support.</p>
      <button className="border p-3" onClick={() => window.location.reload()}>Retry preview</button>
    </div> : this.props.children;
  }
}

export default function RoutePreview() {
  const [data, setData] = useState<Alignment | null>(null);
  const [error, setError] = useState(false);
  const [started, setStarted] = useState(false);
  const [overlay, setOverlay] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch(GENTING_ASSETS.alignment, { signal: controller.signal })
      .then(response => { if (!response.ok) throw Error("Alignment unavailable"); return response.json(); })
      .then(setData)
      .catch(e => { if (e.name !== "AbortError") setError(true); });
    return () => controller.abort();
  }, []);
  return <main className="flex min-h-dvh flex-col bg-zinc-950 text-zinc-100">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/20 px-5 py-4">
      <div><p className="font-mono text-xs uppercase tracking-widest text-lime-300">Genting Highlands / 3D survey</p>
        <h1 className="mt-1 text-xl">Your scenery, your route</h1></div>
      <Link className="underline underline-offset-4" href="/game">Back to driving</Link>
    </header>
    <div className="grid flex-1 lg:grid-cols-[1fr_300px]">
      <div className="relative h-[60dvh] min-h-96 lg:h-[calc(100dvh-90px)]">
        <PreviewBoundary>{started && data ? <Scene data={data} overlay={overlay} /> :
          <div className="grid h-full place-content-center gap-4 p-8 text-center">
            <p>Inspect the imported roads, buildings and terrain.</p>
            <button disabled={!data} onClick={() => setStarted(true)} className="border border-lime-300 bg-lime-300 px-6 py-3 text-black disabled:opacity-40">
              {error ? "Alignment data unavailable" : data ? "Load 3D scenery" : "Reading route..."}
            </button>
            <p className="text-sm text-zinc-400">{data ? `${Math.round(data.report.optimizedBytes / 1e6)} MB download. Desktop recommended.` : ""}</p>
          </div>}
        </PreviewBoundary>
      </div>
      <aside className="space-y-6 border-t border-white/20 p-5 lg:border-l lg:border-t-0">
        <p className="font-mono text-sm text-lime-300">ALIGNMENT PREVIEW</p>
        {data && <><p><span className="text-4xl">{data.report.roadCoveragePercent}%</span><br />of sampled positions intersect roads</p>
          <p className="text-sm text-zinc-300">{data.report.sampleCount.toLocaleString()} checks at intervals of up to 5 m, from {data.report.sourcePointCount} GPX points.</p>
          <label className="flex items-center gap-3"><input type="checkbox" checked={overlay} onChange={e => setOverlay(e.target.checked)} /> Show route overlay</label>
          <p className="text-sm text-zinc-300">Yellow follows the GPX at the model road height. Green marks the start. Red markers indicate missing road coverage.</p>
          <p className="text-sm text-orange-300">Orange marks {data.report.segmentsAbove30PercentGrade} short segments exceeding 30% grade. These need surface review before driving.</p>
          <p className="text-sm text-zinc-300">Drag to orbit. Scroll or pinch to zoom. Right-drag or use two fingers to pan.</p>
          <p className="text-sm text-zinc-400">GPX elevation differences after offset fitting: {data.report.medianElevationResidualMeters.toFixed(1)} m median, {data.report.p95ElevationResidualMeters.toFixed(1)} m at the 95th percentile. Coverage does not verify road smoothness or collision quality.</p>
        </>}
        <p className="text-xs text-zinc-400">Scenery: Maps3D export. Imagery: <a className="underline" href="https://satlas.allen.ai/">Satlas, Allen Institute for AI</a>. Map data: <a className="underline" href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>.</p>
      </aside>
    </div>
  </main>;
}
