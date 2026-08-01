"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type CareAction = "nourish" | "warmth" | "play" | "hum" | "rest";

type Genome = {
  hue: number;
  accentHue: number;
  roundness: number;
  ears: number;
  fins: number;
  tail: number;
  spots: number;
  glow: number;
  limbs: number;
  pattern: number;
  size: number;
  symmetry: number;
};

type LineageEntry = {
  generation: number;
  name: string;
  note: string;
  signature: string;
};

type GameState = {
  version: 1;
  seed: number;
  bornAt: number;
  lastSeen: number;
  name: string;
  generation: number;
  growth: number;
  energy: number;
  curiosity: number;
  bond: number;
  calm: number;
  genome: Genome;
  counts: Record<CareAction, number>;
  lineage: LineageEntry[];
  totalTouches: number;
  started: boolean;
};

type TouchPoint = { x: number; y: number };

const STORAGE_KEY = "morphmorph.life.v1";
const BUILD = "Codex Build 0.1.0";
const ACTIONS: Array<{
  id: CareAction;
  label: string;
  mark: string;
  line: string;
}> = [
  { id: "nourish", label: "Nourish", mark: "◆", line: "A warm nutrient settles in its core." },
  { id: "warmth", label: "Warmth", mark: "☼", line: "Its skin leans into the light." },
  { id: "play", label: "Play", mark: "↝", line: "It learns the shape of your movement." },
  { id: "hum", label: "Hum", mark: "≈", line: "A tiny rhythm answers back." },
  { id: "rest", label: "Rest", mark: "☾", line: "Growth continues beneath the quiet." },
];

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashWord(word: string) {
  let hash = 2166136261;
  for (let i = 0; i < word.length; i += 1) {
    hash ^= word.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomSeed() {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

function createLife(seed = randomSeed()): GameState {
  const random = mulberry32(seed);
  const hue = 155 + random() * 50;
  const now = Date.now();
  return {
    version: 1,
    seed,
    bornAt: now,
    lastSeen: now,
    name: ["Mori", "Piko", "Nomi", "Luma", "Mimu", "Taro"][Math.floor(random() * 6)],
    generation: 0,
    growth: 4,
    energy: 72,
    curiosity: 46,
    bond: 8,
    calm: 60,
    genome: {
      hue,
      accentHue: (hue + 145 + random() * 60) % 360,
      roundness: 0.58 + random() * 0.2,
      ears: random(),
      fins: random(),
      tail: random(),
      spots: random(),
      glow: 0.35 + random() * 0.3,
      limbs: random(),
      pattern: random(),
      size: 0.42 + random() * 0.2,
      symmetry: 0.72 + random() * 0.22,
    },
    counts: { nourish: 0, warmth: 0, play: 0, hum: 0, rest: 0 },
    lineage: [],
    totalTouches: 0,
    started: false,
  };
}

function loadLife(): GameState {
  if (typeof window === "undefined") return createLife(7727);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createLife();
    const saved = JSON.parse(raw) as GameState;
    if (saved.version !== 1 || !saved.genome || !saved.counts) return createLife();
    const now = Date.now();
    const hoursAway = clamp((now - saved.lastSeen) / 3_600_000, 0, 168);
    return {
      ...saved,
      lastSeen: now,
      energy: clamp(saved.energy - Math.min(42, hoursAway * 1.4), 12, 100),
      curiosity: clamp(saved.curiosity + Math.min(18, hoursAway * 0.8)),
      calm: clamp(saved.calm + Math.min(22, hoursAway * 1.2)),
      growth: clamp(saved.growth + Math.min(22, hoursAway * 1.8)),
    };
  } catch {
    return createLife();
  }
}

function dominantCare(counts: GameState["counts"]): CareAction {
  return (Object.entries(counts) as Array<[CareAction, number]>).sort(
    (a, b) => b[1] - a[1],
  )[0][0];
}

function stageName(genome: Genome, generation: number) {
  if (generation === 0) return "Seedling";
  const beginnings = genome.glow > 0.65
    ? ["Luma", "Glim", "Auri"]
    : genome.tail > 0.62
      ? ["Curl", "Drift", "Whirl"]
      : genome.ears > 0.62
        ? ["Leaf", "Fern", "Moss"]
        : ["Mira", "Nim", "Pollen"];
  const endings = genome.fins > 0.58
    ? ["fin", "wing", "ray"]
    : genome.roundness > 0.65
      ? ["bud", "bloom", "mote"]
      : ["kin", "ling", "let"];
  return `${beginnings[generation % beginnings.length]}${endings[(generation + Math.floor(genome.pattern * 10)) % endings.length]}`;
}

function phenotypeSignature(genome: Genome, generation: number) {
  const values = [
    genome.hue / 360,
    genome.roundness,
    genome.ears,
    genome.fins,
    genome.tail,
    genome.spots,
    genome.glow,
    genome.pattern,
    generation / 20,
  ];
  return values.map((v) => Math.floor(v * 35).toString(36)).join("").toUpperCase();
}

function lifeNote(action: CareAction, genome: Genome) {
  const first: Record<CareAction, string> = {
    nourish: "Patient feeding deepened its body",
    warmth: "Warm light shifted its colour",
    play: "Playful movement reshaped its limbs",
    hum: "Remembered rhythms tuned its senses",
    rest: "Long quiet strengthened its symmetry",
  };
  const feature = genome.tail > 0.7
    ? "and coaxed out a restless tail."
    : genome.ears > 0.7
      ? "and opened a new pair of leaf-fins."
      : genome.glow > 0.68
        ? "and kindled a brighter inner mark."
        : genome.spots > 0.68
          ? "and scattered a new skin pattern."
          : "and left a change not yet understood.";
  return `${first[action]} ${feature}`;
}

function actionMutation(state: GameState, action: CareAction) {
  const total = Object.values(state.counts).reduce((sum, count) => sum + count, 0);
  const random = mulberry32(
    state.seed ^ hashWord(action) ^ Math.imul(state.generation + 1, 2654435761) ^ total,
  );
  const signed = (amount: number) => (random() - 0.5) * amount;
  const genome = { ...state.genome };
  const next = { ...state };

  if (action === "nourish") {
    next.energy = clamp(state.energy + 17);
    next.calm = clamp(state.calm + 3);
    genome.size = clamp(genome.size + 0.018 + signed(0.025), 0.08, 0.96);
    genome.roundness = clamp(genome.roundness + 0.012 + signed(0.02), 0.08, 0.96);
  } else if (action === "warmth") {
    next.energy = clamp(state.energy + 7);
    next.calm = clamp(state.calm + 9);
    genome.hue = (genome.hue + signed(8) + 360) % 360;
    genome.glow = clamp(genome.glow + 0.018 + signed(0.025), 0.08, 0.96);
  } else if (action === "play") {
    next.energy = clamp(state.energy - 5);
    next.curiosity = clamp(state.curiosity + 14);
    next.bond = clamp(state.bond + 6);
    genome.tail = clamp(genome.tail + 0.024 + signed(0.035), 0.08, 0.96);
    genome.limbs = clamp(genome.limbs + 0.018 + signed(0.04), 0.08, 0.96);
  } else if (action === "hum") {
    next.curiosity = clamp(state.curiosity + 6);
    next.bond = clamp(state.bond + 9);
    next.calm = clamp(state.calm + 7);
    genome.ears = clamp(genome.ears + 0.02 + signed(0.035), 0.08, 0.96);
    genome.fins = clamp(genome.fins + 0.016 + signed(0.04), 0.08, 0.96);
    genome.accentHue = (genome.accentHue + signed(12) + 360) % 360;
  } else {
    next.energy = clamp(state.energy + 21);
    next.calm = clamp(state.calm + 13);
    genome.symmetry = clamp(genome.symmetry + 0.02 + signed(0.018), 0.08, 0.98);
    genome.pattern = clamp(genome.pattern + signed(0.045), 0.08, 0.96);
  }

  genome.spots = clamp(genome.spots + signed(0.018), 0.06, 0.98);
  const growthGain = { nourish: 10, warmth: 8, play: 10, hum: 8, rest: 6 }[action];
  return {
    ...next,
    genome,
    growth: clamp(state.growth + growthGain + random() * 2),
    counts: { ...state.counts, [action]: state.counts[action] + 1 },
    lastSeen: Date.now(),
  };
}

function metamorphose(state: GameState) {
  const dominant = dominantCare(state.counts);
  const generation = state.generation + 1;
  const historyHash = Object.entries(state.counts).reduce(
    (hash, [key, value]) => hash ^ Math.imul(hashWord(key), value + 1),
    0,
  );
  const random = mulberry32(state.seed ^ historyHash ^ Math.imul(generation, 2246822519));
  const drift = () => (random() - 0.5) * (0.09 + generation * 0.0025);
  const genome: Genome = {
    ...state.genome,
    hue: (state.genome.hue + drift() * 90 + 360) % 360,
    accentHue: (state.genome.accentHue + drift() * 120 + 360) % 360,
    roundness: clamp(state.genome.roundness + drift(), 0.08, 0.96),
    ears: clamp(state.genome.ears + drift(), 0.08, 0.96),
    fins: clamp(state.genome.fins + drift(), 0.08, 0.96),
    tail: clamp(state.genome.tail + drift(), 0.08, 0.96),
    spots: clamp(state.genome.spots + drift(), 0.08, 0.96),
    glow: clamp(state.genome.glow + drift(), 0.08, 0.96),
    limbs: clamp(state.genome.limbs + drift(), 0.08, 0.96),
    pattern: clamp(state.genome.pattern + drift(), 0.08, 0.96),
    size: clamp(state.genome.size + 0.025 + drift() * 0.5, 0.08, 0.96),
    symmetry: clamp(state.genome.symmetry + drift() * 0.35, 0.36, 0.99),
  };
  const name = stageName(genome, generation);
  const entry: LineageEntry = {
    generation,
    name,
    note: lifeNote(dominant, genome),
    signature: phenotypeSignature(genome, generation),
  };
  return {
    ...state,
    generation,
    growth: 3 + random() * 6,
    energy: clamp(state.energy + 16),
    curiosity: clamp(state.curiosity + 5),
    bond: clamp(state.bond + 7),
    calm: clamp(state.calm + 5),
    genome,
    counts: { nourish: 0, warmth: 0, play: 0, hum: 0, rest: 0 },
    lineage: [...state.lineage, entry].slice(-24),
    lastSeen: Date.now(),
  };
}

function playHum(seed: number, generation: number) {
  try {
    const AudioContextClass = window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const random = mulberry32(seed ^ generation ^ 0x91e10da5);
    [0, 0.12, 0.25].forEach((delay, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 330 + index * 55 + random() * 45;
      gain.gain.setValueAtTime(0, context.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.06, context.currentTime + delay + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + delay + 0.32);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + delay);
      oscillator.stop(context.currentTime + delay + 0.34);
    });
    window.setTimeout(() => void context.close(), 900);
  } catch {
    // Sound is a delight, never a requirement.
  }
}

function roundedBody(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  roundness: number,
) {
  const top = -height * 0.54;
  const bottom = height * 0.46;
  const pinch = width * (0.28 + roundness * 0.12);
  context.beginPath();
  context.moveTo(0, top);
  context.bezierCurveTo(width * 0.5, top, width * 0.58, -height * 0.05, width * 0.42, bottom * 0.72);
  context.bezierCurveTo(pinch, bottom, -pinch, bottom, -width * 0.42, bottom * 0.72);
  context.bezierCurveTo(-width * 0.58, -height * 0.05, -width * 0.5, top, 0, top);
  context.closePath();
}

function leaf(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  width: number,
  angle: number,
  fill: string,
  flip = 1,
) {
  context.save();
  context.translate(x, y);
  context.rotate(angle * flip);
  context.beginPath();
  context.moveTo(0, 0);
  context.quadraticCurveTo(length * 0.55, -width * flip, length, 0);
  context.quadraticCurveTo(length * 0.48, width * flip, 0, 0);
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = "rgba(255,255,220,.48)";
  context.lineWidth = 1.4;
  context.stroke();
  context.beginPath();
  context.moveTo(4, 0);
  context.lineTo(length * 0.78, 0);
  context.strokeStyle = "rgba(255,255,220,.32)";
  context.lineWidth = 1;
  context.stroke();
  context.restore();
}

function CreatureCanvas({
  life,
  morphing,
  onGesture,
}: {
  life: GameState;
  morphing: boolean;
  onGesture: (distance: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<TouchPoint | null>(null);
  const distanceRef = useRef(0);
  const gazeRef = useRef<TouchPoint>({ x: 0, y: 0 });
  const targetGazeRef = useRef<TouchPoint>({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let animation = 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const draw = (time: number) => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) {
        canvas.width = Math.floor(width * ratio);
        canvas.height = Math.floor(height * ratio);
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      const g = life.genome;
      const scale = Math.min(width / 330, height / 360) * (0.9 + g.size * 0.12 + Math.min(life.generation, 8) * 0.012);
      const breath = reduceMotion ? 0 : Math.sin(time / 820) * 2.2;
      const surprise = morphing ? 1 + Math.sin(time / 75) * 0.08 : 1;
      gazeRef.current.x += (targetGazeRef.current.x - gazeRef.current.x) * 0.07;
      gazeRef.current.y += (targetGazeRef.current.y - gazeRef.current.y) * 0.07;
      const gazeX = clamp(gazeRef.current.x, -1, 1);
      const gazeY = clamp(gazeRef.current.y, -1, 1);
      const random = mulberry32(life.seed ^ Math.imul(life.generation + 1, 374761393));
      const baseHue = Math.round(g.hue);
      const base = `hsl(${baseHue} 42% ${51 + g.glow * 5}%)`;
      const deep = `hsl(${baseHue} 43% 35%)`;
      const light = `hsl(${(baseHue + 18) % 360} 46% 67%)`;
      const accent = `hsl(${Math.round(g.accentHue)} 70% 66%)`;
      const cream = "#fff0cf";

      context.save();
      context.translate(width / 2, height * 0.55 + breath);
      context.scale(scale * surprise, scale * surprise);

      const bodyW = 135 + g.roundness * 26 + Math.min(life.generation, 10) * 2;
      const bodyH = 155 - g.roundness * 16 + Math.min(life.generation, 10) * 2;

      // Soft ground shadow.
      context.beginPath();
      context.ellipse(0, bodyH * 0.48, bodyW * 0.46, 12, 0, 0, Math.PI * 2);
      context.fillStyle = "rgba(1, 16, 28, .28)";
      context.fill();

      // Tail changes length, curl and tip as play accumulates.
      const tailLength = 58 + g.tail * 72 + Math.min(life.generation, 6) * 3;
      context.beginPath();
      context.moveTo(bodyW * 0.35, bodyH * 0.2);
      context.bezierCurveTo(
        bodyW * 0.68,
        bodyH * 0.42,
        tailLength,
        -bodyH * (0.02 + g.tail * 0.2),
        bodyW * (0.42 + g.tail * 0.32),
        -bodyH * (0.18 + g.tail * 0.22),
      );
      context.strokeStyle = deep;
      context.lineWidth = 21 - g.tail * 5;
      context.lineCap = "round";
      context.stroke();
      context.strokeStyle = base;
      context.lineWidth = 15 - g.tail * 3;
      context.stroke();

      // Later generations can grow a tail leaf or fin—derived, not preselected.
      if (life.generation >= 2 && g.fins + g.tail > 1.05) {
        leaf(context, bodyW * (0.45 + g.tail * 0.3), -bodyH * (0.2 + g.tail * 0.2), 32, 13, -0.55, light);
      }

      // Ear-fins sit behind the body and become more elaborate over generations.
      const earLength = 42 + g.ears * 42 + Math.min(life.generation, 5) * 3;
      leaf(context, -bodyW * 0.37, -bodyH * 0.28, earLength, 18 + g.fins * 16, Math.PI * 0.86, light, -1);
      leaf(context, bodyW * 0.37, -bodyH * 0.28, earLength, 18 + g.fins * 16, -Math.PI * 0.86, light, 1);
      if (life.generation >= 3 && g.ears > 0.58) {
        leaf(context, -bodyW * 0.41, -bodyH * 0.12, earLength * 0.65, 12, Math.PI * 0.96, base, -1);
        leaf(context, bodyW * 0.41, -bodyH * 0.12, earLength * 0.65, 12, -Math.PI * 0.96, base, 1);
      }

      // Feet.
      const footSpread = bodyW * (0.25 + g.limbs * 0.08);
      for (const side of [-1, 1]) {
        context.beginPath();
        context.ellipse(side * footSpread, bodyH * 0.38, 34, 24, side * 0.08, 0, Math.PI * 2);
        context.fillStyle = deep;
        context.fill();
        context.beginPath();
        context.ellipse(side * footSpread, bodyH * 0.34, 31, 22, side * 0.08, 0, Math.PI * 2);
        context.fillStyle = base;
        context.fill();
      }

      // Main body.
      roundedBody(context, bodyW, bodyH, g.roundness);
      const bodyGradient = context.createLinearGradient(-bodyW * 0.3, -bodyH * 0.45, bodyW * 0.3, bodyH * 0.35);
      bodyGradient.addColorStop(0, light);
      bodyGradient.addColorStop(0.55, base);
      bodyGradient.addColorStop(1, deep);
      context.fillStyle = bodyGradient;
      context.fill();
      context.strokeStyle = "rgba(255, 245, 210, .5)";
      context.lineWidth = 2;
      context.stroke();

      // Belly and inherited core mark.
      context.beginPath();
      context.ellipse(0, bodyH * 0.17, bodyW * 0.29, bodyH * 0.25, 0, 0, Math.PI * 2);
      context.fillStyle = cream;
      context.fill();
      context.globalAlpha = 0.4 + g.glow * 0.45;
      context.fillStyle = accent;
      context.beginPath();
      const coreSides = 3 + Math.floor(g.pattern * 4);
      for (let i = 0; i < coreSides; i += 1) {
        const angle = -Math.PI / 2 + (i / coreSides) * Math.PI * 2;
        const radius = 16 + (i % 2) * 5;
        const x = Math.cos(angle) * radius;
        const y = bodyH * 0.18 + Math.sin(angle) * radius;
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.closePath();
      context.fill();
      context.globalAlpha = 1;

      // Arms become longer and more expressive with play.
      const armY = bodyH * 0.11;
      for (const side of [-1, 1]) {
        context.save();
        context.translate(side * bodyW * 0.31, armY);
        context.rotate(side * (-0.34 + g.limbs * 0.2));
        context.beginPath();
        context.ellipse(0, 0, 18 + g.limbs * 5, 37 + g.limbs * 11, 0, 0, Math.PI * 2);
        context.fillStyle = base;
        context.fill();
        context.restore();
      }

      // Face mask.
      context.beginPath();
      context.ellipse(0, -bodyH * 0.2, bodyW * 0.35, bodyH * 0.23, 0, 0, Math.PI * 2);
      context.fillStyle = cream;
      context.fill();

      // Eyes follow touch and blink occasionally.
      const blinkCycle = reduceMotion ? 0.2 : (time / 1000 + (life.seed % 9)) % 7.4;
      const blink = blinkCycle > 7.05 ? 0.13 : 1;
      const eyeSpread = bodyW * 0.17;
      const eyeY = -bodyH * 0.22;
      for (const side of [-1, 1]) {
        context.save();
        context.translate(side * eyeSpread, eyeY);
        context.scale(1, blink);
        context.beginPath();
        context.ellipse(0, 0, 18 + g.ears * 3, 24, 0, 0, Math.PI * 2);
        context.fillStyle = "#082435";
        context.fill();
        context.beginPath();
        context.ellipse(gazeX * 4, 5 + gazeY * 3, 11, 13, 0, 0, Math.PI * 2);
        context.fillStyle = `hsl(${(baseHue + 15) % 360} 64% 55%)`;
        context.fill();
        context.beginPath();
        context.arc(-5 + gazeX * 2, -7 + gazeY, 5, 0, Math.PI * 2);
        context.fillStyle = "#fff9e6";
        context.fill();
        context.restore();
      }

      // Small mouth reflects energy.
      context.beginPath();
      if (life.energy > 28) {
        context.arc(0, -bodyH * 0.06, 9 + life.bond * 0.018, 0.08, Math.PI - 0.08);
      } else {
        context.arc(0, -bodyH * 0.02, 8, Math.PI + 0.18, Math.PI * 2 - 0.18);
      }
      context.strokeStyle = "#5c3040";
      context.lineWidth = 3;
      context.lineCap = "round";
      context.stroke();

      // Restrained inherited markings only appear gradually.
      const spotCount = Math.min(6, Math.floor(g.spots * (life.generation + 2)));
      context.fillStyle = accent;
      context.globalAlpha = 0.28 + g.glow * 0.16;
      for (let i = 0; i < spotCount; i += 1) {
        const px = (random() - 0.5) * bodyW * 0.62;
        const py = (random() - 0.5) * bodyH * 0.36 + bodyH * 0.05;
        context.beginPath();
        context.arc(px, py, 3 + random() * 4, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;

      // Seed sprout, with a chance to fork or flower as generations accumulate.
      context.strokeStyle = deep;
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(0, -bodyH * 0.48);
      context.quadraticCurveTo((g.symmetry - 0.5) * 22, -bodyH * 0.68, 1, -bodyH * 0.74);
      context.stroke();
      leaf(context, 0, -bodyH * 0.72, 35 + life.generation * 2, 13, -0.55, light);
      if (life.generation > 0) leaf(context, 0, -bodyH * 0.64, 29 + life.generation, 11, Math.PI + 0.48, base, -1);
      if (life.generation >= 4 && g.glow > 0.6) {
        context.beginPath();
        context.arc(1, -bodyH * 0.78, 8 + g.glow * 5, 0, Math.PI * 2);
        context.fillStyle = accent;
        context.globalAlpha = 0.75;
        context.fill();
        context.globalAlpha = 1;
      }

      context.restore();
      animation = window.requestAnimationFrame(draw);
    };
    animation = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(animation);
  }, [life, morphing]);

  const position = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  return (
    <canvas
      ref={canvasRef}
      className="creature-canvas"
      aria-label={`${life.name}, generation ${life.generation}. Touch and stroke the creature to build its bond.`}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        const point = position(event);
        pointerRef.current = point;
        distanceRef.current = 0;
        const rect = event.currentTarget.getBoundingClientRect();
        targetGazeRef.current = {
          x: (point.x / rect.width - 0.5) * 2,
          y: (point.y / rect.height - 0.45) * 2,
        };
      }}
      onPointerMove={(event) => {
        const point = position(event);
        const previous = pointerRef.current;
        if (previous) {
          distanceRef.current += Math.hypot(point.x - previous.x, point.y - previous.y);
          pointerRef.current = point;
        }
        const rect = event.currentTarget.getBoundingClientRect();
        targetGazeRef.current = {
          x: (point.x / rect.width - 0.5) * 2,
          y: (point.y / rect.height - 0.45) * 2,
        };
      }}
      onPointerUp={() => {
        onGesture(distanceRef.current);
        pointerRef.current = null;
        window.setTimeout(() => {
          targetGazeRef.current = { x: 0, y: 0 };
        }, 700);
      }}
      onPointerCancel={() => {
        pointerRef.current = null;
      }}
    />
  );
}

export default function Home() {
  const [life, setLife] = useState<GameState>(() => createLife(7727));
  const [hydrated, setHydrated] = useState(false);
  const [message, setMessage] = useState("Your touch is being remembered.");
  const [lineageOpen, setLineageOpen] = useState(false);
  const [morphing, setMorphing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draftName, setDraftName] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loaded = loadLife();
      setLife(loaded);
      setDraftName(loaded.name);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...life, lastSeen: Date.now() }));
  }, [life, hydrated]);

  const currentStage = useMemo(
    () => stageName(life.genome, life.generation),
    [life.genome, life.generation],
  );

  const performAction = useCallback((action: CareAction) => {
    if (busy || life.growth >= 100 || morphing) return;
    setBusy(true);
    const detail = ACTIONS.find((item) => item.id === action);
    setMessage(detail?.line ?? "It notices.");
    setLife((previous) => actionMutation(previous, action));
    if (action === "hum") playHum(life.seed, life.generation);
    window.setTimeout(() => setBusy(false), 480);
  }, [busy, life.generation, life.growth, life.seed, morphing]);

  const handleGesture = useCallback((distance: number) => {
    if (!life.started || morphing) return;
    setLife((previous) => ({
      ...previous,
      bond: clamp(previous.bond + (distance > 45 ? 1.8 : 0.8)),
      curiosity: clamp(previous.curiosity + (distance > 45 ? 1.2 : 0.4)),
      growth: clamp(previous.growth + (distance > 45 ? 1.4 : 0.5)),
      totalTouches: previous.totalTouches + 1,
      genome: {
        ...previous.genome,
        tail: clamp(previous.genome.tail + Math.min(distance, 240) * 0.00004, 0.08, 0.96),
      },
      lastSeen: Date.now(),
    }));
    setMessage(distance > 45 ? "It follows the path of your hand." : "A small, trusting chirp.");
  }, [life.started, morphing]);

  const witnessChange = () => {
    if (morphing) return;
    setMorphing(true);
    setMessage("Its remembered choices are taking shape…");
    window.setTimeout(() => {
      setLife((previous) => metamorphose(previous));
      setMessage("Something new looks back at you.");
      setMorphing(false);
    }, 1650);
  };

  const awaken = () => {
    const name = draftName.trim().slice(0, 18) || life.name;
    setLife((previous) => ({ ...previous, name, started: true, lastSeen: Date.now() }));
    setMessage(`${name} remembers the first sound of your voice.`);
  };

  const beginAgain = () => {
    if (!window.confirm("Release this life and begin with a completely new hidden seed?")) return;
    const fresh = createLife();
    setLife(fresh);
    setDraftName(fresh.name);
    setLineageOpen(false);
    setMessage("A new possibility is waiting.");
  };

  if (!hydrated) return <main className="loading-shell" aria-label="Waking MorphMorph" />;

  return (
    <main className="game-shell">
      <section className="game-card" aria-label="MorphMorph virtual lifeform">
        <header className="topbar">
          <button className="brand" type="button" onClick={() => setLineageOpen(true)} aria-label="Open lineage journal">
            <span className="brand-word">MORPHMORPH</span>
            <span className="brand-sub">living lineage</span>
          </button>
          <button className="lineage-button" type="button" onClick={() => setLineageOpen(true)}>
            <span>GEN {String(life.generation).padStart(2, "0")}</span>
            <b>{currentStage}</b>
          </button>
        </header>

        <div className="vitals" aria-label="Creature status">
          <div className="vital">
            <span>Energy</span>
            <div className="vital-track"><i style={{ width: `${life.energy}%` }} /></div>
            <strong>{Math.round(life.energy)}</strong>
          </div>
          <div className="vital vital-curiosity">
            <span>Curiosity</span>
            <div className="vital-track"><i style={{ width: `${life.curiosity}%` }} /></div>
            <strong>{Math.round(life.curiosity)}</strong>
          </div>
        </div>

        <section className={`habitat ${morphing ? "is-morphing" : ""}`} aria-label="Habitat">
          <div className="habitat-ring" />
          <div className="plant plant-left"><i /><i /><i /></div>
          <div className="plant plant-right"><i /><i /></div>
          <CreatureCanvas life={life} morphing={morphing} onGesture={handleGesture} />
          <div className="creature-label">
            <strong>{life.name}</strong>
            <span>{currentStage} · bond {Math.round(life.bond)}</span>
          </div>
        </section>

        <section className="care-panel" aria-label="Care actions">
          <div className="memory-line" role="status" aria-live="polite">
            <span className="memory-dot" />
            <p>{message}</p>
          </div>

          {life.growth >= 100 ? (
            <button className="metamorph-button" type="button" onClick={witnessChange} disabled={morphing}>
              <span>{morphing ? "Changing…" : "Witness the change"}</span>
              <small>Generation {life.generation + 1} is ready</small>
            </button>
          ) : (
            <div className="actions">
              {ACTIONS.map((action) => (
                <button
                  key={action.id}
                  className={`action action-${action.id}`}
                  type="button"
                  disabled={busy || morphing || !life.started}
                  onClick={() => performAction(action.id)}
                >
                  <span className="action-mark" aria-hidden="true">{action.mark}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          )}

          <div className="growth-row">
            <span>Next form</span>
            <div className="growth-track"><i style={{ width: `${life.growth}%` }} /></div>
            <strong>{Math.floor(life.growth)}%</strong>
          </div>
        </section>

        <footer className="build-mark">{BUILD}</footer>
      </section>

      {!life.started && (
        <div className="onboarding" role="dialog" aria-modal="true" aria-labelledby="awaken-title">
          <div className="onboarding-card">
            <span className="eyebrow">A hidden seed is stirring</span>
            <h1 id="awaken-title">No blueprint.<br />Only becoming.</h1>
            <p>Your care will become its body. Even its distant descendants have no predetermined form.</p>
            <label htmlFor="life-name">Name this life</label>
            <input
              id="life-name"
              value={draftName}
              maxLength={18}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && awaken()}
            />
            <button type="button" onClick={awaken}>Awaken {draftName.trim() || "it"}</button>
            <small>Saved only on this device</small>
          </div>
        </div>
      )}

      {lineageOpen && (
        <div className="sheet-scrim" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setLineageOpen(false)}>
          <aside className="lineage-sheet" role="dialog" aria-modal="true" aria-labelledby="lineage-title">
            <div className="sheet-handle" />
            <div className="sheet-title-row">
              <div>
                <span className="eyebrow">Remembered forms</span>
                <h2 id="lineage-title">{life.name}&apos;s lineage</h2>
              </div>
              <button type="button" onClick={() => setLineageOpen(false)} aria-label="Close lineage">×</button>
            </div>
            <div className="seed-code">Seed {life.seed.toString(16).toUpperCase().padStart(8, "0")}</div>
            <div className="lineage-list">
              <article>
                <span className="lineage-generation">GEN 00</span>
                <div><strong>Seedling</strong><p>A possibility without a history.</p></div>
              </article>
              {life.lineage.map((entry) => (
                <article key={`${entry.generation}-${entry.signature}`}>
                  <span className="lineage-generation">GEN {String(entry.generation).padStart(2, "0")}</span>
                  <div><strong>{entry.name}</strong><p>{entry.note}</p><small>{entry.signature}</small></div>
                </article>
              ))}
              {life.lineage.length === 0 && <p className="empty-lineage">Its first transformation is still unwritten.</p>}
            </div>
            <div className="sheet-explainer">
              <strong>Nothing here is a skin.</strong>
              <p>Every form is rendered from inherited traits, care history, touch and a small mutation drift.</p>
            </div>
            <button className="new-seed-button" type="button" onClick={beginAgain}>Begin with a new hidden seed</button>
          </aside>
        </div>
      )}
    </main>
  );
}
