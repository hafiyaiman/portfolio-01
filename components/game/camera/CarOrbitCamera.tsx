"use client";

import { useEffect, useRef, type ComponentRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Group, Quaternion, Vector3 } from "three";
import { useCameraStore } from "./useCameraStore";
import { useGameStore } from "../stores/useGameStore";

type OrbitControlsRef = ComponentRef<typeof OrbitControls>;

export function CarOrbitCamera({ car }: { car: RefObject<Group | null> }) {
  const controls = useRef<OrbitControlsRef>(null);
  const reset = useRef(true);
  const mode = useCameraStore((state) => state.mode);
  const scratch = useRef({ position: new Vector3(), delta: new Vector3(), forward: new Vector3(), desired: new Vector3(), look: new Vector3(), rotation: new Quaternion() });

  useEffect(() => {
    const recenter = () => { reset.current = true; };
    const key = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      if (event.code === "KeyC" && !event.repeat) recenter();
      if (event.code === "KeyV" && !event.repeat) useCameraStore.getState().toggleMode();
    };
    window.addEventListener("keydown", key);
    window.addEventListener("genting-reset-camera", recenter);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("genting-reset-camera", recenter);
    };
  }, []);

  useFrame(({ camera }, dt) => {
    const orbit = controls.current;
    const model = car.current;
    if (!orbit || !model) return;
    const s = scratch.current;
    model.getWorldPosition(s.position);
    s.position.y += 0.2;
    model.getWorldQuaternion(s.rotation);
    s.forward.set(0, 0, 1).applyQuaternion(s.rotation);
    s.forward.y = 0;
    s.forward.normalize();
    if (reset.current) {
      // Clear any pending drag inertia before returning to the rear view.
      orbit.enableDamping = false;
      orbit.reset();
      camera.position.copy(s.position).addScaledVector(s.forward, -8.5);
      camera.position.y += 3.4;
      orbit.target.copy(s.position);
      orbit.update();
      orbit.enableDamping = true;
      reset.current = false;
    } else if (mode === "follow") {
      s.delta.subVectors(s.position, orbit.target);
      camera.position.add(s.delta);
      const speed = useGameStore.getState().speed;
      s.desired.copy(s.position).addScaledVector(s.forward, -(8.5 + Math.min(speed / 70, 2)));
      s.desired.y += 3.4;
      camera.position.lerp(s.desired, 1 - Math.exp(-4 * Math.min(dt, 0.1)));
      orbit.target.copy(s.position);
      s.look.copy(s.position).addScaledVector(s.forward, 1.6);
      camera.lookAt(s.look);
    } else {
      // Translate both ends equally: follow the car without overwriting the orbit.
      s.delta.subVectors(s.position, orbit.target);
      camera.position.add(s.delta);
      orbit.target.copy(s.position);
    }
  }, -2); // Update the follow target before Drei's OrbitControls tick at -1.

  return <OrbitControls ref={controls} makeDefault enabled={mode === "free"} enablePan={false} enableDamping dampingFactor={0.08} rotateSpeed={0.65} zoomSpeed={0.8} minDistance={4} maxDistance={18} minPolarAngle={0.15} maxPolarAngle={1.35} />;
}
