"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useControllerSettings = create(persist(() => ({
  dpadSteering: true,
  vibration: true,
}), { name: "genting-controller-settings" }));
