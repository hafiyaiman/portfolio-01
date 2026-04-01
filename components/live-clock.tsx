"use client";

import { useEffect, useState } from "react";

export function LiveClock() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString("en-MY", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kuala_Lumpur",
      hour12: false,
    }),
  );

  useEffect(() => {
    const formatTime = () =>
      new Date().toLocaleTimeString("en-MY", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kuala_Lumpur",
        hour12: false,
      });

    const intervalId = setInterval(() => setTime(formatTime()), 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <span className="text-sm font-semibold uppercase tracking-[0.22em] text-[#2f211a] sm:text-base">
      {time} MYT
    </span>
  );
}
