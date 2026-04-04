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

  // /s/ sound — Dino Valley — words
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "word", content: "sun", imagePrompt: "bright cartoon sun shining over dino valley", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "word", content: "sock", imagePrompt: "cartoon sock next to a dinosaur egg", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "word", content: "soap", imagePrompt: "bar of soap next to a baby dinosaur in a bath", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "word", content: "seal", imagePrompt: "cartoon seal sitting next to a dinosaur", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "word", content: "sand", imagePrompt: "sandy desert with dinosaur footprints", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "word", content: "swim", imagePrompt: "cartoon dinosaur swimming in a river", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "word", content: "stone", imagePrompt: "large smooth stone with dinosaur fossil markings", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "word", content: "seven", imagePrompt: "seven colorful cartoon dinosaur eggs in a nest", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "word", content: "snake", imagePrompt: "cartoon snake coiled near a dinosaur nest", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "word", content: "stegosaurus", imagePrompt: "friendly cartoon stegosaurus with spiky back plates", difficulty: 4 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "word", content: "skeleton", imagePrompt: "friendly cartoon dinosaur skeleton in a museum", difficulty: 5 },
  // /s/ sound — Dino Valley — phrases
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "phrase", content: "sunny sky", imagePrompt: "bright sun in a blue sky over dino valley", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "phrase", content: "soft sand", imagePrompt: "soft sandy ground with small dinosaur tracks", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "phrase", content: "seven stones", imagePrompt: "seven round stones arranged in a circle in dino valley", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "phrase", content: "swimming stegosaurus", imagePrompt: "cartoon stegosaurus paddling in a river", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "phrase", content: "snake in the sand", imagePrompt: "cartoon snake slithering through sandy dino valley", difficulty: 4 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "phrase", content: "super speedy stegosaurus", imagePrompt: "stegosaurus running very fast leaving dust clouds", difficulty: 5 },
  // /s/ sound — Dino Valley — sentences
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "sentence", content: "The stegosaurus sat in the sun.", imagePrompt: "stegosaurus sitting contentedly under bright sunshine", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "sentence", content: "Seven small dinosaurs swim in the stream.", imagePrompt: "seven baby dinosaurs splashing in a stream", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "sentence", content: "The snake slides across the soft sand.", imagePrompt: "cartoon snake gliding gracefully over sandy ground", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/s/", tier: "sentence", content: "Stacy the stegosaurus collects smooth stones by the stream.", imagePrompt: "stegosaurus carefully picking up stones near a stream", difficulty: 5 },

  // /l/ sound — Dino Valley — words
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "word", content: "lava", imagePrompt: "glowing orange lava flow near a prehistoric volcano", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "word", content: "leaf", imagePrompt: "large green leaf in the prehistoric jungle", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "word", content: "log", imagePrompt: "big fallen log in the dino valley forest", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "word", content: "loud", imagePrompt: "cartoon dinosaur roaring very loudly with sound waves", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "word", content: "light", imagePrompt: "beam of sunlight shining through jungle trees onto a dinosaur", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "word", content: "lake", imagePrompt: "shimmering prehistoric lake surrounded by ferns", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "word", content: "little", imagePrompt: "tiny baby dinosaur standing next to a large adult", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "word", content: "leap", imagePrompt: "cartoon dinosaur leaping over a log", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "word", content: "long", imagePrompt: "very long-necked brachiosaurus stretching up to eat leaves", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "word", content: "lightning", imagePrompt: "lightning bolt striking near a sleeping dinosaur", difficulty: 4 },
  // /l/ sound — Dino Valley — phrases
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "phrase", content: "little leaf", imagePrompt: "tiny green leaf on a large prehistoric plant", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "phrase", content: "lava lake", imagePrompt: "steaming lava lake in the center of dino valley", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "phrase", content: "long legs", imagePrompt: "brachiosaurus with very long legs walking through jungle", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "phrase", content: "leaping lizard", imagePrompt: "cartoon lizard leaping between rocks in dino valley", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "phrase", content: "lightning lights the lake", imagePrompt: "lightning reflecting off a prehistoric lake at night", difficulty: 5 },
  // /l/ sound — Dino Valley — sentences
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "sentence", content: "The little dinosaur leaps over the log.", imagePrompt: "baby dinosaur jumping over a fallen log", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "sentence", content: "Long-neck looks for leaves by the lake.", imagePrompt: "brachiosaurus eating leaves near a lake", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/l/", tier: "sentence", content: "Lightning lit up the lava lake last night.", imagePrompt: "dramatic lightning over a glowing lava lake", difficulty: 4 },

  // /sh/ sound — Dino Valley — words
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "word", content: "shell", imagePrompt: "shiny prehistoric shell found near a dinosaur nest", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "word", content: "shake", imagePrompt: "cartoon dinosaur shaking water off after a swim", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "word", content: "shine", imagePrompt: "the sun shining brightly over dino valley", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "word", content: "sharp", imagePrompt: "sharp triceratops horns gleaming", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "word", content: "short", imagePrompt: "a small stubby-armed cartoon dinosaur looking proud", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "word", content: "shower", imagePrompt: "cartoon dinosaur standing in a waterfall shower", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "word", content: "shadow", imagePrompt: "large dinosaur shadow cast on a cave wall", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "word", content: "shield", imagePrompt: "ankylosaurus using its armored back as a shield", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "word", content: "shrub", imagePrompt: "small bushy shrub in a prehistoric forest", difficulty: 4 },
  // /sh/ sound — Dino Valley — phrases
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "phrase", content: "shiny shell", imagePrompt: "gleaming prehistoric shell sitting on a rock", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "phrase", content: "sharp shield", imagePrompt: "ankylosaurus with sharp armored plates", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "phrase", content: "shadow in the shrubs", imagePrompt: "mysterious dinosaur shadow visible through jungle shrubs", difficulty: 4 },
  // /sh/ sound — Dino Valley — sentences
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "sentence", content: "The dinosaur shakes the shell in the shower.", imagePrompt: "happy dinosaur shaking a shell under a waterfall", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/sh/", tier: "sentence", content: "Sharp shells shine in the shallow stream.", imagePrompt: "sparkling shells visible in clear shallow water", difficulty: 4 },

  // /ch/ sound — Dino Valley — words
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "word", content: "chase", imagePrompt: "one cartoon dinosaur playfully chasing another", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "word", content: "chew", imagePrompt: "cartoon dinosaur happily chewing on leaves", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "word", content: "chin", imagePrompt: "cartoon dinosaur with a funny pointed chin", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "word", content: "chest", imagePrompt: "proud dinosaur puffing out its chest", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "word", content: "cheer", imagePrompt: "group of cartoon dinosaurs cheering and celebrating", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "word", content: "chunk", imagePrompt: "dinosaur holding a big chunk of food", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "word", content: "choice", imagePrompt: "baby dinosaur choosing between two different colored eggs", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "word", content: "channel", imagePrompt: "water channel carved through dino valley rock", difficulty: 4 },
  // /ch/ sound — Dino Valley — phrases
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "phrase", content: "chew and chase", imagePrompt: "dinosaur pausing mid-chase to chew a leaf", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "phrase", content: "cheerful chicks", imagePrompt: "two happy baby dinosaurs chirping cheerfully", difficulty: 2 },
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "phrase", content: "chunk of cheese", imagePrompt: "cartoon dinosaur finding a giant piece of cheese", difficulty: 3 },
  // /ch/ sound — Dino Valley — sentences
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "sentence", content: "The chicken-sized dinosaur chews on a branch.", imagePrompt: "tiny feathered dinosaur happily eating a leafy branch", difficulty: 1 },
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "sentence", content: "The children cheer as the triceratops charges.", imagePrompt: "children waving as a friendly triceratops runs toward them", difficulty: 3 },
  { themeSlug: "dinosaurs", targetSound: "/ch/", tier: "sentence", content: "Each baby dinosaur chose a different colored chunk of chalk.", imagePrompt: "baby dinosaurs picking up different colored rocks", difficulty: 5 },

  // /s/ sound — Ocean Reef — words
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "sea", imagePrompt: "cartoon calm blue ocean with gentle waves", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "sand", imagePrompt: "golden sandy ocean floor with tiny shells", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "seal", imagePrompt: "friendly cartoon seal waving a flipper", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "shell", imagePrompt: "beautiful spiral shell on the sandy ocean floor", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "star", imagePrompt: "bright orange cartoon starfish resting on a rock", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "swim", imagePrompt: "cartoon fish swimming gracefully through blue water", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "silver", imagePrompt: "shiny silver fish school swimming together", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "seahorse", imagePrompt: "tiny cartoon seahorse floating near coral", difficulty: 3 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "seaweed", imagePrompt: "green seaweed swaying in ocean current", difficulty: 3 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "submarine", imagePrompt: "yellow cartoon submarine exploring the reef", difficulty: 4 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "word", content: "splash", imagePrompt: "dolphin making a big splash jumping out of the sea", difficulty: 4 },
  // /s/ sound — Ocean Reef — phrases
  { themeSlug: "ocean", targetSound: "/s/", tier: "phrase", content: "sandy shore", imagePrompt: "gentle waves washing over a sunny sandy beach", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "phrase", content: "silver seal", imagePrompt: "shiny silver-grey seal lounging on a rock", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "phrase", content: "sea star", imagePrompt: "bright starfish sitting on coral in the sea", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "phrase", content: "sneaky seahorse", imagePrompt: "seahorse peeking out from behind swaying seaweed", difficulty: 3 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "phrase", content: "sailing past the submarine", imagePrompt: "cartoon boat sailing over a submarine below the surface", difficulty: 5 },
  // /s/ sound — Ocean Reef — sentences
  { themeSlug: "ocean", targetSound: "/s/", tier: "sentence", content: "The seal swims in the sea.", imagePrompt: "cartoon seal doing a happy swim through sparkling ocean", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "sentence", content: "Stars shine above the sandy shore.", imagePrompt: "starry night sky reflected in calm ocean water near beach", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/s/", tier: "sentence", content: "The silver seahorse sees seaweed at the sandy bottom.", imagePrompt: "seahorse looking down at seaweed on the ocean floor", difficulty: 4 },

  // /r/ sound — Ocean Reef — words
  { themeSlug: "ocean", targetSound: "/r/", tier: "word", content: "reef", imagePrompt: "colorful cartoon coral reef full of fish", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/r/", tier: "word", content: "ray", imagePrompt: "friendly cartoon manta ray gliding through the water", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/r/", tier: "word", content: "rock", imagePrompt: "smooth ocean rock covered in barnacles", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/r/", tier: "word", content: "ripple", imagePrompt: "gentle ripples spreading across calm ocean water", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/r/", tier: "word", content: "rope", imagePrompt: "old rope tangled around an anchor underwater", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/r/", tier: "word", content: "rainbow", imagePrompt: "rainbow arching over the sparkling ocean after rain", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/r/", tier: "word", content: "rush", imagePrompt: "waves rushing up the sandy shore", difficulty: 3 },
  { themeSlug: "ocean", targetSound: "/r/", tier: "word", content: "river", imagePrompt: "freshwater river flowing into the ocean at the reef", difficulty: 3 },
  // /r/ sound — Ocean Reef — phrases
  { themeSlug: "ocean", targetSound: "/r/", tier: "phrase", content: "red reef", imagePrompt: "vibrant red coral reef teeming with fish", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/r/", tier: "phrase", content: "rainbow ray", imagePrompt: "manta ray swimming through rainbow-colored water", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/r/", tier: "phrase", content: "ripples on the reef", imagePrompt: "gentle ripples washing over colorful coral", difficulty: 3 },
  { themeSlug: "ocean", targetSound: "/r/", tier: "phrase", content: "river runs to the reef", imagePrompt: "river current meeting the ocean at the reef edge", difficulty: 5 },
  // /r/ sound — Ocean Reef — sentences
  { themeSlug: "ocean", targetSound: "/r/", tier: "sentence", content: "The ray rests on the reef.", imagePrompt: "manta ray settled gently on top of coral", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/r/", tier: "sentence", content: "Ripples rush across the rocks.", imagePrompt: "water ripples spreading over rocky tide pools", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/r/", tier: "sentence", content: "A rainbow appears over the reef after the rain.", imagePrompt: "beautiful rainbow arching over the coral reef", difficulty: 3 },

  // /l/ sound — Ocean Reef — words
  { themeSlug: "ocean", targetSound: "/l/", tier: "word", content: "lobster", imagePrompt: "friendly cartoon lobster waving its claws", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/l/", tier: "word", content: "light", imagePrompt: "sunlight beaming down through ocean water to the reef", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/l/", tier: "word", content: "long", imagePrompt: "very long eel swimming along the ocean floor", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/l/", tier: "word", content: "leap", imagePrompt: "cartoon dolphin leaping high out of the water", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/l/", tier: "word", content: "little", imagePrompt: "tiny clownfish hiding in sea anemone", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/l/", tier: "word", content: "lagoon", imagePrompt: "calm blue lagoon surrounded by coral and palm trees", difficulty: 3 },
  { themeSlug: "ocean", targetSound: "/l/", tier: "word", content: "lighthouse", imagePrompt: "tall cartoon lighthouse beaming light over the ocean", difficulty: 3 },
  { themeSlug: "ocean", targetSound: "/l/", tier: "word", content: "lemon", imagePrompt: "a bright lemon-yellow fish swimming near coral", difficulty: 4 },
  // /l/ sound — Ocean Reef — phrases
  { themeSlug: "ocean", targetSound: "/l/", tier: "phrase", content: "little lobster", imagePrompt: "tiny baby lobster exploring the reef floor", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/l/", tier: "phrase", content: "lighthouse light", imagePrompt: "lighthouse beam sweeping across dark ocean water", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/l/", tier: "phrase", content: "leaping in the lagoon", imagePrompt: "dolphin leaping joyfully in a sunny lagoon", difficulty: 3 },
  // /l/ sound — Ocean Reef — sentences
  { themeSlug: "ocean", targetSound: "/l/", tier: "sentence", content: "The lobster lives in the lagoon.", imagePrompt: "lobster settled happily in a warm, calm lagoon", difficulty: 1 },
  { themeSlug: "ocean", targetSound: "/l/", tier: "sentence", content: "The lighthouse light glows along the shore.", imagePrompt: "lighthouse beam lighting up a dark rocky shoreline", difficulty: 2 },
  { themeSlug: "ocean", targetSound: "/l/", tier: "sentence", content: "Little lemon fish leap through the lagoon light.", imagePrompt: "tiny yellow fish jumping through rays of sunlight in lagoon", difficulty: 4 },

  // /sh/ sound — Star Station — words
  { themeSlug: "space", targetSound: "/sh/", tier: "word", content: "ship", imagePrompt: "colorful cartoon rocket ship zooming through space", difficulty: 1 },
  { themeSlug: "space", targetSound: "/sh/", tier: "word", content: "shine", imagePrompt: "stars shining brightly in the dark space sky", difficulty: 1 },
  { themeSlug: "space", targetSound: "/sh/", tier: "word", content: "shoot", imagePrompt: "shooting star streaking across the night sky", difficulty: 1 },
  { themeSlug: "space", targetSound: "/sh/", tier: "word", content: "shadow", imagePrompt: "large planet casting a shadow across the space station", difficulty: 2 },
  { themeSlug: "space", targetSound: "/sh/", tier: "word", content: "shape", imagePrompt: "astronaut tracing star constellation shapes in the sky", difficulty: 2 },
  { themeSlug: "space", targetSound: "/sh/", tier: "word", content: "sharp", imagePrompt: "sharp pointed rocket nose cone gleaming in starlight", difficulty: 3 },
  { themeSlug: "space", targetSound: "/sh/", tier: "word", content: "shelter", imagePrompt: "cozy space station shelter glowing against dark space", difficulty: 3 },
  { themeSlug: "space", targetSound: "/sh/", tier: "word", content: "shield", imagePrompt: "energy shield protecting a space station from asteroids", difficulty: 4 },
  // /sh/ sound — Star Station — phrases
  { themeSlug: "space", targetSound: "/sh/", tier: "phrase", content: "shooting star", imagePrompt: "brilliant shooting star blazing across the galaxy", difficulty: 1 },
  { themeSlug: "space", targetSound: "/sh/", tier: "phrase", content: "shiny ship", imagePrompt: "gleaming silver rocket ship hovering in space", difficulty: 2 },
  { themeSlug: "space", targetSound: "/sh/", tier: "phrase", content: "sharp shadow shield", imagePrompt: "rocket ship with a pointed nose casting a sharp shadow", difficulty: 4 },
  // /sh/ sound — Star Station — sentences
  { themeSlug: "space", targetSound: "/sh/", tier: "sentence", content: "The space ship shines in the dark.", imagePrompt: "rocket ship glowing like a star in deep space", difficulty: 1 },
  { themeSlug: "space", targetSound: "/sh/", tier: "sentence", content: "Shooting stars flash through the shadows.", imagePrompt: "multiple shooting stars streaking through a dark nebula", difficulty: 3 },
  { themeSlug: "space", targetSound: "/sh/", tier: "sentence", content: "The shield shines as it shelters the ship from sharp rocks.", imagePrompt: "glowing shield protecting a rocket from an asteroid field", difficulty: 5 },

  // /s/ sound — Star Station — words
  { themeSlug: "space", targetSound: "/s/", tier: "word", content: "star", imagePrompt: "twinkling cartoon star in a dark space sky", difficulty: 1 },
  { themeSlug: "space", targetSound: "/s/", tier: "word", content: "sun", imagePrompt: "the sun viewed from space, big and bright yellow", difficulty: 1 },
  { themeSlug: "space", targetSound: "/s/", tier: "word", content: "space", imagePrompt: "dark expanse of space filled with stars and galaxies", difficulty: 1 },
  { themeSlug: "space", targetSound: "/s/", tier: "word", content: "suit", imagePrompt: "cartoon astronaut in a white space suit floating", difficulty: 2 },
  { themeSlug: "space", targetSound: "/s/", tier: "word", content: "silver", imagePrompt: "silver satellite orbiting a blue planet", difficulty: 2 },
  { themeSlug: "space", targetSound: "/s/", tier: "word", content: "satellite", imagePrompt: "shiny satellite with solar panels orbiting Earth", difficulty: 3 },
  { themeSlug: "space", targetSound: "/s/", tier: "word", content: "spiral", imagePrompt: "spiral galaxy swirling with stars and color", difficulty: 3 },
  { themeSlug: "space", targetSound: "/s/", tier: "word", content: "station", imagePrompt: "large space station floating above planet Earth", difficulty: 4 },
  // /s/ sound — Star Station — phrases
  { themeSlug: "space", targetSound: "/s/", tier: "phrase", content: "solar system", imagePrompt: "all the planets of the solar system in a row", difficulty: 1 },
  { themeSlug: "space", targetSound: "/s/", tier: "phrase", content: "silver satellite", imagePrompt: "gleaming silver satellite against a starry sky", difficulty: 2 },
  { themeSlug: "space", targetSound: "/s/", tier: "phrase", content: "space suit star", imagePrompt: "astronaut in space suit reaching toward a big star", difficulty: 3 },
  { themeSlug: "space", targetSound: "/s/", tier: "phrase", content: "spinning space station", imagePrompt: "space station slowly rotating against a backdrop of stars", difficulty: 4 },
  // /s/ sound — Star Station — sentences
  { themeSlug: "space", targetSound: "/s/", tier: "sentence", content: "Stars sparkle in the space station sky.", imagePrompt: "countless sparkly stars visible through a space station window", difficulty: 1 },
  { themeSlug: "space", targetSound: "/s/", tier: "sentence", content: "The satellite circles the solar system.", imagePrompt: "satellite orbiting in a wide arc around the sun and planets", difficulty: 3 },
  { themeSlug: "space", targetSound: "/s/", tier: "sentence", content: "Seven silver satellites spin past the space station.", imagePrompt: "seven spinning satellites passing by the space station", difficulty: 5 },

  // /r/ sound — Star Station — words
  { themeSlug: "space", targetSound: "/r/", tier: "word", content: "rocket", imagePrompt: "bright red cartoon rocket blasting off into space", difficulty: 1 },
  { themeSlug: "space", targetSound: "/r/", tier: "word", content: "ring", imagePrompt: "planet Saturn with its beautiful rings", difficulty: 1 },
  { themeSlug: "space", targetSound: "/r/", tier: "word", content: "rover", imagePrompt: "cartoon space rover rolling across a red planet surface", difficulty: 2 },
  { themeSlug: "space", targetSound: "/r/", tier: "word", content: "radar", imagePrompt: "spinning radar dish on a space station", difficulty: 2 },
  { themeSlug: "space", targetSound: "/r/", tier: "word", content: "race", imagePrompt: "two rockets racing side by side through space", difficulty: 2 },
  { themeSlug: "space", targetSound: "/r/", tier: "word", content: "ray", imagePrompt: "beam of laser ray shooting from a space ship", difficulty: 3 },
  { themeSlug: "space", targetSound: "/r/", tier: "word", content: "red", imagePrompt: "the red planet Mars glowing in space", difficulty: 3 },
  // /r/ sound — Star Station — phrases
  { themeSlug: "space", targetSound: "/r/", tier: "phrase", content: "rocket race", imagePrompt: "two rockets neck-and-neck racing through an asteroid field", difficulty: 1 },
  { themeSlug: "space", targetSound: "/r/", tier: "phrase", content: "radar ring", imagePrompt: "radar beam sweeping in a ring pattern", difficulty: 2 },
  { themeSlug: "space", targetSound: "/r/", tier: "phrase", content: "red rover on rings", imagePrompt: "rover driving along the rings of a ringed planet", difficulty: 4 },
  // /r/ sound — Star Station — sentences
  { themeSlug: "space", targetSound: "/r/", tier: "sentence", content: "The rocket races past the rings of Saturn.", imagePrompt: "rocket zooming past Saturn's famous rings", difficulty: 1 },
  { themeSlug: "space", targetSound: "/r/", tier: "sentence", content: "The rover rolls on the red ground.", imagePrompt: "rover slowly driving over dusty red Martian terrain", difficulty: 2 },
  { themeSlug: "space", targetSound: "/r/", tier: "sentence", content: "The radar reads the rings around the red planet.", imagePrompt: "space station radar scanning ring system of a red planet", difficulty: 4 },
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
