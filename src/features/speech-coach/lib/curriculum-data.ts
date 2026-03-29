export type SoundExercise = {
  sound: string;
  articulationCue: string;
  ages24: {
    beginnerWords: string[];
    modelingScript: string;
    praiseVariants: string[];
  };
  ages57: {
    beginnerWords: string[];
    intermediateWords: string[];
    advancedPhrases: string[];
    modelingScript: string;
  };
};

export const SOUND_EXERCISES: SoundExercise[] = [
  {
    sound: "/s/ and /z/",
    articulationCue:
      "Make a snake sound! Put your teeth close together and blow air out like a snake going sssssss.",
    ages24: {
      beginnerWords: ["sun", "sock", "sit", "see", "soup", "sand"],
      modelingScript:
        "Let's play the snake game! I'll say a word and you try it after me. Ready? Ssssun! Your turn!",
      praiseVariants: [
        "Wow, great snake sound!",
        "I heard that S!",
        "You're getting so good at this!",
      ],
    },
    ages57: {
      beginnerWords: [
        "sun",
        "sock",
        "sit",
        "see",
        "soup",
        "sand",
        "story",
        "seven",
        "sister",
      ],
      intermediateWords: [
        "basket",
        "whistle",
        "outside",
        "yesterday",
        "dinosaur",
      ],
      advancedPhrases: [
        "I see six snakes",
        "Sam sits on the sofa",
        "The sun is shining",
      ],
      modelingScript:
        "We're going to practice words with the /s/ sound. Some are tricky — they have /s/ hiding in the middle! Listen first, then you try.",
    },
  },
  {
    sound: "/r/",
    articulationCue:
      "Make your tongue into a tiny cup at the back of your mouth. Say rrrrr like a little engine!",
    ages24: {
      beginnerWords: ["red", "run", "rain", "ride", "rock", "rip"],
      modelingScript: "Let's make engine sounds! Rrrrred! Can you say that with me?",
      praiseVariants: [
        "Great engine sound!",
        "I heard your R!",
        "That was awesome!",
      ],
    },
    ages57: {
      beginnerWords: [
        "red",
        "run",
        "rain",
        "ride",
        "rock",
        "rip",
        "read",
        "room",
      ],
      intermediateWords: [
        "orange",
        "airplane",
        "library",
        "tomorrow",
        "strawberry",
      ],
      advancedPhrases: [
        "The red rabbit runs",
        "I read a really great book",
        "The rain is really heavy",
      ],
      modelingScript:
        "The /r/ sound can be tricky! Let's practice — I'll say the word slowly, and you try to copy exactly what my mouth does.",
    },
  },
  {
    sound: "/l/",
    articulationCue:
      "Put the tip of your tongue right behind your top front teeth and say lllll. Your tongue touches the roof of your mouth!",
    ages24: {
      beginnerWords: ["lip", "leg", "look", "log", "lamp", "lid"],
      modelingScript:
        "Let's make the tongue-tip sound! Touch your tongue to the top of your mouth. Llllamp! Now you try!",
      praiseVariants: [
        "Your tongue did it!",
        "I heard that L!",
        "Great tongue work!",
      ],
    },
    ages57: {
      beginnerWords: [
        "lip",
        "leg",
        "look",
        "log",
        "lamp",
        "lid",
        "leaf",
        "lion",
        "lunch",
      ],
      intermediateWords: [
        "balloon",
        "yellow",
        "pillow",
        "follow",
        "umbrella",
      ],
      advancedPhrases: [
        "The little lamb licked a lollipop",
        "Look at the lovely leaves",
        "I love playing with blocks",
      ],
      modelingScript:
        "The /l/ sound lives at the top of your mouth! Let's find it together — listen to how I say these words, then copy me.",
    },
  },
  {
    sound: "/th/",
    articulationCue:
      "Stick your tongue out just a tiny bit between your teeth, then blow air out. It's the same sound as when we count: thhhree!",
    ages24: {
      beginnerWords: ["the", "this", "that", "them", "they", "there"],
      modelingScript:
        "Let's stick our tongues out a tiny bit! Thhhe — like theee! Can you do that funny tongue trick?",
      praiseVariants: [
        "I saw your tongue!",
        "Great th sound!",
        "You're so brave trying that!",
      ],
    },
    ages57: {
      beginnerWords: [
        "the",
        "this",
        "that",
        "them",
        "they",
        "there",
        "three",
        "throw",
        "think",
      ],
      intermediateWords: [
        "brother",
        "feather",
        "mother",
        "together",
        "weather",
      ],
      advancedPhrases: [
        "Three things are on the table",
        "I think that is theirs",
        "The weather is getting better",
      ],
      modelingScript:
        "The /th/ sound is special — your tongue peeks out between your teeth! Let's practice. Watch my mouth carefully.",
    },
  },
  {
    sound: "/ch/ and /sh/",
    articulationCue:
      "For /sh/, make your lips into an 'O' shape and whisper shhhhh like you're asking someone to be quiet. For /ch/, start with your tongue up, then release — chhhh like a train!",
    ages24: {
      beginnerWords: ["chin", "chop", "ship", "shop", "shoe", "cheese"],
      modelingScript:
        "Let's be a quiet train! Chhhoo chhhoo! And shhh, we're sneaking! Can you make the train and the quiet sounds?",
      praiseVariants: [
        "Great train sound!",
        "Perfect shushing!",
        "You sound just like a train!",
      ],
    },
    ages57: {
      beginnerWords: [
        "chin",
        "chop",
        "ship",
        "shop",
        "shoe",
        "cheese",
        "chair",
        "sheep",
        "shower",
      ],
      intermediateWords: [
        "kitchen",
        "catcher",
        "mushroom",
        "eyelash",
        "children",
      ],
      advancedPhrases: [
        "She sells shells by the shore",
        "The cheetah chased the chipmunk",
        "I chose chocolate chips",
      ],
      modelingScript:
        "Today we have two sounds — /ch/ like a train and /sh/ like a whisper! They're cousins. Let's practice both and notice how they feel different.",
    },
  },
  {
    sound: "/f/ and /v/",
    articulationCue:
      "Bite your bottom lip very gently with your top teeth, then blow air out for /f/. For /v/, do the same thing but turn on your voice — feel your throat vibrate!",
    ages24: {
      beginnerWords: ["fun", "fan", "fit", "fox", "van", "vet"],
      modelingScript:
        "Let's tickle our lips! Put your top teeth on your bottom lip — fffff! Can you feel the tickle? Now try fffffff-un!",
      praiseVariants: [
        "I felt the tickle!",
        "Your lip did it!",
        "Great tickle sound!",
      ],
    },
    ages57: {
      beginnerWords: [
        "fun",
        "fan",
        "fit",
        "fox",
        "van",
        "vet",
        "five",
        "voice",
        "fence",
      ],
      intermediateWords: [
        "elephant",
        "different",
        "adventure",
        "favorite",
        "whatever",
      ],
      advancedPhrases: [
        "Five frogs sat on a leaf",
        "I feel very fine today",
        "The fox found a feather",
      ],
      modelingScript:
        "Today we practice /f/ and /v/ — they're made the same way but /v/ has voice! Put your hand on your throat and feel the difference.",
    },
  },
  {
    sound: "/k/ and /g/",
    articulationCue:
      "These sounds come from the back of your throat! Squeeze the back of your tongue against the roof of your mouth — kkkk! For /g/, same spot but add your voice — gggg!",
    ages24: {
      beginnerWords: ["cat", "cup", "cut", "car", "go", "get"],
      modelingScript:
        "Let's make sounds at the back of our mouths! It feels funny back there! Kkkkkup! Can you make that back-of-mouth sound?",
      praiseVariants: [
        "That was a great back sound!",
        "I heard it come from way back there!",
        "Awesome K sound!",
      ],
    },
    ages57: {
      beginnerWords: [
        "cat",
        "cup",
        "cut",
        "car",
        "go",
        "get",
        "keep",
        "game",
        "coat",
      ],
      intermediateWords: [
        "jacket",
        "cracker",
        "chicken",
        "backpack",
        "wiggle",
      ],
      advancedPhrases: [
        "The cat caught a cricket",
        "Can we go get cookies?",
        "The king gave gifts to kids",
      ],
      modelingScript:
        "The /k/ and /g/ sounds hide in the back of your mouth! Let's go on a treasure hunt for them. Put your hand on your throat — can you feel the difference?",
    },
  },
  {
    sound: "blends (br-, cr-, fl-, st-, sp-)",
    articulationCue:
      "Blends are when two sounds sneak up right next to each other! Say the first sound, then quickly slide to the second — brrr, crrrr, flll! Practice each part slowly, then speed up.",
    ages24: {
      beginnerWords: ["blue", "fly", "stop", "star", "big", "flag"],
      modelingScript:
        "Let's slide sounds together! First say bbb… then rrr… now put them together — brrred! Like a slow train speeding up!",
      praiseVariants: [
        "You slid those sounds together!",
        "Great blending!",
        "Those two sounds made friends!",
      ],
    },
    ages57: {
      beginnerWords: [
        "blue",
        "fly",
        "stop",
        "star",
        "flag",
        "bread",
        "crab",
        "spoon",
        "frog",
      ],
      intermediateWords: [
        "breakfast",
        "flower",
        "story",
        "spring",
        "splash",
      ],
      advancedPhrases: [
        "The frog jumped from the bridge",
        "I brought bread and strawberries",
        "Spring flowers smell fresh and sweet",
      ],
      modelingScript:
        "Blends are two sounds that work as a team! Let's slow them way down first — br… br… bread. Now faster — bread! You try it step by step.",
    },
  },
];

export const SESSION_OPENERS: string[] = [
  "Hi there! I'm so excited to practice sounds with you today!",
  "Hello! Ready to play some word games? This is going to be fun!",
  "Hey! I have some awesome games for us today. Let's get started!",
  "Welcome back! I've been looking forward to our practice time together!",
  "Hi! Today we're going on a sound adventure — are you ready?",
];

export const TRANSITION_PHRASES: string[] = [
  "Great job with those! Let's try a new sound now.",
  "You're doing amazing! Ready for the next one?",
  "That was awesome! Let's move on to something new.",
  "Wow, you really got those! Time for a fresh challenge.",
  "Super work! Let's keep the energy going with something different.",
];

export const WIND_DOWN_SCRIPTS: string[] = [
  "We did such a great job today! I'm really proud of you.",
  "What a fantastic practice session! You should be really proud.",
  "You worked so hard today! Great job!",
  "That's a wrap! You practiced like a champion today.",
  "Amazing session! Your sounds are getting stronger every time.",
];

export const ENGAGEMENT_RECOVERY: string[] = [
  "Hey, are you still with me? Let's try something fun!",
  "How about we play a different game? I have a really cool one!",
  "Let's take a little break and then try again. Ready?",
  "Want to shake things up? I know a silly sound game we can try!",
  "No worries — let's go back to our favorite part. Which word do you want to try?",
];
