import type { MotionTokenItem } from "./motif";

const SCALE_START_FACTOR = 1000;
const OPACITY_START_FACTOR = 1000;
const SPRING_MASS_FACTOR = 1000;

export type MotionTokenDbRow = {
  id: string;
  workspaceId: string;
  name: string;
  category: string;
  durationMs: number;
  delayMs: number;
  easing: string;
  yOffset: number;
  scaleStart: number;
  opacityStart: number;
  isSpring: boolean;
  springStiffness: number;
  springDamping: number;
  springMass: number;
  deprecated: boolean;
};

export function motionTokenDbRowToItem(row: MotionTokenDbRow): MotionTokenItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category as MotionTokenItem["category"],
    durationMs: row.durationMs,
    delayMs: row.delayMs,
    easing: row.easing,
    yOffset: row.yOffset,
    scaleStart: row.scaleStart / SCALE_START_FACTOR,
    opacityStart: row.opacityStart / OPACITY_START_FACTOR,
    isSpring: row.isSpring,
    springStiffness: row.springStiffness,
    springDamping: row.springDamping,
    springMass: row.springMass / SPRING_MASS_FACTOR,
    deprecated: row.deprecated,
  };
}

export function motionTokenItemToDbFields(
  item: Omit<MotionTokenItem, "id">,
): Omit<MotionTokenDbRow, "id" | "workspaceId"> {
  return {
    name: item.name,
    category: item.category,
    durationMs: item.durationMs,
    delayMs: item.delayMs,
    easing: item.easing,
    yOffset: item.yOffset,
    scaleStart: Math.round(item.scaleStart * SCALE_START_FACTOR),
    opacityStart: Math.round(item.opacityStart * OPACITY_START_FACTOR),
    isSpring: item.isSpring,
    springStiffness: item.springStiffness,
    springDamping: item.springDamping,
    springMass: Math.round(item.springMass * SPRING_MASS_FACTOR),
    deprecated: item.deprecated,
  };
}

