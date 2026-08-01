import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const seedText = process.argv[2] || "morphmorph-codex-static-v1";

function hash(text) {
  let value = 2166136261;
  for (const char of text) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function random(seed) {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = value + Math.imul(value ^ (value >>> 7), 61 | value) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(items, rng) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

const sharedStyle = [
  "premium original botanical storybook creature illustration",
  "clean art-directed silhouette and dimensional anatomy",
  "soft cel-painted gradients with delicate leaf veins",
  "controlled luminous accents, dark teal circular habitat vignette",
  "full body visible at the same scale and camera distance",
  "no text, labels, logos, glitter, noise, or copyrighted characters",
].join("; ");

const founders = [
  {
    id: "luma",
    name: "Luma",
    bodyPlan: "floating plant-jelly organism",
    identity: [
      "translucent mint spherical bell",
      "one large luminous central teal eye",
      "two broad leaf-fins",
      "a crown sprout with paired leaves",
      "nine elegant cream-and-coral tendrils",
      "no feet or terrestrial legs",
    ],
    mutations: [
      ["Tendril bloom", "split the three longest tendrils into graceful forked tips with coral buds"],
      ["Lantern crown", "grow a second tier of tiny luminous seed-orbs around the crown sprout"],
      ["Leaf sails", "lengthen both leaf-fins into swept-back translucent sails"],
      ["Halo lobes", "add three translucent petal lobes behind the spherical bell"],
      ["Orbital motes", "add five restrained glowing seed motes orbiting just outside the bell"],
      ["Bell scallops", "develop a clearly visible scalloped coral rim along the underside of the bell"],
      ["Iris rings", "add two concentric luminous rings inside the single central eye"],
      ["Vine braid", "braid two central tendrils into one thicker twisting vine while keeping the others separate"],
      ["Crown fruit", "grow two small coral seed-fruits beneath the crown leaves"],
    ],
  },
  {
    id: "mori",
    name: "Mori",
    bodyPlan: "compact left-facing botanical quadruped",
    identity: [
      "warm cream body with mint markings",
      "one large visible blue side eye",
      "layered mint leaf mane",
      "four profile legs with side-oriented feet",
      "long high-curled botanical tail",
      "small gentle muzzle and coral cheek",
    ],
    mutations: [
      ["Mane canopy", "expand the leaf mane into a broader layered canopy flowing over the shoulders"],
      ["Tail blossom", "split the tail tip into a three-leaf blossom while preserving the long curl"],
      ["Glider buds", "grow two small folded leaf-wing buds along the upper back"],
      ["Spring legs", "lengthen the rear legs and raise the hips into a more agile springing posture"],
      ["Dorsal garden", "grow a short line of three tiny botanical sprouts down the spine"],
      ["Brow horns", "add two smooth cream-colored branch horns emerging through the mane"],
      ["Moon markings", "develop three clear mint crescent markings along the cream flank"],
      ["Petal guards", "add layered leaf guards around the front ankles without exposing paw pads"],
      ["Wing unfurl", "unfurl the existing wing buds into short elegant leaf wings, still smaller than the body"],
    ],
  },
  {
    id: "sora",
    name: "Sora",
    bodyPlan: "graceful avian-reptile botanical creature",
    identity: [
      "upright elegant posture",
      "two expressive blue eyes and a short coral beak",
      "broad layered mint leaf wings",
      "two long angled coral bird legs",
      "cream feathered chest",
      "sweeping mint-and-coral ribbon tail",
    ],
    mutations: [
      ["Wing fingers", "separate each wing into five longer individually readable leaf-feather fingers"],
      ["Tail fork", "bifurcate the sweeping tail into two asymmetrical ribbon fronds"],
      ["Crown bloom", "grow a coral three-petal bloom from the existing head crest"],
      ["Neck mantle", "develop a layered cream-and-mint leaf mantle around the lower neck"],
      ["Leg fronds", "add small backward-facing leaf fins above both ankles"],
      ["Sun chest", "form a restrained luminous branching sun motif on the cream chest"],
      ["Secondary wings", "add a smaller lower pair of folded leaf wings beneath the main wings"],
      ["Beak crest", "extend the upper beak into a small elegant coral crest without changing the face"],
      ["Tail lanterns", "grow three small luminous seed pods along the outer tail ribbon"],
    ],
  },
];

const rng = random(hash(seedText));
const lineages = founders.map((founder) => {
  const order = shuffled(founder.mutations, rng);
  const generations = [{
    generation: 0,
    title: `${founder.name} seed`,
    mutation: "Founder anchor",
    change: "No mutation. Establish the immutable lineage identity.",
    accumulated: [],
  }];

  for (let generation = 1; generation < 10; generation += 1) {
    const [mutation, change] = order[generation - 1];
    generations.push({
      generation,
      title: mutation,
      mutation,
      change,
      accumulated: order.slice(0, generation).map(([name]) => name),
    });
  }

  return { ...founder, mutations: undefined, generations };
});

const rows = Array.from({ length: 10 }, (_, generation) => ({
  generation,
  asset: `./lab/g${generation}.webp`,
  creatures: lineages.map((lineage) => lineage.generations[generation]),
  renderPrompt: generation === 0
    ? `Create exactly three separate full-body original creatures in three evenly spaced circular habitat vignettes. ${sharedStyle}`
    : [
        `Edit the previous three-creature sheet into generation ${generation}.`,
        "Preserve the exact left-to-right lineage order, identities, body plans, framing, habitat layout, lighting, rendering quality, and camera distance.",
        "Apply only these mutations, making each unmistakably visible at thumbnail size:",
        ...lineages.map((lineage, index) => `${index + 1}. ${lineage.name}: ${lineage.generations[generation].change}.`),
        "Do not redesign faces, swap anatomy between lineages, add text, or introduce unrelated mutations.",
        sharedStyle,
      ].join("\n"),
}));

const output = {
  version: 1,
  seed: seedText,
  style: sharedStyle,
  lineages,
  rows,
};

await writeFile(
  resolve("docs/lab/genomes.json"),
  `${JSON.stringify(output, null, 2)}\n`,
  "utf8",
);

console.log(`Compiled ${lineages.length} lineages × ${rows.length} generations from ${seedText}.`);
