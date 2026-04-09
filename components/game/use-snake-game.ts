"use client";

import { useEffect, useMemo, useState } from "react";

export type Cell = {
  x: number;
  y: number;
};

export type Direction = "up" | "down" | "left" | "right";
export type Level = "rookie" | "turbo" | "void";

export interface GameState {
  snake: Cell[];
  food: Cell;
  direction: Direction;
  queuedDirection: Direction;
  score: number;
  lives: number;
  running: boolean;
  gameOver: boolean;
}

export const GRID_SIZE = 24;
export const MAX_LIVES = 3;
export const HIGHSCORE_KEY = "portfolio-snake-highscore";
export const LEVELS: Array<{
  id: Level;
  label: string;
  tickMs: number;
  flavor: string;
}> = [
  { id: "rookie", label: "Level 1", tickMs: 200, flavor: "Rookie" },
  { id: "turbo", label: "Level 2", tickMs: 155, flavor: "Turbo" },
  { id: "void", label: "Level 3", tickMs: 72, flavor: "Void" },
];

function randomFoodPosition(snake: Cell[]) {
  const occupied = new Set(snake.map((segment) => `${segment.x}:${segment.y}`));
  const freeCells: Cell[] = [];

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (!occupied.has(`${x}:${y}`)) {
        freeCells.push({ x, y });
      }
    }
  }

  return (
    freeCells[Math.floor(Math.random() * freeCells.length)] ?? { x: 12, y: 12 }
  );
}

function createInitialSnake() {
  return [
    { x: 5, y: 8 },
    { x: 4, y: 8 },
    { x: 3, y: 8 },
  ];
}

function createInitialState(): GameState {
  const snake = createInitialSnake();

  return {
    snake,
    food: randomFoodPosition(snake),
    direction: "right",
    queuedDirection: "right",
    score: 0,
    lives: MAX_LIVES,
    running: false,
    gameOver: false,
  };
}

function createRespawnState(score: number, lives: number): GameState {
  const resetState = createInitialState();

  return {
    ...resetState,
    score,
    lives,
  };
}

function isOppositeDirection(current: Direction, next: Direction) {
  return (
    (current === "up" && next === "down") ||
    (current === "down" && next === "up") ||
    (current === "left" && next === "right") ||
    (current === "right" && next === "left")
  );
}

function getNextHead(head: Cell, direction: Direction) {
  if (direction === "up") return { x: head.x, y: head.y - 1 };
  if (direction === "down") return { x: head.x, y: head.y + 1 };
  if (direction === "left") return { x: head.x - 1, y: head.y };
  return { x: head.x + 1, y: head.y };
}

function getStoredHighScore() {
  if (typeof window === "undefined") {
    return 0;
  }

  const storedHighScore = window.localStorage.getItem(HIGHSCORE_KEY);
  return storedHighScore ? Number(storedHighScore) : 0;
}

function applyDirectionChange(
  state: GameState,
  nextDirection: Direction,
): GameState {
  const baselineDirection = state.running
    ? state.queuedDirection
    : state.direction;

  if (isOppositeDirection(baselineDirection, nextDirection)) {
    return state;
  }

  return {
    ...state,
    running: true,
    queuedDirection: nextDirection,
  };
}

export function useSnakeGame() {
  const [game, setGame] = useState<GameState>(createInitialState);
  const [level, setLevel] = useState<Level>("rookie");
  const [highScore, setHighScore] = useState(getStoredHighScore);

  const activeLevel = useMemo(
    () => LEVELS.find((entry) => entry.id === level) ?? LEVELS[0],
    [level],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const keyMap: Record<string, Direction | undefined> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        a: "left",
        s: "down",
        d: "right",
      };

      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        setGame((prev) => {
          if (prev.gameOver) {
            return createRespawnState(0, MAX_LIVES);
          }

          return { ...prev, running: !prev.running };
        });
        return;
      }

      const nextDirection = keyMap[event.key];
      if (!nextDirection) {
        return;
      }

      event.preventDefault();
      setGame((prev) => applyDirectionChange(prev, nextDirection));
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!game.running || game.gameOver) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setGame((prev) => {
        const direction = prev.queuedDirection;
        const nextHead = getNextHead(prev.snake[0], direction);
        const hitWall =
          nextHead.x < 0 ||
          nextHead.x >= GRID_SIZE ||
          nextHead.y < 0 ||
          nextHead.y >= GRID_SIZE;
        const hitSelf = prev.snake.some(
          (segment) => segment.x === nextHead.x && segment.y === nextHead.y,
        );

        if (hitWall || hitSelf) {
          const nextLives = prev.lives - 1;

          if (nextLives <= 0) {
            return {
              ...prev,
              direction,
              lives: 0,
              running: false,
              gameOver: true,
            };
          }

          return {
            ...createRespawnState(prev.score, nextLives),
            running: false,
          };
        }

        const ateFood =
          nextHead.x === prev.food.x && nextHead.y === prev.food.y;
        const nextSnake = [nextHead, ...prev.snake];

        if (!ateFood) {
          nextSnake.pop();
        }

        const nextScore = ateFood ? prev.score + 1 : prev.score;

        if (nextScore > highScore) {
          setHighScore(nextScore);
          window.localStorage.setItem(HIGHSCORE_KEY, String(nextScore));
        }

        return {
          ...prev,
          snake: nextSnake,
          food: ateFood ? randomFoodPosition(nextSnake) : prev.food,
          direction,
          score: nextScore,
        };
      });
    }, activeLevel.tickMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeLevel.tickMs, game.running, game.gameOver, highScore]);

  const setDirection = (nextDirection: Direction) => {
    setGame((prev) => applyDirectionChange(prev, nextDirection));
  };

  const toggleRunning = () => {
    setGame((prev) => {
      if (prev.gameOver) {
        return createRespawnState(0, MAX_LIVES);
      }

      return { ...prev, running: !prev.running };
    });
  };

  const restartGame = () => {
    setGame(createInitialState());
  };

  const selectLevel = (nextLevel: Level) => {
    setLevel(nextLevel);
    setGame(createRespawnState(0, MAX_LIVES));
  };

  return {
    activeLevel,
    game,
    highScore,
    level,
    restartGame,
    selectLevel,
    setDirection,
    toggleRunning,
  };
}
