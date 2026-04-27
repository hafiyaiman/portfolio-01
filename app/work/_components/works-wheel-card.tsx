import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import type { WorkItem } from "@/data/works-data";

interface WheelCardProps {
  item: WorkItem;
  projectIndex: number;
  slotIndex: number;
  activeSlotIndex: number;
  onSelect: (slotIndex: number, projectIndex: number) => void;
  variant: "desktop" | "mobile";
  cardWidth: number;
}

const CAROUSEL_INTERVAL_MS = 2200;

export function WheelCard({
  item,
  projectIndex,
  slotIndex,
  activeSlotIndex,
  onSelect,
  variant,
  cardWidth,
}: WheelCardProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const isActive = slotIndex === activeSlotIndex;
  const sizes = variant === "desktop" ? "600px" : "120px";
  const cardClassName =
    "absolute left-0 top-0 aspect-video overflow-hidden bg-[#26272c] focus-visible:outline-none";
  const previewImages = useMemo(
    () =>
      item.previewImages?.length
        ? item.previewImages
        : [{ src: item.imageSrc, alt: item.imageAlt }],
    [item.imageAlt, item.imageSrc, item.previewImages],
  );

  useEffect(() => {
    setActiveImageIndex(0);
  }, [item.id]);

  useEffect(() => {
    if (!isActive) {
      setActiveImageIndex(0);
      return;
    }

    if (isHovered || previewImages.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveImageIndex(
        (currentIndex) => (currentIndex + 1) % previewImages.length,
      );
    }, CAROUSEL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isActive, isHovered, previewImages.length]);

  return (
    <button
      type="button"
      data-wheel-slot-index={slotIndex}
      data-wheel-project-index={projectIndex}
      data-wheel-card-desktop={variant === "desktop" ? true : undefined}
      data-wheel-card-mobile={variant === "mobile" ? true : undefined}
      onClick={() => onSelect(slotIndex, projectIndex)}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      className={cardClassName}
      style={{
        scale: "1",
        width: `${cardWidth}px`,
      }}
      aria-label={`Show ${item.title}`}
      aria-pressed={isActive}
    >
      {previewImages.map((image, index) => (
        <Image
          key={`${item.id}-${image.src}`}
          src={image.src}
          alt={image.alt}
          fill
          className="pointer-events-none object-cover transition-[opacity,filter] duration-700 ease-out"
          style={{
            opacity: index === activeImageIndex ? 1 : 0,
            filter: isActive
              ? "grayscale(0) brightness(1)"
              : "grayscale(1) brightness(0.45)",
          }}
          sizes={sizes}
        />
      ))}
      <div
        className="absolute inset-0 transition-[background,opacity] duration-700 ease-out"
        style={{
          background: isActive
            ? "linear-gradient(to top, rgba(0,0,0,0.4), transparent, rgba(212,106,31,0.08))"
            : "linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0.2), rgba(255,255,255,0.02))",
        }}
      />
    </button>
  );
}
