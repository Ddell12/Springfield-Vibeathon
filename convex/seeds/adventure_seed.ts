import { v } from "convex/values";

import { internalMutation } from "../_generated/server";

type ThemeSeed = {
  name: string;
  slug: string;
  description: string;
  imagePrompt: string;
  ageRanges: ("2-4" | "5-7")[];
};

type WordSeed = {
  themeSlug: string;
  targetSound: string;
  tier: "word" | "phrase" | "sentence";
  content: string;
  imagePrompt: string;
  difficulty: number;
};

const ADVENTURE_THEMES: ThemeSeed[] = [
  {
    name: "Dino Valley",
    slug: "dinosaurs",
    description: "Explore a land of roaring dinosaurs and ancient adventures!",
    imagePrompt: "Lush prehistoric jungle with friendly cartoon dinosaurs, warm colors, child-friendly",
    ageRanges: ["2-4", "5-7"],
  },
  {
    name: "Ocean Reef",
    slug: "ocean",
    description: "Dive into the deep blue and meet colorful sea creatures!",
    imagePrompt: "Bright coral reef with friendly cartoon fish and sea turtles, vibrant underwater scene",
    ageRanges: ["2-4", "5-7"],
  },
  {
    name: "Star Station",
    slug: "space",
    description: "Blast off through the galaxy on a star-hopping adventure!",
    imagePrompt: "Colorful cartoon space scene with rockets, planets, and friendly aliens, night sky",
    ageRanges: ["5-7"],
  },
  {
    name: "Safari Land",
    slug: "safari",
    description: "Roam the wild plains and make animal friends!",
    imagePrompt: "Sunny African savanna with cartoon lions, elephants, and giraffes, golden hour",
    ageRanges: ["2-4", "5-7"],
  },
  {
    name: "Fairy Forest",
    slug: "fairy",
    description: "Flutter through an enchanted forest full of magic and wonder!",
    imagePrompt: "Glowing magical forest with cartoon fairies, mushrooms, and fireflies, soft colors",
    ageRanges: ["2-4", "5-7"],
  },
  {
    name: "Farm Friends",
    slug: "farm",
    description: "Visit the farm and help take care of all the animals!",
    imagePrompt: "Cheerful cartoon farm with barn, chickens, cows, and sunny fields",
    ageRanges: ["2-4"],
  },
  {
    name: "Pirate Cove",
    slug: "pirates",
    description: "Sail the seven seas on a treasure hunt adventure!",
    imagePrompt: "Cartoon pirate ship on sparkling blue ocean, treasure map, friendly pirate characters",
    ageRanges: ["5-7"],
  },
  {
    name: "Super City",
    slug: "superheroes",
    description: "Fly high and save the day with your superhero powers!",
    imagePrompt: "Bright cartoon cityscape with friendly superhero characters flying, colorful costumes",
    ageRanges: ["5-7"],
  },
  {
    name: "Arctic Expedition",
    slug: "arctic",
    description: "Explore the snowy north and meet penguins and polar bears!",
    imagePrompt: "Snowy Arctic landscape with cartoon penguins, polar bears, and colorful Northern Lights",
    ageRanges: ["2-4", "5-7"],
  },
  {
    name: "Train Town",
    slug: "trains",
    description: "All aboard! Chug through mountains, tunnels, and bridges!",
    imagePrompt: "Colorful cartoon train chugging through hills and bridges, cheerful train characters",
    ageRanges: ["2-4"],
  },
];

const ADVENTURE_WORDS: WordSeed[] = [
  // /r/ sound — Dino Valley — words
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "word", content: "roar", imagePrompt: "cartoon T-Rex opening mouth to roar", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "word", content: "rock", imagePrompt: "large round dinosaur egg resting on a rock", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "word", content: "run", imagePrompt: "cartoon triceratops running fast", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "word", content: "red", imagePrompt: "red cartoon dinosaur egg", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "word", content: "raptor", imagePrompt: "cartoon velociraptor running", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "word", content: "rainbow", imagePrompt: "colorful rainbow over dino valley", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "word", content: "river", imagePrompt: "blue river flowing through prehistoric jungle", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "word", content: "rex", imagePrompt: "friendly cartoon T-Rex waving", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "word", content: "triceratops", imagePrompt: "cartoon triceratops with three horns", difficulty: 4 },
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "word", content: "pterodactyl", imagePrompt: "cartoon pterodactyl flying over volcano", difficulty: 5 },
  // /r/ sound — Dino Valley — phrases
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "phrase", content: "big roar", imagePrompt: "cartoon T-Rex doing a big roar with sound waves", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "phrase", content: "red rock", imagePrompt: "bright red rock in dino valley", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "phrase", content: "raptor runs", imagePrompt: "cartoon raptor sprinting through jungle", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "phrase", content: "river rocks", imagePrompt: "stepping stones in a river", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "phrase", content: "rainbow over the river", imagePrompt: "rainbow spanning over a prehistoric river", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "phrase", content: "roaring raptor", imagePrompt: "cartoon raptor mid-roar in jungle", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "phrase", content: "run to the rock", imagePrompt: "cartoon dino running toward a big rock", difficulty: 4 },
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "phrase", content: "triceratops and rex", imagePrompt: "triceratops and T-Rex standing together as friends", difficulty: 4 },
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "phrase", content: "really rare raptor", imagePrompt: "golden cartoon raptor glowing in a spotlight", difficulty: 5 },
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "phrase", content: "roar across the river", imagePrompt: "T-Rex roaring from one side of river to the other", difficulty: 5 },
  // /r/ sound — Dino Valley — sentences
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "sentence", content: "The raptor runs to the river.", imagePrompt: "cartoon raptor sprinting toward a river", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "sentence", content: "Rex the dinosaur loves to roar.", imagePrompt: "friendly T-Rex roaring happily", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "sentence", content: "The red rock is near the river.", imagePrompt: "red rock sitting at the edge of a river", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "sentence", content: "Raindrops fall on the roaring raptor.", imagePrompt: "raptor standing in the rain looking up", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "sentence", content: "A rainbow appears over the river after the rain.", imagePrompt: "rainbow forming over a prehistoric river", difficulty: 4 },
  { themeSlug: "dinosaurs", targetSound: "/r/", tier: "sentence", content: "The triceratops ran really fast to reach Rex.", imagePrompt: "triceratops running toward T-Rex", difficulty: 5 },
  // /s/ sound — Ocean Reef — words
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "sea", imagePrompt: "bright blue ocean with gentle waves", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "sun", imagePrompt: "sun shining over cartoon ocean", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "sand", imagePrompt: "golden sandy beach with ocean in background", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "swim", imagePrompt: "cartoon fish swimming in circles", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "seal", imagePrompt: "friendly cartoon seal balancing a ball", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "star", imagePrompt: "cartoon starfish on sandy ocean floor", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "splash", imagePrompt: "cartoon dolphin jumping and making a big splash", difficulty: 3 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "snail", imagePrompt: "cartoon sea snail crawling along coral", difficulty: 3 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "seaweed", imagePrompt: "green seaweed swaying in ocean current", difficulty: 4 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "submarine", imagePrompt: "yellow cartoon submarine underwater", difficulty: 5 },
  // /s/ sound — Ocean Reef — phrases
  { themeSlug: "ocean", targetSound: "/s/", tier: "phrase", content: "sea star", imagePrompt: "bright cartoon starfish at bottom of ocean", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "phrase", content: "sunny sea", imagePrompt: "sparkling ocean under bright sunshine", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "phrase", content: "seal swims", imagePrompt: "cartoon seal swimming gracefully", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "phrase", content: "sandy shore", imagePrompt: "beautiful sandy beach with footprints", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "phrase", content: "sea snail shell", imagePrompt: "spiral shell on sandy ocean floor", difficulty: 3 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "phrase", content: "splashing seal", imagePrompt: "seal jumping and splashing in ocean", difficulty: 3 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "phrase", content: "singing sea creatures", imagePrompt: "fish and starfish with musical notes around them", difficulty: 4 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "phrase", content: "seven starfish", imagePrompt: "seven colorful starfish arranged in a circle", difficulty: 4 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "phrase", content: "swimming past the submarine", imagePrompt: "fish swimming past yellow submarine", difficulty: 5 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "phrase", content: "swirling seaweed forest", imagePrompt: "thick seaweed forest with light filtering through", difficulty: 5 },
  // /s/ sound — Ocean Reef — sentences
  { themeSlug: "ocean", targetSound: "/s/", tier: "sentence", content: "The seal swims in the sea.", imagePrompt: "cartoon seal swimming in blue ocean", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "sentence", content: "A starfish sits on the sandy floor.", imagePrompt: "starfish resting on ocean sand", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "sentence", content: "The sun shines on the sparkling sea.", imagePrompt: "sunlight reflecting off ocean surface", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "sentence", content: "Seven sea snails slowly cross the sand.", imagePrompt: "row of snails moving across sandy ocean floor", difficulty: 3 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "sentence", content: "Sam the seal loves to splash and swim.", imagePrompt: "happy seal splashing in ocean", difficulty: 4 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "sentence", content: "The submarine sailed past the seaweed and starfish.", imagePrompt: "submarine navigating through seaweed with starfish nearby", difficulty: 5 },
  // /l/ sound — Farm Friends — words
  { themeSlug: "farm", targetSound: "/l/", tier: "word", content: "lamb", imagePrompt: "fluffy white baby lamb on green farm", difficulty: 1 },
  { themeSlug: "farm", targetSound: "/l/", tier: "word", content: "leaf", imagePrompt: "bright green leaf blowing in farm breeze", difficulty: 1 },
  { themeSlug: "farm", targetSound: "/l/", tier: "word", content: "log", imagePrompt: "wooden log by the farm fence", difficulty: 1 },
  { themeSlug: "farm", targetSound: "/l/", tier: "word", content: "lily", imagePrompt: "pink lily flower in farm garden", difficulty: 2 },
  { themeSlug: "farm", targetSound: "/l/", tier: "word", content: "lemon", imagePrompt: "bright yellow lemon on farm tree", difficulty: 2 },
  { themeSlug: "farm", targetSound: "/l/", tier: "word", content: "llama", imagePrompt: "fluffy cartoon llama smiling on the farm", difficulty: 3 },
  { themeSlug: "farm", targetSound: "/l/", tier: "word", content: "ladder", imagePrompt: "wooden ladder leaning against the barn", difficulty: 3 },
  { themeSlug: "farm", targetSound: "/l/", tier: "word", content: "apple", imagePrompt: "red apple on farm tree", difficulty: 2 },
  { themeSlug: "farm", targetSound: "/l/", tier: "word", content: "gallop", imagePrompt: "horse galloping across the farm field", difficulty: 5 },
  { themeSlug: "farm", targetSound: "/l/", tier: "word", content: "ladle", imagePrompt: "ladle hanging in farm kitchen", difficulty: 4 },
  // /l/ sound — Farm Friends — phrases
  { themeSlug: "farm", targetSound: "/l/", tier: "phrase", content: "little lamb", imagePrompt: "tiny baby lamb in a field of flowers", difficulty: 1 },
  { themeSlug: "farm", targetSound: "/l/", tier: "phrase", content: "long ladder", imagePrompt: "tall ladder against the side of the barn", difficulty: 2 },
  { themeSlug: "farm", targetSound: "/l/", tier: "phrase", content: "lemon lily", imagePrompt: "yellow lily flower that looks like a lemon", difficulty: 2 },
  { themeSlug: "farm", targetSound: "/l/", tier: "phrase", content: "llama and lamb", imagePrompt: "llama and lamb standing side by side", difficulty: 3 },
  { themeSlug: "farm", targetSound: "/l/", tier: "phrase", content: "lots of leaves", imagePrompt: "autumn leaves scattered across the farm", difficulty: 3 },
  { themeSlug: "farm", targetSound: "/l/", tier: "phrase", content: "leaping llama", imagePrompt: "llama leaping over a farm fence", difficulty: 4 },
  { themeSlug: "farm", targetSound: "/l/", tier: "phrase", content: "lazy little lamb", imagePrompt: "lamb lying down sleepily in the sun", difficulty: 4 },
  { themeSlug: "farm", targetSound: "/l/", tier: "phrase", content: "lemon tree by the lake", imagePrompt: "lemon tree next to small farm lake", difficulty: 5 },
  // /l/ sound — Farm Friends — sentences
  { themeSlug: "farm", targetSound: "/l/", tier: "sentence", content: "The little lamb likes to leap.", imagePrompt: "baby lamb jumping happily in the field", difficulty: 1 },
  { themeSlug: "farm", targetSound: "/l/", tier: "sentence", content: "A llama lives on the farm.", imagePrompt: "friendly llama standing by the barn", difficulty: 2 },
  { themeSlug: "farm", targetSound: "/l/", tier: "sentence", content: "The lemon tree has lots of leaves.", imagePrompt: "lemon tree with many green leaves", difficulty: 3 },
  { themeSlug: "farm", targetSound: "/l/", tier: "sentence", content: "Lily the lamb loves to play in the field.", imagePrompt: "lamb running and playing in flowers", difficulty: 4 },
  { themeSlug: "farm", targetSound: "/l/", tier: "sentence", content: "The llama leaped over the ladder on the long lane.", imagePrompt: "llama jumping over a ladder in a long path", difficulty: 5 },
];

export const seedAdventureData = internalMutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, { force }) => {
    const existing = await ctx.db.query("adventureThemes").first();
    if (existing && !force) return { skipped: true };

    for (const theme of ADVENTURE_THEMES) {
      await ctx.db.insert("adventureThemes", theme);
    }
    for (const word of ADVENTURE_WORDS) {
      await ctx.db.insert("adventureWords", word);
    }
    return { themesInserted: ADVENTURE_THEMES.length, wordsInserted: ADVENTURE_WORDS.length };
  },
});
