import type { MotionTokenItem } from "./tokn-constants";

export function transformToken(token: MotionTokenItem) {
  return {
    framerMotion: genFramerMotion(token),
    css: genCSS(token),
    tailwind: genTailwind(token),
    json: genJSON(token),
  };
}

function genFramerMotion(t: MotionTokenItem): string {
  const initial = `{ opacity: ${t.opacityStart}, y: ${t.yOffset}, scale: ${t.scaleStart} }`;
  const animate = `{ opacity: 1, y: 0, scale: 1 }`;

  if (t.isSpring) {
    return [
      `import { motion } from "framer-motion"`,
      ``,
      `<motion.div`,
      `  initial={${initial}}`,
      `  animate={${animate}}`,
      `  transition={{`,
      `    type: "spring",`,
      `    stiffness: ${t.springStiffness},`,
      `    damping: ${t.springDamping},`,
      `    mass: ${t.springMass},`,
      `  }}`,
      `/>`,
    ].join("\n");
  }

  return [
    `import { motion } from "framer-motion"`,
    ``,
    `<motion.div`,
    `  initial={${initial}}`,
    `  animate={${animate}}`,
    `  transition={{`,
    `    duration: ${(t.durationMs / 1000).toFixed(2)},`,
    `    delay: ${(t.delayMs / 1000).toFixed(2)},`,
    `    ease: "${t.easing}",`,
    `  }}`,
    `/>`,
  ].join("\n");
}

function genCSS(t: MotionTokenItem): string {
  const slug = t.name.replace(/\./g, "-");

  if (t.isSpring) {
    return [
      `/* Spring animations require JS runtime */`,
      `--motion-${slug}-stiffness: ${t.springStiffness};`,
      `--motion-${slug}-damping: ${t.springDamping};`,
      `--motion-${slug}-mass: ${t.springMass};`,
    ].join("\n");
  }

  return [
    `.animate-${slug} {`,
    `  transition: all ${t.durationMs}ms ${t.easing} ${t.delayMs}ms;`,
    `  opacity: ${t.opacityStart};`,
    `  transform: translateY(${t.yOffset}px) scale(${t.scaleStart});`,
    `}`,
    ``,
    `.animate-${slug}.is-active {`,
    `  opacity: 1;`,
    `  transform: translateY(0) scale(1);`,
    `}`,
  ].join("\n");
}

function genTailwind(t: MotionTokenItem): string {
  const duration = Math.max(0, Math.round(t.durationMs));
  const delay = Math.max(0, Math.round(t.delayMs));
  const easing = t.easing;
  const translateY = `${t.yOffset}px`;
  const scale = Number(t.scaleStart.toFixed(3));
  const opacity = Number(t.opacityStart.toFixed(3));

  if (t.isSpring) {
    return [
      `motion-safe:transition-transform motion-safe:transition-opacity`,
      `opacity-[${opacity}] translate-y-[${translateY}] scale-[${scale}]`,
      `data-[state=active]:opacity-100 data-[state=active]:translate-y-0 data-[state=active]:scale-100`,
      ``,
      `Spring tokens need runtime animation (e.g. Framer Motion).`,
      `stiffness=${t.springStiffness} damping=${t.springDamping} mass=${t.springMass}`,
    ].join("\n");
  }

  return [
    `motion-safe:transition-all motion-safe:duration-[${duration}ms] motion-safe:delay-[${delay}ms] motion-safe:ease-[${easing}]`,
    `opacity-[${opacity}] translate-y-[${translateY}] scale-[${scale}]`,
    `data-[state=active]:opacity-100 data-[state=active]:translate-y-0 data-[state=active]:scale-100`,
  ].join("\n");
}

function genJSON(t: MotionTokenItem): string {
  const obj: Record<string, unknown> = {
    name: t.name,
    category: t.category,
    initial: { opacity: t.opacityStart, y: t.yOffset, scale: t.scaleStart },
    animate: { opacity: 1, y: 0, scale: 1 },
  };

  if (t.isSpring) {
    obj.transition = {
      type: "spring",
      stiffness: t.springStiffness,
      damping: t.springDamping,
      mass: t.springMass,
    };
  } else {
    obj.transition = {
      duration: t.durationMs,
      delay: t.delayMs,
      easing: t.easing,
    };
  }

  return JSON.stringify(obj, null, 2);
}
