"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  GRID_SIZE,
  LEVELS,
  MAX_LIVES,
  type Cell,
  type Direction,
  type Level,
  useSnakeGame,
} from "@/components/game/use-snake-game";

function PixelButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`border-2 px-4 py-3 font-mono text-sm font-bold uppercase tracking-[0.16em] transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

function LevelSelector({
  level,
  onSelect,
}: {
  level: Level;
  onSelect: (nextLevel: Level) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#d8b569]">
        Levels
      </p>
      <div className="grid gap-2">
        {LEVELS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onSelect(entry.id)}
            className={`flex items-center justify-between border-2 px-3 py-3 font-mono text-xs uppercase tracking-[0.18em] shadow-[4px_4px_0_#090507] transition-all duration-150 sm:text-sm ${
              entry.id === level
                ? "border-[#d46a1f] bg-[#d46a1f] text-[#120f15]"
                : "border-[#3f2427] bg-[#100b0d] text-[#f8efe2]/78 hover:bg-[#1a1215]"
            }`}
          >
            <span>{entry.label}</span>
            <span>{entry.flavor}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SnakeBoard({
  activeLevelLabel,
  boardClassName,
  boardRef,
  food,
  gameOver,
  highScore,
  lives,
  onRestart,
  running,
  score,
  snake,
}: {
  activeLevelLabel: string;
  boardClassName?: string;
  boardRef: React.RefObject<HTMLDivElement | null>;
  food: Cell;
  gameOver: boolean;
  highScore: number;
  lives: number;
  onRestart: () => void;
  running: boolean;
  score: number;
  snake: Cell[];
}) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-2 border-[#3f2427] bg-[#1a1215] p-2 shadow-[8px_8px_0_#090507] sm:p-3">
      <div className="pointer-events-none absolute inset-0 opacity-18 [background-image:linear-gradient(to_right,rgba(248,239,226,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(248,239,226,0.08)_1px,transparent_1px)] [background-size:14px_14px]" />
      <div className="mb-2 flex items-center justify-between border-2 border-[#2f2126] bg-[#1b1316] px-2 py-1 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#c7cad8] sm:px-3 sm:text-[0.68rem]">
        <div className="flex items-center gap-3">
          <span>Score:{String(score).padStart(4, "0")}</span>
          <span>Best:{String(highScore).padStart(4, "0")}</span>
          <span>Level:{activeLevelLabel}</span>
        </div>
        <span className="flex items-center gap-1 text-[#ff6b57]">
          {Array.from({ length: MAX_LIVES }, (_, index) => (
            <span
              key={index}
              className={index < lives ? "opacity-100" : "opacity-20"}
            >
              ♥
            </span>
          ))}
        </span>
      </div>
      <div
        ref={boardRef}
        tabIndex={0}
        className={`relative mx-auto aspect-square w-full touch-none self-center overflow-hidden border-2 border-[#d46a1f]/30 bg-[#0f090b] outline-none focus-visible:ring-2 focus-visible:ring-[#d8b569]/50 ${boardClassName ?? "max-w-[42rem]"}`}
        style={{
          imageRendering: "pixelated",
        }}
      >
        <div
          className="grid size-full"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
            const x = index % GRID_SIZE;
            const y = Math.floor(index / GRID_SIZE);
            const snakeIndex = snake.findIndex(
              (segment) => segment.x === x && segment.y === y,
            );
            const isHead = snakeIndex === 0;
            const isFood = food.x === x && food.y === y;

            return (
              <div
                key={`${x}-${y}`}
                className="relative border border-[#1e1316] bg-[#120b0e]"
              >
                {snakeIndex >= 0 ? (
                  <div
                    className={`absolute inset-[12%] ${
                      isHead
                        ? "z-10 bg-[#f8efe2] shadow-[0_0_0_2px_#7c4b34]"
                        : "bg-[#d46a1f]"
                    }`}
                  />
                ) : null}
                {isFood ? (
                  <div className="absolute inset-[22%] bg-[#d8b569] shadow-[0_0_0_2px_#7b5f24]" />
                ) : null}
              </div>
            );
          })}
        </div>

        {!running && !gameOver ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#09070a]/72">
            <div className="border-2 border-[#3f2427] bg-[#120b0e] px-8 py-6 text-center shadow-[6px_6px_0_#090507]">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#d8b569]">
                System Ready
              </p>
              <p className="mt-3 font-mono text-sm uppercase tracking-[0.16em] text-white/90">
                Press Start Or Move
              </p>
            </div>
          </div>
        ) : null}

        {gameOver ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#090507]/82">
            <div className="border-2 border-[#7c2a22] bg-[#160c0e] px-10 py-8 text-center shadow-[8px_8px_0_#090507]">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#ff6b57]">
                Run Ended
              </p>
              <p className="mt-2 text-4xl font-heading uppercase text-[#f8efe2]">
                Score <span className="text-[#d8b569]">{score}</span>
              </p>
              <PixelButton
                type="button"
                onClick={onRestart}
                className="mt-6 w-full border-[#a34720] bg-[#d46a1f] text-[#120f15] shadow-[4px_4px_0_#7b2d12] hover:bg-[#eb7d31]"
              >
                Restart System
              </PixelButton>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-2 border-t-2 border-[#2f2126] bg-[#161013] px-2 py-1 font-mono text-[0.52rem] uppercase tracking-[0.16em] text-[#f8efe2]/58 sm:px-3 sm:text-[0.62rem]">
        HP = retries. A crash removes 1 heart and respawns the snake. Score
        stays.
      </div>
    </div>
  );
}

function MobileControls({
  onDirection,
  onToggleRunning,
  running,
}: {
  onDirection: (direction: Direction) => void;
  onToggleRunning: () => void;
  running: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 px-4 sm:hidden">
      <div />
      <PixelButton
        type="button"
        onClick={() => onDirection("up")}
        className="border-[#3f2427] bg-[#1a1215] shadow-[4px_4px_0_#090507]"
      >
        Up
      </PixelButton>
      <div />
      <PixelButton
        type="button"
        onClick={() => onDirection("left")}
        className="border-[#3f2427] bg-[#1a1215] shadow-[4px_4px_0_#090507]"
      >
        Left
      </PixelButton>
      <PixelButton
        type="button"
        onClick={onToggleRunning}
        className="border-[#a34720] bg-[#d46a1f] text-[#120f15] shadow-[4px_4px_0_#7b2d12]"
      >
        {running ? "Pause" : "Play"}
      </PixelButton>
      <PixelButton
        type="button"
        onClick={() => onDirection("right")}
        className="border-[#3f2427] bg-[#1a1215] shadow-[4px_4px_0_#090507]"
      >
        Right
      </PixelButton>
      <div />
      <PixelButton
        type="button"
        onClick={() => onDirection("down")}
        className="border-[#3f2427] bg-[#1a1215] shadow-[4px_4px_0_#090507]"
      >
        Down
      </PixelButton>
      <div />
    </div>
  );
}

export function SnakeGame() {
  const {
    activeLevel,
    game,
    highScore,
    level,
    restartGame,
    selectLevel,
    setDirection,
    toggleRunning,
  } = useSnakeGame();
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"none" | "info" | "levels">(
    "none",
  );

  const handleDirection = (direction: Direction) => {
    setDirection(direction);
    boardRef.current?.focus();
  };

  const handleRestart = () => {
    restartGame();
    boardRef.current?.focus();
  };

  const handleSelectLevel = (nextLevel: Level) => {
    selectLevel(nextLevel);
    setMobilePanel("none");
    boardRef.current?.focus();
  };

  return (
    <main className="h-dvh overflow-hidden bg-[#12090b] px-3 py-3 text-[#f8efe2] sm:px-4 sm:py-4 lg:px-6">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,106,31,0.22),transparent_20%),radial-gradient(circle_at_80%_18%,rgba(216,181,105,0.08),transparent_18%),linear-gradient(180deg,#1b0f12_0%,#090507_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(248,239,226,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(248,239,226,0.08)_1px,transparent_1px)] [background-size:14px_14px]" />

      <div className="relative mx-auto flex h-full max-w-7xl min-h-0 flex-col gap-3">
        <header className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-[0.34em] text-[#d8b569]">
              Hidden Route
            </p>
            <h1 className="max-w-4xl font-heading text-[2.1rem] font-black uppercase leading-[0.88] tracking-tight sm:text-[3rem] lg:text-[3.8rem] [text-shadow:4px_4px_0_rgba(0,0,0,0.4)]">
              Snake System
            </h1>
            <p className="hidden max-w-2xl font-mono text-xs leading-5 text-[#f8efe2]/72 sm:block sm:text-sm">
              Use arrow keys or `WASD`. On mobile, tap the controls below the
              board. Press `Space` to pause. Crash costs one heart.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 font-mono text-xs uppercase tracking-[0.16em] sm:text-sm">
            <PixelButton
              type="button"
              onClick={toggleRunning}
              className="border-[#a34720] bg-[#d46a1f] px-6 text-[#120f15] shadow-[4px_4px_0_#7b2d12] hover:bg-[#eb7d31]"
            >
              {game.gameOver ? "New Run" : game.running ? "Pause" : "Start"}
            </PixelButton>
            <Link
              href="/"
              className="border-2 border-[#3f2427] bg-[#1a1215] px-4 py-3 font-mono text-sm font-bold uppercase tracking-[0.16em] shadow-[4px_4px_0_#090507] transition-all duration-150 hover:bg-[#22171b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Exit
            </Link>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(230px,280px)_minmax(0,1fr)] lg:items-stretch">
          <aside className="hidden space-y-3 border-2 border-[#3f2427] bg-[#1a1215] p-3 shadow-[6px_6px_0_#090507] lg:block lg:overflow-hidden">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#d8b569]">
              Objective
            </p>
            <p className="font-mono text-xs leading-5 text-[#f8efe2]/78 sm:text-sm">
              Eat nodes, grow longer, and survive three impacts. Each level
              changes the snake speed, so choose your tempo before you launch.
              Hearts are retries, so a crash respawns the snake instead of
              ending the run instantly.
            </p>

            <LevelSelector level={level} onSelect={handleSelectLevel} />
          </aside>

          <section className="flex min-h-0 flex-col gap-3">
            <div className="sm:hidden">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setMobilePanel((current) =>
                      current === "info" ? "none" : "info",
                    )
                  }
                  className={`border-2 px-3 py-2 font-mono text-[0.68rem] font-bold uppercase tracking-[0.2em] shadow-[4px_4px_0_#090507] transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                    mobilePanel === "info"
                      ? "border-[#d46a1f] bg-[#d46a1f] text-[#120f15]"
                      : "border-[#3f2427] bg-[#1a1215] text-[#f8efe2]"
                  }`}
                >
                  Intel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMobilePanel((current) =>
                      current === "levels" ? "none" : "levels",
                    )
                  }
                  className={`border-2 px-3 py-2 font-mono text-[0.68rem] font-bold uppercase tracking-[0.2em] shadow-[4px_4px_0_#090507] transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                    mobilePanel === "levels"
                      ? "border-[#d46a1f] bg-[#d46a1f] text-[#120f15]"
                      : "border-[#3f2427] bg-[#1a1215] text-[#f8efe2]"
                  }`}
                >
                  Levels
                </button>
                <div className="flex items-center justify-center border-2 border-[#3f2427] bg-[#1a1215] px-3 py-2 font-mono text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8b569] shadow-[4px_4px_0_#090507]">
                  {activeLevel.flavor}
                </div>
              </div>

              <div
                className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-200 ${
                  mobilePanel === "none"
                    ? "mt-0 grid-rows-[0fr] opacity-0"
                    : "mt-2 grid-rows-[1fr] opacity-100"
                }`}
              >
                <div className="min-h-0">
                  <div className="border-2 border-[#3f2427] bg-[#1a1215] p-3 shadow-[6px_6px_0_#090507]">
                    {mobilePanel === "info" ? (
                      <div className="space-y-3">
                        <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#d8b569]">
                          Quick Intel
                        </p>
                        <p className="font-mono text-xs leading-5 text-[#f8efe2]/78">
                          Crash costs one heart. Clear nodes, grow longer, and
                          survive the tighter grid. Hearts act like retries, so
                          the snake respawns after a hit while your score stays.
                        </p>
                        <div className="grid grid-cols-3 gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#f8efe2]/72">
                          <div className="border border-[#302126] bg-[#100b0d] p-2 text-center">
                            16 x 16
                          </div>
                          <div className="border border-[#302126] bg-[#100b0d] p-2 text-center">
                            HP x3
                          </div>
                          <div className="border border-[#302126] bg-[#100b0d] p-2 text-center">
                            {activeLevel.tickMs}ms
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {mobilePanel === "levels" ? (
                      <div className="space-y-3">
                        <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#d8b569]">
                          Select Speed
                        </p>
                        <div className="grid gap-2">
                          {LEVELS.map((entry) => (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={() => handleSelectLevel(entry.id)}
                              className={`flex items-center justify-between border px-3 py-2 font-mono text-[0.68rem] font-bold uppercase tracking-[0.18em] transition-colors ${
                                entry.id === level
                                  ? "border-[#d46a1f] bg-[#d46a1f] text-[#120f15]"
                                  : "border-[#302126] bg-[#100b0d] text-[#f8efe2]/78"
                              }`}
                            >
                              <span>{entry.label}</span>
                              <span>{entry.flavor}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <SnakeBoard
              activeLevelLabel={
                level === "rookie" ? "01" : level === "turbo" ? "02" : "03"
              }
              boardClassName="max-w-[min(100%,calc(100dvh-8.8rem))] lg:max-w-[min(100%,calc(100dvh-5.8rem))]"
              boardRef={boardRef}
              food={game.food}
              gameOver={game.gameOver}
              highScore={highScore}
              lives={game.lives}
              onRestart={handleRestart}
              running={game.running}
              score={game.score}
              snake={game.snake}
            />

            <MobileControls
              onDirection={handleDirection}
              onToggleRunning={toggleRunning}
              running={game.running}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
