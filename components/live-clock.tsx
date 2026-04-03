"use client";

import { useEffect, useMemo, useState } from "react";

const CLOCK_TIMEZONE = "Asia/Kuala_Lumpur";

function formatTimeParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: CLOCK_TIMEZONE,
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

  return {
    hour,
    minute,
  };
}

function ClockDigit({ value }: { value: string }) {
  return (
    <span className="relative inline-flex h-[1.55em] w-[1ch] items-center justify-center overflow-hidden align-middle">
      <span
        key={value}
        className="absolute -inset-y-[0.14em] inset-x-0 flex items-center justify-center [animation:clockDigitSwap_0.42s_cubic-bezier(0.22,1,0.36,1)]"
      >
        {value}
      </span>
      <span className="opacity-0">{value}</span>
    </span>
  );
}

export function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  const [isColonVisible, setIsColonVisible] = useState(true);

  useEffect(() => {
    const tick = () => {
      const next = new Date();
      setNow(next);
      setIsColonVisible(next.getSeconds() % 2 === 0);
    };

    tick();

    const intervalId = window.setInterval(tick, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const { hour, minute } = useMemo(() => formatTimeParts(now), [now]);

  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase leading-[1.1] tracking-[0.22em] text-[#2f211a] tabular-nums sm:text-base">
      <span className="inline-flex items-center leading-[1.1]">
        <ClockDigit value={hour[0] ?? "0"} />
        <ClockDigit value={hour[1] ?? "0"} />
        <span
          aria-hidden="true"
          className="mx-[0.08em] inline-block pb-[0.06em] transition-opacity duration-200"
          style={{ opacity: isColonVisible ? 1 : 0.3 }}
        >
          :
        </span>
        <ClockDigit value={minute[0] ?? "0"} />
        <ClockDigit value={minute[1] ?? "0"} />
      </span>
      <span>MYT</span>
      <style jsx>{`
        @keyframes clockDigitSwap {
          0% {
            opacity: 0;
            transform: translateY(82%) scale(0.92);
          }
          55% {
            opacity: 1;
          }
          100% {
            opacity: 1;
            transform: translateY(0%) scale(1);
          }
        }
      `}</style>
    </span>
  );
}
