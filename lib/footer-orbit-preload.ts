"use client";

import { useSyncExternalStore } from "react";

import {
  FOOTER_ORBIT_LOCAL_IMAGE_SOURCES,
  FOOTER_ORBIT_MEDIA_QUERY,
} from "@/lib/footer-orbit-assets";
import { loadTechOrbitSceneModule } from "@/lib/load-tech-orbit-scene";

export type FooterOrbitPreloadStatus =
  | "idle"
  | "loading"
  | "ready"
  | "timed_out"
  | "error"
  | "disabled";

export interface FooterOrbitPreloadSnapshot {
  status: FooterOrbitPreloadStatus;
  sceneBundleReady: boolean;
  textureReady: boolean;
  images: HTMLImageElement[];
  error: Error | null;
}

const listeners = new Set<() => void>();

let snapshot: FooterOrbitPreloadSnapshot = {
  status: "idle",
  sceneBundleReady: false,
  textureReady: false,
  images: [],
  error: null,
};

let preloadRunPromise: Promise<FooterOrbitPreloadSnapshot> | null = null;

function emitChange() {
  listeners.forEach((listener) => listener());
}

function updateSnapshot(
  nextSnapshot:
    | FooterOrbitPreloadSnapshot
    | ((currentSnapshot: FooterOrbitPreloadSnapshot) => FooterOrbitPreloadSnapshot),
) {
  snapshot =
    typeof nextSnapshot === "function"
      ? nextSnapshot(snapshot)
      : nextSnapshot;

  emitChange();
}

function loadDecodedImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.loading = "eager";

    const finalize = async () => {
      try {
        if (typeof image.decode === "function") {
          await image.decode();
        }
      } catch {
        // Some browsers may reject decode() for already-loaded images.
      }

      resolve(image);
    };

    image.addEventListener("load", () => {
      void finalize();
    }, { once: true });

    image.addEventListener("error", () => {
      reject(new Error(`Failed to preload footer orbit image: ${src}`));
    }, { once: true });

    image.src = src;
  });
}

function canUseFooterOrbit3D() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return !window.matchMedia(FOOTER_ORBIT_MEDIA_QUERY).matches;
}

async function startFooterOrbitPreload() {
  if (!canUseFooterOrbit3D()) {
    updateSnapshot((currentSnapshot) => ({
      ...currentSnapshot,
      status: "disabled",
      error: null,
    }));

    return snapshot;
  }

  if (!preloadRunPromise) {
    updateSnapshot((currentSnapshot) => ({
      ...currentSnapshot,
      status: currentSnapshot.status === "timed_out" ? "timed_out" : "loading",
      error: null,
    }));

    const sceneBundlePromise = loadTechOrbitSceneModule().then(() => {
      updateSnapshot((currentSnapshot) => ({
        ...currentSnapshot,
        sceneBundleReady: true,
      }));
    });

    const texturePromise = Promise.allSettled(
      FOOTER_ORBIT_LOCAL_IMAGE_SOURCES.map((src) => loadDecodedImage(src)),
    ).then((results) => {
      const images = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );

      if (images.length === 0) {
        throw new Error("Footer orbit image preload finished without assets.");
      }

      updateSnapshot((currentSnapshot) => ({
        ...currentSnapshot,
        textureReady: true,
        images,
      }));

      return images;
    });

    preloadRunPromise = Promise.all([sceneBundlePromise, texturePromise])
      .then(([, images]) => {
        updateSnapshot((currentSnapshot) => ({
          ...currentSnapshot,
          status: "ready",
          sceneBundleReady: true,
          textureReady: true,
          images,
          error: null,
        }));

        return snapshot;
      })
      .catch((error: unknown) => {
        const resolvedError =
          error instanceof Error ? error : new Error("Footer orbit preload failed.");

        updateSnapshot((currentSnapshot) => ({
          ...currentSnapshot,
          status: "error",
          error: resolvedError,
        }));

        return snapshot;
      });
  }

  return preloadRunPromise;
}

export function getFooterOrbitPreloadStatus() {
  return snapshot;
}

export function getFooterOrbitAssets() {
  return snapshot.images;
}

export function preloadFooterOrbitAssets({ timeoutMs = 4500 } = {}) {
  const preloadPromise = startFooterOrbitPreload();

  if (timeoutMs <= 0 || typeof window === "undefined") {
    return preloadPromise;
  }

  return Promise.race([
    preloadPromise,
    new Promise<FooterOrbitPreloadSnapshot>((resolve) => {
      window.setTimeout(() => {
        updateSnapshot((currentSnapshot) => {
          if (currentSnapshot.status !== "loading") {
            return currentSnapshot;
          }

          return {
            ...currentSnapshot,
            status: "timed_out",
          };
        });

        resolve(snapshot);
      }, timeoutMs);
    }),
  ]);
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function useFooterOrbitPreloadState() {
  return useSyncExternalStore(
    subscribe,
    getFooterOrbitPreloadStatus,
    getFooterOrbitPreloadStatus,
  );
}
