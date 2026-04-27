import type { WorkItem } from "@/data/works-data";

export interface VisibleWheelSlot {
  key: string;
  item: WorkItem;
  slotIndex: number;
  projectIndex: number;
}

export function buildVisibleWheelSlots({
  items,
  slotCount,
  activeProjectIndex,
  activeSlotIndex,
}: {
  items: WorkItem[];
  slotCount: number;
  activeProjectIndex: number;
  activeSlotIndex: number;
}): VisibleWheelSlot[] {
  if (items.length === 0 || slotCount <= 0) {
    return [];
  }

  return Array.from({ length: slotCount }, (_, slotIndex) => {
    const relativeOffset = getCircularOffset(slotIndex, activeSlotIndex, slotCount);
    const projectIndex = mod(activeProjectIndex + relativeOffset, items.length);
    const item = items[projectIndex];

    return {
      // Keep the physical wheel slots stable so GSAP doesn't lose its DOM refs
      // when the project content inside a slot changes.
      key: `wheel-slot-${slotIndex}`,
      item,
      slotIndex,
      projectIndex,
    };
  });
}

function getCircularOffset(index: number, activeIndex: number, total: number) {
  let offset = index - activeIndex;
  const half = total / 2;

  if (offset > half) {
    offset -= total;
  }

  if (offset < -half) {
    offset += total;
  }

  return offset;
}

function mod(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}
