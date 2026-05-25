import { z } from "zod";

export const CUBIC_BEZIER_EASING_REGEX =
  /^cubic-bezier\(\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*\)$/;

export const tokenEasingSchema = z
  .enum(["linear", "ease", "ease-in", "ease-out", "ease-in-out"])
  .or(z.string().regex(CUBIC_BEZIER_EASING_REGEX, "Easing must be a known preset or a valid cubic-bezier()"));

export function isValidTokenEasingString(raw: string): boolean {
  return tokenEasingSchema.safeParse(raw.trim()).success;
}
