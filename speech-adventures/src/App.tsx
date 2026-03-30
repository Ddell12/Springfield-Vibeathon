import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

/* ─────────────────────────────────────────
   TYPES & DATA
   ───────────────────────────────────────── */

type FitzCategory = "people" | "actions" | "objects" | "descriptors" | "social" | "misc";

interface WordItem {
  word: string;
  emoji: string;
  category: FitzCategory;
  sound: string; // phonetic hint
  sentence: string; // carrier phrase
  prompt: string; // caregiver prompt
}

interface GameActivity {
  id: string;
  title: string;
  emoji: string;
  description: string;
  color: string;
  bgColor: string;
  skill: string;
}

type Screen = "home" | "activity" | "progress" | "settings" | "caregiver-guide";
type ActivityType = "word-explorer" | "sound-safari" | "sentence-builder" | "social-circle" | "story-time";
type Difficulty = "supported" | "guided" | "independent";

const FITZGERALD_COLORS: Record<FitzCategory, { bg: string; text: string; border: string; label: string }> = {
  people: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300", label: "People" },
  actions: { bg: "bg-green-100", text: "text-green-800", border: "border-green-300", label: "Actions" },
  objects: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300", label: "Things" },
  descriptors: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300", label: "Describing" },
  social: { bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-300", label: "Social" },
  misc: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300", label: "Questions" },
};

// Core vocabulary based on research - 50 most functional words
const CORE_WORDS: WordItem[] = [
  // Social words (Pink)
  { word: "hi", emoji: "👋", category: "social", sound: "/h/ + /aɪ/", sentence: "Hi, ___!", prompt: "Wave and say 'hi' together. Wait 5 seconds for them to try." },
  { word: "bye", emoji: "👋", category: "social", sound: "/b/ + /aɪ/", sentence: "Bye bye, ___!", prompt: "Wave bye-bye to the character. Model it slowly: 'buh-eye'." },
  { word: "more", emoji: "🔄", category: "social", sound: "/m/ + /ɔr/", sentence: "More ___!", prompt: "Pause before giving more. Hold up your hands for the 'more' sign + word." },
  { word: "help", emoji: "🤝", category: "social", sound: "/h/ + /ɛlp/", sentence: "Help me!", prompt: "Set up a situation where they need help. Model 'help' and wait." },
  { word: "please", emoji: "🙏", category: "social", sound: "/pl/ + /iz/", sentence: "___ please!", prompt: "When they request, model 'please' gently. Accept any approximation!" },
  { word: "thank you", emoji: "💛", category: "social", sound: "/θ/ + /æŋk/", sentence: "Thank you!", prompt: "After receiving something, model 'thank you' with a big smile." },
  { word: "my turn", emoji: "☝️", category: "social", sound: "/m/ + /aɪ/", sentence: "My turn!", prompt: "Take turns during play. Point to self and say 'MY turn!'" },
  { word: "all done", emoji: "✋", category: "social", sound: "/ɔl/ + /dʌn/", sentence: "All done!", prompt: "When finishing, wave hands and say 'all done.' Great for transitions!" },

  // Action words (Green)
  { word: "go", emoji: "🏃", category: "actions", sound: "/g/ + /oʊ/", sentence: "Go, go, go!", prompt: "Ready... set... WAIT for them to say 'GO!' before the action starts." },
  { word: "stop", emoji: "🛑", category: "actions", sound: "/st/ + /ɑp/", sentence: "Stop!", prompt: "Play 'go and stop' — freeze when they say 'stop!'" },
  { word: "eat", emoji: "🍽️", category: "actions", sound: "/i/ + /t/", sentence: "Eat the ___!", prompt: "Pretend to eat during play. Model 'eat' + food name: 'eat banana!'" },
  { word: "drink", emoji: "🥤", category: "actions", sound: "/dr/ + /ɪŋk/", sentence: "Drink ___!", prompt: "During snack time, model 'drink' before each sip." },
  { word: "open", emoji: "📦", category: "actions", sound: "/oʊ/ + /pən/", sentence: "Open it!", prompt: "Put toys in containers. Wait for them to say 'open' before opening." },
  { word: "push", emoji: "👐", category: "actions", sound: "/p/ + /ʊʃ/", sentence: "Push the ___!", prompt: "Roll a ball or push a toy car. Say 'push!' each time." },
  { word: "want", emoji: "🙋", category: "actions", sound: "/w/ + /ɑnt/", sentence: "I want ___!", prompt: "Hold up 2 choices. Model: 'I want ___.' Wait for them to try." },
  { word: "look", emoji: "👀", category: "actions", sound: "/l/ + /ʊk/", sentence: "Look!", prompt: "Point to interesting things. Say 'LOOK!' with excitement." },
  { word: "play", emoji: "🎮", category: "actions", sound: "/pl/ + /eɪ/", sentence: "Let's play!", prompt: "Before starting any activity: 'Ready to PLAY?'" },
  { word: "jump", emoji: "⬆️", category: "actions", sound: "/dʒ/ + /ʌmp/", sentence: "Jump!", prompt: "Jump together! Model the word each time you jump." },

  // Object words (Orange) - fringe vocab, highly motivating
  { word: "ball", emoji: "⚽", category: "objects", sound: "/b/ + /ɔl/", sentence: "Big ball!", prompt: "Roll a ball back and forth. Say 'ball' each time. Add 'big' or 'red'." },
  { word: "car", emoji: "🚗", category: "objects", sound: "/k/ + /ɑr/", sentence: "Go, car!", prompt: "Push cars together. Say 'car goes!' or 'fast car!'" },
  { word: "dog", emoji: "🐕", category: "objects", sound: "/d/ + /ɔg/", sentence: "Nice dog!", prompt: "Point to the dog picture. Say 'dog! Woof woof!' Model the word clearly." },
  { word: "cat", emoji: "🐱", category: "objects", sound: "/k/ + /æt/", sentence: "Soft cat!", prompt: "Pretend to pet the cat. 'Cat! Meow! Nice cat.'" },
  { word: "baby", emoji: "👶", category: "objects", sound: "/b/ + /eɪbi/", sentence: "Baby!", prompt: "Rock a baby doll. Model 'baby sleeping' or 'nice baby.'" },
  { word: "apple", emoji: "🍎", category: "objects", sound: "/æ/ + /pəl/", sentence: "Yummy apple!", prompt: "During snack or pretend play: 'Want apple? Apple, yum!'" },
  { word: "book", emoji: "📚", category: "objects", sound: "/b/ + /ʊk/", sentence: "Read the book!", prompt: "Hold up a book. Wait before opening: 'Open the book?'" },
  { word: "star", emoji: "⭐", category: "objects", sound: "/st/ + /ɑr/", sentence: "Wow, a star!", prompt: "Point to each star earned. Count them: 'One star, two stars!'" },
  { word: "fish", emoji: "🐟", category: "objects", sound: "/f/ + /ɪʃ/", sentence: "Little fish!", prompt: "Make swimming motions with hand. 'Fish! Swim, fish, swim!'" },
  { word: "shoe", emoji: "👟", category: "objects", sound: "/ʃ/ + /u/", sentence: "Put on shoe!", prompt: "During dressing routine. 'Where's your shoe? Put on shoe!'" },
  { word: "water", emoji: "💧", category: "objects", sound: "/w/ + /ɔtər/", sentence: "Want water!", prompt: "When thirsty, model: 'Water please.' Give small sips so they ask again." },

  // Describing words (Blue)
  { word: "big", emoji: "🐘", category: "descriptors", sound: "/b/ + /ɪg/", sentence: "So big!", prompt: "Compare two sizes. Hold arms wide: 'BIG!' Then small: 'little.'" },
  { word: "little", emoji: "🐜", category: "descriptors", sound: "/l/ + /ɪtəl/", sentence: "Little ___!", prompt: "Find small things. Whisper 'little' to match the size." },
  { word: "hot", emoji: "🔥", category: "descriptors", sound: "/h/ + /ɑt/", sentence: "Ooh, hot!", prompt: "During mealtime: 'Hot! Blow, blow.' Touch = hot, ice = cold." },
  { word: "yummy", emoji: "😋", category: "descriptors", sound: "/j/ + /ʌmi/", sentence: "Yummy ___!", prompt: "Model after each bite: 'Yummy apple!' Rub tummy for visual." },
  { word: "happy", emoji: "😊", category: "descriptors", sound: "/h/ + /æpi/", sentence: "I'm happy!", prompt: "Point to happy face. 'I feel happy! Are YOU happy?'" },
  { word: "sad", emoji: "😢", category: "descriptors", sound: "/s/ + /æd/", sentence: "Oh, sad!", prompt: "When a character is sad: 'The dog is sad. Let's help!'" },
  { word: "uh-oh", emoji: "😮", category: "descriptors", sound: "/ʌ/ + /oʊ/", sentence: "Uh-oh!", prompt: "Drop something on purpose. 'UH-OH!' with big eyes. Kids love this one!" },
  { word: "funny", emoji: "😄", category: "descriptors", sound: "/f/ + /ʌni/", sentence: "So funny!", prompt: "Do something silly! 'That was FUNNY! Haha!'" },

  // People words (Yellow)
  { word: "I", emoji: "🙋", category: "people", sound: "/aɪ/", sentence: "I want ___!", prompt: "Point to yourself: 'I am happy. I want juice.' Emphasize 'I'." },
  { word: "you", emoji: "👉", category: "people", sound: "/ju/", sentence: "You did it!", prompt: "Point to child: 'YOU jump! YOUR turn!' Clear pointing helps." },
  { word: "me", emoji: "🙋", category: "people", sound: "/mi/", sentence: "Give me!", prompt: "Model reaching toward yourself: 'Give ME the ball.'" },
  { word: "mama", emoji: "👩", category: "people", sound: "/m/ + /ɑmɑ/", sentence: "Hi mama!", prompt: "If mama is around, prompt: 'Say hi mama!' during natural moments." },
  { word: "dada", emoji: "👨", category: "people", sound: "/d/ + /ɑdɑ/", sentence: "Hi dada!", prompt: "If dada is around: 'Where's dada? There's dada! Hi dada!'" },

  // Question words (Purple)
  { word: "what", emoji: "❓", category: "misc", sound: "/w/ + /ʌt/", sentence: "What's that?", prompt: "Point to objects with curiosity: 'WHAT is that?!' Model wide eyes." },
  { word: "where", emoji: "🔍", category: "misc", sound: "/w/ + /ɛr/", sentence: "Where is ___?", prompt: "Hide objects and search together. 'WHERE did it go?!'" },
  { word: "no", emoji: "🚫", category: "misc", sound: "/n/ + /oʊ/", sentence: "No, not that!", prompt: "Respect their 'no!' Offer silly choices: 'Is this a... hat? NO!'" },
  { word: "yes", emoji: "✅", category: "misc", sound: "/j/ + /ɛs/", sentence: "Yes!", prompt: "Ask clear yes/no questions. Celebrate every 'yes!' Nod along." },
];

const ACTIVITIES: GameActivity[] = [
  {
    id: "word-explorer",
    title: "Word Explorer",
    emoji: "🗺️",
    description: "Discover core words with pictures & sounds",
    color: "text-teal-700",
    bgColor: "bg-teal-50",
    skill: "Vocabulary",
  },
  {
    id: "sound-safari",
    title: "Sound Safari",
    emoji: "🦁",
    description: "Practice early sounds with fun animals",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    skill: "Articulation",
  },
  {
    id: "sentence-builder",
    title: "Sentence Builder",
    emoji: "🧱",
    description: "Build short sentences with carrier phrases",
    color: "text-violet-700",
    bgColor: "bg-violet-50",
    skill: "Combining Words",
  },
  {
    id: "social-circle",
    title: "Social Circle",
    emoji: "🤗",
    description: "Practice greetings, requests & turn-taking",
    color: "text-pink-700",
    bgColor: "bg-pink-50",
    skill: "Pragmatics",
  },
  {
    id: "story-time",
    title: "Story Time",
    emoji: "📖",
    description: "Complete stories by choosing words",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    skill: "Narrative",
  },
];

// Sound Safari data - early developing sounds with animal associations
const SOUND_ANIMALS = [
  { sound: "/b/", animal: "Bear", emoji: "🐻", words: ["ball", "big", "baby", "bye", "book"], color: "bg-amber-100" },
  { sound: "/m/", animal: "Monkey", emoji: "🐵", words: ["mama", "more", "me", "moo"], color: "bg-yellow-100" },
  { sound: "/p/", animal: "Penguin", emoji: "🐧", words: ["push", "please", "play", "pop"], color: "bg-sky-100" },
  { sound: "/d/", animal: "Dog", emoji: "🐕", words: ["dada", "dog", "drink", "done"], color: "bg-orange-100" },
  { sound: "/n/", animal: "Narwhal", emoji: "🦄", words: ["no", "nice", "night", "nose"], color: "bg-purple-100" },
  { sound: "/t/", animal: "Tiger", emoji: "🐯", words: ["turn", "two", "top", "toe"], color: "bg-red-100" },
  { sound: "/w/", animal: "Whale", emoji: "🐳", words: ["want", "water", "what", "where"], color: "bg-blue-100" },
  { sound: "/h/", animal: "Horse", emoji: "🐴", words: ["hi", "help", "happy", "hot"], color: "bg-green-100" },
];

// Story templates with fill-in-the-blank using core vocabulary
const STORIES = [
  {
    title: "Morning Time",
    emoji: "🌅",
    scenes: [
      { text: "The sun comes up! Time to say ___!", options: ["hi", "bye", "stop"], answer: "hi", emoji: "☀️" },
      { text: "Baby bear is ___. He wants to eat!", options: ["happy", "sad", "big"], answer: "happy", emoji: "🐻" },
      { text: "He says '___ please!' to mama bear.", options: ["apple", "car", "shoe"], answer: "apple", emoji: "🍎" },
      { text: "Yummy! The apple is so ___!", options: ["yummy", "hot", "sad"], answer: "yummy", emoji: "😋" },
      { text: "Time to go play! Baby bear says ___!", options: ["stop", "go", "no"], answer: "go", emoji: "🏃" },
    ],
  },
  {
    title: "Park Adventure",
    emoji: "🌳",
    scenes: [
      { text: "Let's go to the park! I see a big ___!", options: ["dog", "star", "shoe"], answer: "dog", emoji: "🐕" },
      { text: "The dog wants to ___!", options: ["eat", "play", "stop"], answer: "play", emoji: "🎾" },
      { text: "I throw the ball and say ___!", options: ["go", "no", "bye"], answer: "go", emoji: "⚽" },
      { text: "The dog brings it back! I say ___!", options: ["uh-oh", "thank you", "sad"], answer: "thank you", emoji: "💛" },
      { text: "Time to go home. ___ bye, dog!", options: ["look", "push", "say"], answer: "look", emoji: "👋" },
    ],
  },
  {
    title: "Bath Time",
    emoji: "🛁",
    scenes: [
      { text: "It's bath time! Turn on the ___!", options: ["car", "water", "book"], answer: "water", emoji: "💧" },
      { text: "Uh-oh! The water is too ___!", options: ["hot", "big", "funny"], answer: "hot", emoji: "🔥" },
      { text: "Let's put the ___ in the tub!", options: ["fish", "star", "shoe"], answer: "fish", emoji: "🐟" },
      { text: "Splash splash! This is so ___!", options: ["sad", "funny", "little"], answer: "funny", emoji: "😄" },
      { text: "All clean! Bath time is ___!", options: ["all done", "more", "go"], answer: "all done", emoji: "✋" },
    ],
  },
];

// Social scenarios for Social Circle activity
const SOCIAL_SCENARIOS = [
  {
    title: "Meeting a Friend",
    emoji: "👋",
    character: "Sunny the Bunny",
    steps: [
      { prompt: "Sunny comes to visit! What do we say?", options: ["hi", "bye", "stop"], answer: "hi", instruction: "Wave and say 'hi!'" },
      { prompt: "Sunny wants to play. What do we say?", options: ["yes", "eat", "hot"], answer: "yes", instruction: "Nod your head and say 'yes!'" },
      { prompt: "It's YOUR turn! Tell Sunny:", options: ["my turn", "bye", "no"], answer: "my turn", instruction: "Point to yourself and say 'my turn!'" },
      { prompt: "Sunny shares a toy. What do we say?", options: ["thank you", "more", "uh-oh"], answer: "thank you", instruction: "Smile big and say 'thank you!'" },
      { prompt: "Sunny has to go. What do we say?", options: ["help", "bye", "want"], answer: "bye", instruction: "Wave and say 'bye-bye!'" },
    ],
  },
  {
    title: "Snack Time",
    emoji: "🍪",
    character: "Cookie the Cat",
    steps: [
      { prompt: "Cookie has cookies! How do we ask?", options: ["please", "stop", "go"], answer: "please", instruction: "Put hands together and say 'please!'" },
      { prompt: "You got a cookie! How does it taste?", options: ["yummy", "sad", "big"], answer: "yummy", instruction: "Rub your tummy and say 'yummy!'" },
      { prompt: "Want another cookie?", options: ["more", "bye", "all done"], answer: "more", instruction: "Tap your fingers together for 'more!' Sign + say it!" },
      { prompt: "Oh no, the cookie fell! What happened?", options: ["uh-oh", "hi", "play"], answer: "uh-oh", instruction: "Make a surprised face! 'Uh-oh!'" },
      { prompt: "No more cookies left. We're...", options: ["all done", "go", "help"], answer: "all done", instruction: "Wave hands side to side: 'All done!'" },
    ],
  },
  {
    title: "Asking for Help",
    emoji: "🧩",
    character: "Puzzle the Panda",
    steps: [
      { prompt: "The box is stuck! What do we say?", options: ["help", "bye", "funny"], answer: "help", instruction: "Reach out your hands and say 'help!'" },
      { prompt: "Can you ___ the box?", options: ["open", "eat", "look"], answer: "open", instruction: "Make an opening motion with hands: 'open!'" },
      { prompt: "Look inside! Do you ___ the puzzle?", options: ["want", "stop", "bye"], answer: "want", instruction: "Point to it and say 'I want!'" },
      { prompt: "This piece goes here! ___!", options: ["look", "go", "no"], answer: "look", instruction: "Point to it: 'LOOK!' with excitement!" },
      { prompt: "We finished! That was ___!", options: ["funny", "sad", "hot"], answer: "funny", instruction: "Clap your hands: 'Funny! We did it!'" },
    ],
  },
];

/* ─────────────────────────────────────────
   SPEECH SYNTHESIS HELPER
   ───────────────────────────────────────── */

function speak(text: string, rate = 0.75) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = rate;
  utter.pitch = 1.1;
  // Try to find a child-friendly voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.name.includes("Samantha") || v.name.includes("Karen") || v.name.includes("Daniel"));
  if (preferred) utter.voice = preferred;
  window.speechSynthesis.speak(utter);
}

/* ─────────────────────────────────────────
   REWARD PARTICLES
   ───────────────────────────────────────── */

function RewardParticles({ show }: { show: boolean }) {
  if (!show) return null;
  const particles = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      emoji: ["⭐", "🌟", "✨", "💫", "🎉", "🎊"][i % 6],
      x: Math.random() * 100,
      delay: Math.random() * 300,
      size: 16 + Math.random() * 16,
    })), []);
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute animate-star-burst"
          style={{
            left: `${p.x}%`,
            top: "50%",
            fontSize: p.size,
            animationDelay: `${p.delay}ms`,
          }}
        >
          {p.emoji}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   VISUAL TIMER (5-10 second wait)
   ───────────────────────────────────────── */

function WaitTimer({ seconds, onComplete, label }: { seconds: number; onComplete: () => void; label: string }) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed(prev => {
        if (prev >= seconds) {
          clearInterval(intervalRef.current);
          onComplete();
          return seconds;
        }
        return prev + 0.1;
      });
    }, 100);
    return () => clearInterval(intervalRef.current);
  }, [seconds, onComplete]);

  const pct = (elapsed / seconds) * 100;
  return (
    <div className="flex flex-col items-center gap-2 animate-fade-in">
      <p className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">{label}</p>
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="3"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            strokeDasharray={`${pct}, 100`}
            className="transition-all duration-100"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
          {Math.ceil(seconds - elapsed)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">Waiting for their response...</p>
    </div>
  );
}

/* ─────────────────────────────────────────
   WORD CARD
   ───────────────────────────────────────── */

function WordCard({
  item,
  size = "md",
  onClick,
  showPhonetic = false,
  isSelected = false,
  isCorrect,
}: {
  item: WordItem;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  showPhonetic?: boolean;
  isSelected?: boolean;
  isCorrect?: boolean | null;
}) {
  const fitz = FITZGERALD_COLORS[item.category];
  const sizeClasses = {
    sm: "p-2 min-w-[72px]",
    md: "p-3 min-w-[100px]",
    lg: "p-4 min-w-[130px]",
  };
  const emojiSizes = { sm: "text-2xl", md: "text-4xl", lg: "text-5xl" };
  const textSizes = { sm: "text-sm", md: "text-base", lg: "text-lg" };

  let borderColor = fitz.border;
  if (isCorrect === true) borderColor = "border-green-500 ring-2 ring-green-300";
  if (isCorrect === false) borderColor = "border-red-300";
  if (isSelected && isCorrect === undefined) borderColor = "border-primary ring-2 ring-primary/30";

  return (
    <button
      onClick={() => {
        onClick?.();
        speak(item.word, 0.7);
      }}
      className={`
        ${sizeClasses[size]} ${fitz.bg} ${borderColor}
        rounded-2xl border-2 flex flex-col items-center gap-1
        transition-all duration-300 ease-out
        hover:scale-105 hover:shadow-lg active:scale-95
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
        ${isCorrect === true ? "animate-celebrate" : ""}
        ${isCorrect === false ? "animate-wiggle opacity-60" : ""}
      `}
    >
      <span className={emojiSizes[size]}>{item.emoji}</span>
      <span className={`${textSizes[size]} font-bold ${fitz.text}`}>{item.word}</span>
      {showPhonetic && (
        <span className="text-xs text-muted-foreground font-mono">{item.sound}</span>
      )}
    </button>
  );
}

/* ─────────────────────────────────────────
   CAREGIVER TIP CARD
   ───────────────────────────────────────── */

function CaregiverTip({ tip, visible }: { tip: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="animate-slide-up bg-teal-50 border border-teal-200 rounded-xl p-3 flex gap-2 items-start">
      <span className="text-lg shrink-0">💡</span>
      <div>
        <p className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-0.5">Caregiver Tip</p>
        <p className="text-sm text-teal-800 leading-relaxed">{tip}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   PROGRESS STARS
   ───────────────────────────────────────── */

function ProgressStars({ earned, total }: { earned: number; total: number }) {
  return (
    <div className="flex gap-1 items-center">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`text-xl transition-all duration-300 ${
            i < earned ? "animate-pop scale-100" : "grayscale opacity-30 scale-90"
          }`}
          style={{ animationDelay: `${i * 100}ms` }}
        >
          ⭐
        </span>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   FIRST-THEN VISUAL SCHEDULE
   ───────────────────────────────────────── */

function FirstThen({ first, then }: { first: string; then: string }) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl p-3 border shadow-sm">
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-black text-teal-700 uppercase tracking-widest">First</span>
        <span className="text-sm font-semibold">{first}</span>
      </div>
      <span className="text-muted-foreground text-lg">→</span>
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Then</span>
        <span className="text-sm font-semibold">{then}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   ACTIVITY: WORD EXPLORER
   ───────────────────────────────────────── */

function WordExplorerActivity({
  difficulty,
  showCaregiverTips,
  onComplete,
  onStarEarned,
}: {
  difficulty: Difficulty;
  showCaregiverTips: boolean;
  onComplete: (stars: number) => void;
  onStarEarned: () => void;
}) {
  const [categoryFilter, setCategoryFilter] = useState<FitzCategory | "all">("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [showWait, setShowWait] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const filteredWords = categoryFilter === "all"
    ? CORE_WORDS.slice(0, 20) // Show first 20 for manageable session
    : CORE_WORDS.filter(w => w.category === categoryFilter).slice(0, 8);

  const currentWord = filteredWords[currentIndex];

  const handleReveal = useCallback(() => {
    setRevealed(true);
    speak(currentWord.word, 0.65);
  }, [currentWord]);

  const handleNext = useCallback(() => {
    const newStars = stars + 1;
    setStars(newStars);
    onStarEarned();
    if (currentIndex + 1 >= filteredWords.length) {
      onComplete(newStars);
    } else {
      setCurrentIndex(prev => prev + 1);
      setRevealed(false);
      setShowWait(false);
    }
  }, [currentIndex, filteredWords.length, stars, onComplete, onStarEarned]);

  const handleWaitComplete = useCallback(() => {
    setShowWait(false);
    setRevealed(true);
  }, []);

  if (!currentWord) return null;
  const fitz = FITZGERALD_COLORS[currentWord.category];

  return (
    <div className="flex flex-col gap-4">
      <FirstThen first="Say the word" then="Get a star ⭐" />

      {/* Category filter */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          <Badge
            variant={categoryFilter === "all" ? "default" : "outline"}
            className="cursor-pointer shrink-0"
            onClick={() => { setCategoryFilter("all"); setCurrentIndex(0); setRevealed(false); }}
          >
            All Words
          </Badge>
          {(Object.keys(FITZGERALD_COLORS) as FitzCategory[]).map(cat => (
            <Badge
              key={cat}
              variant={categoryFilter === cat ? "default" : "outline"}
              className={`cursor-pointer shrink-0 ${categoryFilter === cat ? "" : FITZGERALD_COLORS[cat].bg + " " + FITZGERALD_COLORS[cat].text}`}
              onClick={() => { setCategoryFilter(cat); setCurrentIndex(0); setRevealed(false); }}
            >
              {FITZGERALD_COLORS[cat].label}
            </Badge>
          ))}
        </div>
      </ScrollArea>

      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground font-medium">
          Word {currentIndex + 1} of {filteredWords.length}
        </span>
        <ProgressStars earned={stars} total={Math.min(filteredWords.length, 8)} />
      </div>

      {/* Main word display */}
      <Card className={`${fitz.bg} border-2 ${fitz.border} overflow-hidden`}>
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <span className="text-7xl animate-pop">{currentWord.emoji}</span>

          {revealed || difficulty === "supported" ? (
            <div className="flex flex-col items-center gap-2 animate-fade-in">
              <span className="text-3xl font-black tracking-wide">{currentWord.word}</span>
              <Badge variant="outline" className={`${fitz.bg} ${fitz.text} font-mono text-xs`}>
                {currentWord.sound}
              </Badge>
              <p className="text-center text-muted-foreground text-sm italic">
                "{currentWord.sentence.replace("___", currentWord.word)}"
              </p>
            </div>
          ) : showWait ? (
            <WaitTimer
              seconds={difficulty === "guided" ? 5 : 8}
              onComplete={handleWaitComplete}
              label="Your turn to try!"
            />
          ) : (
            <Button
              size="lg"
              className="animate-pulse-ring rounded-full px-8 text-lg font-bold"
              onClick={() => {
                speak(currentWord.word, 0.6);
                setShowWait(true);
              }}
            >
              🔊 Listen & Try
            </Button>
          )}

          {revealed && (
            <Button
              size="lg"
              onClick={handleNext}
              className="rounded-full bg-green-600 hover:bg-green-700 text-white px-8 text-lg font-bold animate-bounce-gentle"
            >
              ⭐ Great job! Next word →
            </Button>
          )}
        </CardContent>
      </Card>

      <CaregiverTip tip={currentWord.prompt} visible={showCaregiverTips} />
    </div>
  );
}

/* ─────────────────────────────────────────
   ACTIVITY: SOUND SAFARI
   ───────────────────────────────────────── */

function SoundSafariActivity({
  showCaregiverTips,
  onComplete,
  onStarEarned,
}: {
  showCaregiverTips: boolean;
  onComplete: (stars: number) => void;
  onStarEarned: () => void;
}) {
  const [selectedAnimal, setSelectedAnimal] = useState<number | null>(null);
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [stars, setStars] = useState(0);
  const [practiced, setPracticed] = useState(false);

  const animal = selectedAnimal !== null ? SOUND_ANIMALS[selectedAnimal] : null;
  const currentWord = animal ? animal.words[currentWordIdx] : null;

  const handlePractice = useCallback(() => {
    if (currentWord) {
      speak(currentWord, 0.6);
      setPracticed(true);
    }
  }, [currentWord]);

  const handleNext = useCallback(() => {
    if (!animal) return;
    const newStars = stars + 1;
    setStars(newStars);
    onStarEarned();
    if (currentWordIdx + 1 >= animal.words.length) {
      onComplete(newStars);
    } else {
      setCurrentWordIdx(prev => prev + 1);
      setPracticed(false);
    }
  }, [animal, currentWordIdx, stars, onComplete, onStarEarned]);

  if (selectedAnimal === null) {
    return (
      <div className="flex flex-col gap-4">
        <FirstThen first="Pick an animal" then="Practice its sound" />
        <p className="text-center text-muted-foreground font-medium">
          Each animal has a special sound. Tap to explore!
        </p>
        <div className="grid grid-cols-2 gap-3">
          {SOUND_ANIMALS.map((a, i) => (
            <button
              key={i}
              onClick={() => {
                setSelectedAnimal(i);
                speak(`${a.animal}! ${a.sound}`, 0.7);
              }}
              className={`${a.color} rounded-2xl p-4 flex flex-col items-center gap-2 border-2 border-transparent hover:border-primary/30 hover:scale-105 transition-all duration-300 active:scale-95`}
            >
              <span className="text-5xl">{a.emoji}</span>
              <span className="font-bold text-lg">{a.animal}</span>
              <Badge variant="outline" className="font-mono">{a.sound}</Badge>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <FirstThen first={`Say ${animal!.sound}`} then="Collect stars ⭐" />

      <div className="flex justify-between items-center">
        <button
          onClick={() => { setSelectedAnimal(null); setCurrentWordIdx(0); setPracticed(false); }}
          className="text-sm text-primary font-semibold hover:underline"
        >
          ← Back to animals
        </button>
        <ProgressStars earned={stars} total={animal!.words.length} />
      </div>

      <Card className={`${animal!.color} border-2 overflow-hidden`}>
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-5xl">{animal!.emoji}</span>
            <div>
              <p className="text-xl font-black">{animal!.animal} says...</p>
              <p className="text-3xl font-mono font-bold text-primary">{animal!.sound}</p>
            </div>
          </div>

          <Separator />

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">
              Word {currentWordIdx + 1} of {animal!.words.length}
            </p>
            <p className="text-4xl font-black">{currentWord}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Starts with <span className="font-bold text-primary">{animal!.sound}</span>
            </p>
          </div>

          {!practiced ? (
            <Button
              size="lg"
              className="rounded-full px-8 text-lg font-bold animate-pulse-ring"
              onClick={handlePractice}
            >
              🔊 Listen & Try
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleNext}
              className="rounded-full bg-green-600 hover:bg-green-700 text-white px-8 text-lg font-bold animate-bounce-gentle"
            >
              ⭐ You said it! Next →
            </Button>
          )}
        </CardContent>
      </Card>

      <CaregiverTip
        tip={`Practice the ${animal!.sound} sound with '${currentWord}'. Say it slowly, then normally. If they produce ANY approximation (even just the first sound), celebrate! Model the full word: '${currentWord}! Yes!'`}
        visible={showCaregiverTips}
      />
    </div>
  );
}

/* ─────────────────────────────────────────
   ACTIVITY: SENTENCE BUILDER
   ───────────────────────────────────────── */

function SentenceBuilderActivity({
  showCaregiverTips,
  onComplete,
  onStarEarned,
}: {
  showCaregiverTips: boolean;
  onComplete: (stars: number) => void;
  onStarEarned: () => void;
}) {
  const carriers = useMemo(() => [
    { frame: "I want", emoji: "🙋", words: CORE_WORDS.filter(w => w.category === "objects").slice(0, 4) },
    { frame: "I see", emoji: "👀", words: CORE_WORDS.filter(w => w.category === "objects").slice(2, 6) },
    { frame: "Go", emoji: "🏃", words: CORE_WORDS.filter(w => w.category === "objects").slice(0, 4) },
    { frame: "Big", emoji: "🐘", words: CORE_WORDS.filter(w => w.category === "objects").slice(1, 5) },
  ], []);

  const [frameIdx, setFrameIdx] = useState(0);
  const [selectedWord, setSelectedWord] = useState<number | null>(null);
  const [stars, setStars] = useState(0);
  const [showSentence, setShowSentence] = useState(false);

  const current = carriers[frameIdx];

  const handleSelectWord = useCallback((idx: number) => {
    setSelectedWord(idx);
    const word = current.words[idx];
    const sentence = `${current.frame} ${word.word}`;
    speak(sentence, 0.65);
    setShowSentence(true);
  }, [current]);

  const handleNext = useCallback(() => {
    const newStars = stars + 1;
    setStars(newStars);
    onStarEarned();
    if (frameIdx + 1 >= carriers.length) {
      onComplete(newStars);
    } else {
      setFrameIdx(prev => prev + 1);
      setSelectedWord(null);
      setShowSentence(false);
    }
  }, [frameIdx, carriers.length, stars, onComplete, onStarEarned]);

  return (
    <div className="flex flex-col gap-4">
      <FirstThen first="Pick a word" then="Build a sentence!" />

      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground font-medium">
          Sentence {frameIdx + 1} of {carriers.length}
        </span>
        <ProgressStars earned={stars} total={carriers.length} />
      </div>

      <Card className="bg-violet-50 border-2 border-violet-200 overflow-hidden">
        <CardContent className="p-6 flex flex-col items-center gap-5">
          {/* Carrier phrase */}
          <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-3 shadow-sm">
            <span className="text-3xl">{current.emoji}</span>
            <span className="text-2xl font-black text-violet-700">{current.frame}</span>
            <span className="text-2xl font-black text-violet-400">___</span>
          </div>

          {/* Word choices */}
          <div className="grid grid-cols-2 gap-3 w-full">
            {current.words.map((word, i) => (
              <WordCard
                key={word.word}
                item={word}
                size="md"
                onClick={() => handleSelectWord(i)}
                isSelected={selectedWord === i}
                isCorrect={selectedWord === i ? true : undefined}
              />
            ))}
          </div>

          {/* Built sentence */}
          {showSentence && selectedWord !== null && (
            <div className="animate-slide-up flex flex-col items-center gap-3">
              <div className="bg-white rounded-xl px-6 py-3 shadow-md border-2 border-green-300">
                <p className="text-xl font-black text-center">
                  {current.frame}{" "}
                  <span className="text-green-600">{current.words[selectedWord].word}</span>
                  !
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => speak(`${current.frame} ${current.words[selectedWord].word}`, 0.6)}
                className="rounded-full"
              >
                🔊 Hear it again
              </Button>
              <Button
                size="lg"
                onClick={handleNext}
                className="rounded-full bg-green-600 hover:bg-green-700 text-white px-8 text-lg font-bold"
              >
                ⭐ Amazing! Next sentence →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CaregiverTip
        tip={`Carrier phrases reduce cognitive load. The child only needs to add ONE word to make a sentence. Model the full sentence: '${current.frame} [word]!' Then wait 5 seconds. Accept any approximation — even pointing to the word counts!`}
        visible={showCaregiverTips}
      />
    </div>
  );
}

/* ─────────────────────────────────────────
   ACTIVITY: SOCIAL CIRCLE
   ───────────────────────────────────────── */

function SocialCircleActivity({
  showCaregiverTips,
  onComplete,
  onStarEarned,
}: {
  showCaregiverTips: boolean;
  onComplete: (stars: number) => void;
  onStarEarned: () => void;
}) {
  const [scenarioIdx, setScenarioIdx] = useState<number | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [stars, setStars] = useState(0);

  if (scenarioIdx === null) {
    return (
      <div className="flex flex-col gap-4">
        <FirstThen first="Pick a story" then="Practice talking!" />
        <div className="grid gap-3">
          {SOCIAL_SCENARIOS.map((s, i) => (
            <button
              key={i}
              onClick={() => setScenarioIdx(i)}
              className="bg-pink-50 rounded-2xl p-4 flex items-center gap-4 border-2 border-transparent hover:border-pink-300 hover:scale-[1.02] transition-all duration-300 text-left"
            >
              <span className="text-4xl">{s.emoji}</span>
              <div>
                <p className="font-bold text-lg">{s.title}</p>
                <p className="text-sm text-muted-foreground">with {s.character}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const scenario = SOCIAL_SCENARIOS[scenarioIdx];
  const step = scenario.steps[stepIdx];

  const handleSelect = (option: string) => {
    setSelected(option);
    speak(option, 0.65);
  };

  const handleNext = () => {
    if (selected === step.answer) {
      const newStars = stars + 1;
      setStars(newStars);
      onStarEarned();
    }
    if (stepIdx + 1 >= scenario.steps.length) {
      onComplete(stars + (selected === step.answer ? 1 : 0));
    } else {
      setStepIdx(prev => prev + 1);
      setSelected(null);
    }
  };

  const isCorrect = selected === step.answer;

  return (
    <div className="flex flex-col gap-4">
      <FirstThen first="Listen" then="Pick the right word" />

      <div className="flex justify-between items-center">
        <button
          onClick={() => { setScenarioIdx(null); setStepIdx(0); setSelected(null); }}
          className="text-sm text-primary font-semibold hover:underline"
        >
          ← Back to stories
        </button>
        <ProgressStars earned={stars} total={scenario.steps.length} />
      </div>

      <Card className="bg-pink-50 border-2 border-pink-200 overflow-hidden">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <Badge variant="outline" className="bg-white">
            {scenario.character} {scenario.emoji}
          </Badge>

          <p className="text-lg font-bold text-center leading-relaxed">
            {step.prompt}
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            {step.options.map(opt => {
              const wordItem = CORE_WORDS.find(w => w.word === opt);
              const isThis = selected === opt;
              const correct = isThis && isCorrect;
              const wrong = isThis && !isCorrect;
              return (
                <button
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  disabled={selected !== null}
                  className={`
                    px-5 py-3 rounded-2xl border-2 text-lg font-bold transition-all duration-300
                    ${correct ? "bg-green-100 border-green-500 animate-celebrate" : ""}
                    ${wrong ? "bg-red-50 border-red-300 animate-wiggle" : ""}
                    ${!isThis && selected !== null ? "opacity-40" : ""}
                    ${selected === null ? "bg-white border-pink-200 hover:border-pink-400 hover:scale-105 active:scale-95" : ""}
                  `}
                >
                  {wordItem?.emoji} {opt}
                </button>
              );
            })}
          </div>

          {selected !== null && (
            <div className="animate-slide-up flex flex-col items-center gap-3">
              {isCorrect ? (
                <p className="text-green-600 font-bold text-lg">Yes! "{step.answer}" is right! 🎉</p>
              ) : (
                <p className="text-amber-600 font-bold text-lg">
                  Good try! The answer is "{step.answer}" {CORE_WORDS.find(w => w.word === step.answer)?.emoji}
                </p>
              )}
              <p className="text-sm text-muted-foreground italic text-center">{step.instruction}</p>
              <Button
                size="lg"
                onClick={handleNext}
                className="rounded-full bg-green-600 hover:bg-green-700 text-white px-8 font-bold"
              >
                {stepIdx + 1 < scenario.steps.length ? "Next →" : "Finish! 🎉"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CaregiverTip
        tip={`This is a social routine practice. Act out the scenario with your child! ${step.instruction} Even if they don't say the word perfectly, celebrate the attempt. Model the correct word naturally, then move on.`}
        visible={showCaregiverTips}
      />
    </div>
  );
}

/* ─────────────────────────────────────────
   ACTIVITY: STORY TIME
   ───────────────────────────────────────── */

function StoryTimeActivity({
  showCaregiverTips,
  onComplete,
  onStarEarned,
}: {
  showCaregiverTips: boolean;
  onComplete: (stars: number) => void;
  onStarEarned: () => void;
}) {
  const [storyIdx, setStoryIdx] = useState<number | null>(null);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [stars, setStars] = useState(0);

  if (storyIdx === null) {
    return (
      <div className="flex flex-col gap-4">
        <FirstThen first="Pick a story" then="Fill in the words" />
        <div className="grid gap-3">
          {STORIES.map((s, i) => (
            <button
              key={i}
              onClick={() => setStoryIdx(i)}
              className="bg-emerald-50 rounded-2xl p-4 flex items-center gap-4 border-2 border-transparent hover:border-emerald-300 hover:scale-[1.02] transition-all duration-300 text-left"
            >
              <span className="text-4xl">{s.emoji}</span>
              <div>
                <p className="font-bold text-lg">{s.title}</p>
                <p className="text-sm text-muted-foreground">{s.scenes.length} pages</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const story = STORIES[storyIdx];
  const scene = story.scenes[sceneIdx];
  const isCorrect = selected === scene.answer;

  const handleSelect = (opt: string) => {
    setSelected(opt);
    speak(opt, 0.65);
  };

  const handleNext = () => {
    if (isCorrect) {
      const newStars = stars + 1;
      setStars(newStars);
      onStarEarned();
    }
    if (sceneIdx + 1 >= story.scenes.length) {
      onComplete(stars + (isCorrect ? 1 : 0));
    } else {
      setSceneIdx(prev => prev + 1);
      setSelected(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <button
          onClick={() => { setStoryIdx(null); setSceneIdx(0); setSelected(null); setStars(0); }}
          className="text-sm text-primary font-semibold hover:underline"
        >
          ← Back to stories
        </button>
        <ProgressStars earned={stars} total={story.scenes.length} />
      </div>

      <Card className="bg-emerald-50 border-2 border-emerald-200 overflow-hidden">
        <CardContent className="p-6 flex flex-col items-center gap-5">
          <Badge variant="outline" className="bg-white text-sm">
            {story.emoji} {story.title} — Page {sceneIdx + 1}
          </Badge>

          <span className="text-6xl animate-float">{scene.emoji}</span>

          <p className="text-xl font-bold text-center leading-relaxed">
            {scene.text.split("___").map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  selected ? (
                    <span className={`${isCorrect ? "text-green-600" : "text-amber-500"} underline decoration-2`}>
                      {selected}
                    </span>
                  ) : (
                    <span className="inline-block w-16 h-1 bg-emerald-400 rounded-full align-middle mx-1" />
                  )
                )}
              </span>
            ))}
          </p>

          {!selected && (
            <div className="flex flex-wrap gap-3 justify-center">
              {scene.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  className="px-5 py-3 bg-white rounded-2xl border-2 border-emerald-200 text-lg font-bold hover:border-emerald-400 hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  {CORE_WORDS.find(w => w.word === opt)?.emoji} {opt}
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="animate-slide-up flex flex-col items-center gap-3">
              {isCorrect ? (
                <p className="text-green-600 font-bold">Perfect! 🎉</p>
              ) : (
                <p className="text-amber-600 font-bold">
                  Nice try! It was "{scene.answer}" {CORE_WORDS.find(w => w.word === scene.answer)?.emoji}
                </p>
              )}
              <Button
                onClick={() => speak(scene.text.replace("___", scene.answer), 0.6)}
                className="rounded-full"
              >
                🔊 Hear the sentence
              </Button>
              <Button
                size="lg"
                onClick={handleNext}
                className="rounded-full bg-green-600 hover:bg-green-700 text-white px-8 font-bold"
              >
                {sceneIdx + 1 < story.scenes.length ? "Next page →" : "The End! 🎉"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CaregiverTip
        tip={`Read the story aloud together. When you reach the blank, pause and look expectantly at your child for 5-8 seconds. If they don't respond, model the answer: '${scene.answer}! ${scene.text.replace("___", scene.answer)}' Then let them repeat.`}
        visible={showCaregiverTips}
      />
    </div>
  );
}

/* ─────────────────────────────────────────
   COMPLETION DIALOG
   ───────────────────────────────────────── */

function CompletionDialog({
  open,
  stars,
  activityName,
  onClose,
  onPlayAgain,
}: {
  open: boolean;
  stars: number;
  activityName: string;
  onClose: () => void;
  onPlayAgain: () => void;
}) {
  useEffect(() => {
    if (open) speak("Great job! You did it!", 0.7);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogTitle className="sr-only">Activity Complete</DialogTitle>
        <div className="flex flex-col items-center gap-4 py-4">
          <span className="text-7xl animate-celebrate">🏆</span>
          <h2 className="text-2xl font-black">Amazing Job!</h2>
          <p className="text-muted-foreground">
            You finished <span className="font-bold">{activityName}</span>!
          </p>
          <div className="flex gap-1">
            {Array.from({ length: stars }, (_, i) => (
              <span key={i} className="text-3xl animate-pop" style={{ animationDelay: `${i * 150}ms` }}>⭐</span>
            ))}
          </div>
          <p className="text-lg font-bold text-primary">
            {stars} star{stars !== 1 ? "s" : ""} earned!
          </p>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={onClose} className="rounded-full">
              🏠 Go Home
            </Button>
            <Button onClick={onPlayAgain} className="rounded-full bg-green-600 hover:bg-green-700 text-white">
              🔄 Play Again
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────
   PROGRESS SCREEN
   ───────────────────────────────────────── */

function ProgressScreen({ sessionData }: { sessionData: Record<string, { stars: number; plays: number }> }) {
  const totalStars = Object.values(sessionData).reduce((sum, d) => sum + d.stars, 0);
  const totalPlays = Object.values(sessionData).reduce((sum, d) => sum + d.plays, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <span className="text-6xl">🏆</span>
        <h2 className="text-2xl font-black mt-2">Your Stars</h2>
        <p className="text-4xl font-black text-primary mt-1">{totalStars} ⭐</p>
        <p className="text-muted-foreground">from {totalPlays} activit{totalPlays !== 1 ? "ies" : "y"}</p>
      </div>

      <div className="grid gap-3">
        {ACTIVITIES.map(a => {
          const data = sessionData[a.id] || { stars: 0, plays: 0 };
          return (
            <div key={a.id} className={`${a.bgColor} rounded-xl p-4 flex items-center gap-3`}>
              <span className="text-3xl">{a.emoji}</span>
              <div className="flex-1">
                <p className="font-bold">{a.title}</p>
                <p className="text-sm text-muted-foreground">
                  {data.plays > 0 ? `${data.stars} stars from ${data.plays} plays` : "Not played yet"}
                </p>
              </div>
              {data.plays > 0 && (
                <div className="flex gap-0.5">
                  {Array.from({ length: Math.min(data.stars, 5) }, (_, i) => (
                    <span key={i} className="text-lg">⭐</span>
                  ))}
                  {data.stars > 5 && <span className="text-sm font-bold text-amber-600">+{data.stars - 5}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Word categories mastered */}
      <div className="bg-white rounded-xl p-4 border shadow-sm">
        <h3 className="font-bold mb-3">Word Categories</h3>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(FITZGERALD_COLORS) as [FitzCategory, typeof FITZGERALD_COLORS[FitzCategory]][]).map(([key, val]) => {
            const count = CORE_WORDS.filter(w => w.category === key).length;
            return (
              <Badge key={key} className={`${val.bg} ${val.text} border ${val.border}`}>
                {val.label}: {count} words
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   SETTINGS SCREEN
   ───────────────────────────────────────── */

function SettingsScreen({
  difficulty,
  setDifficulty,
  showCaregiverTips,
  setShowCaregiverTips,
  soundEnabled,
  setSoundEnabled,
}: {
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  showCaregiverTips: boolean;
  setShowCaregiverTips: (v: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-xl font-black">Settings</h2>

      <Card>
        <CardContent className="p-4 flex flex-col gap-4">
          <div>
            <h3 className="font-bold mb-2">Support Level</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Adjusts prompting and wait times based on the child's current level.
            </p>
            <Tabs value={difficulty} onValueChange={v => setDifficulty(v as Difficulty)}>
              <TabsList className="w-full">
                <TabsTrigger value="supported" className="flex-1 text-xs">
                  🤗 Supported
                </TabsTrigger>
                <TabsTrigger value="guided" className="flex-1 text-xs">
                  🌟 Guided
                </TabsTrigger>
                <TabsTrigger value="independent" className="flex-1 text-xs">
                  🚀 Independent
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="mt-2 text-xs text-muted-foreground">
              {difficulty === "supported" && "Words shown immediately. No wait time. Maximum support for emerging communicators."}
              {difficulty === "guided" && "5-second wait time. Word revealed after timer. Building independence with support."}
              {difficulty === "independent" && "8-second wait time. Encourages independent attempts before revealing answers."}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="caregiver-tips" className="font-bold">Caregiver Tips</Label>
              <p className="text-xs text-muted-foreground">Show coaching prompts for adults</p>
            </div>
            <Switch
              id="caregiver-tips"
              checked={showCaregiverTips}
              onCheckedChange={setShowCaregiverTips}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sound" className="font-bold">Voice Playback</Label>
              <p className="text-xs text-muted-foreground">Read words aloud when tapped</p>
            </div>
            <Switch
              id="sound"
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-teal-50 border-teal-200">
        <CardContent className="p-4">
          <h3 className="font-bold text-teal-800 mb-2">📋 About This Game</h3>
          <div className="text-sm text-teal-700 space-y-2">
            <p>
              <strong>Speech Adventures</strong> is designed using evidence-based speech therapy approaches for 4-year-olds with autism and speech delays.
            </p>
            <p>
              <strong>Research foundation:</strong> JASPER, Enhanced Milieu Teaching (EMT), Naturalistic Developmental Behavioral Interventions (NDBIs), and core vocabulary research.
            </p>
            <p>
              <strong>Color coding:</strong> Uses the Fitzgerald Key — an AAC color system where yellow = people, green = actions, orange = things, blue = describing words, pink = social words, purple = questions.
            </p>
            <p>
              <strong>Best used:</strong> Together with a caregiver or therapist, in short 5-10 minute sessions, following the child's lead and interest.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─────────────────────────────────────────
   CAREGIVER GUIDE SCREEN
   ───────────────────────────────────────── */

function CaregiverGuideScreen() {
  return (
    <ScrollArea className="h-[calc(100vh-140px)]">
      <div className="flex flex-col gap-5 pr-4">
        <h2 className="text-xl font-black">Caregiver Guide</h2>
        <p className="text-muted-foreground">Evidence-based strategies you can use during play.</p>

        {[
          {
            title: "Follow Their Lead",
            emoji: "👣",
            tips: [
              "Let your child choose which activity interests them",
              "Join their play — don't redirect to YOUR agenda",
              "Comment on what THEY are looking at or doing",
              "If they lose interest, it's okay to switch activities",
            ],
          },
          {
            title: "Model, Don't Test",
            emoji: "🪞",
            tips: [
              "Say the target word clearly and naturally",
              "Use 'parallel talk' — narrate what they're doing: 'You pushed the car!'",
              "Avoid constant 'say ___' demands — model instead",
              "If they say a word wrong, repeat it correctly without saying 'no': Child: 'gog' → You: 'Yes, DOG!'",
            ],
          },
          {
            title: "Wait & Expect",
            emoji: "⏳",
            tips: [
              "After modeling a word, WAIT 5-8 seconds — count in your head",
              "Look expectant — eyebrows up, lean forward, open mouth slightly",
              "Resist the urge to fill silence — that's processing time!",
              "Even eye contact or a gesture during the wait is communication progress",
            ],
          },
          {
            title: "Celebrate Attempts",
            emoji: "🎉",
            tips: [
              "ANY attempt to communicate is worth celebrating",
              "A sound approximation ('ba' for 'ball') counts as a win",
              "Pointing, reaching, or gesturing ARE communication",
              "Aim for 80% success — if it's too hard, give more support",
            ],
          },
          {
            title: "Keep It Short",
            emoji: "⏰",
            tips: [
              "5-10 minutes per session is perfect for this age",
              "Stop BEFORE the child loses interest (end on a high note)",
              "3 short sessions per day > 1 long session",
              "Follow your child's energy — some days will be better than others",
            ],
          },
          {
            title: "Use Core Words Daily",
            emoji: "🗣️",
            tips: [
              "'More' — at meals, during play, reading books",
              "'Go' and 'stop' — during movement play, pushing cars",
              "'Open' — containers, books, doors, snacks",
              "'Help' — set up situations where they NEED to ask for help",
              "'All done' — end of meals, bath, play, cleanup",
            ],
          },
        ].map((section, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{section.emoji}</span>
                <h3 className="font-bold text-lg">{section.title}</h3>
              </div>
              <ul className="space-y-2">
                {section.tips.map((tip, j) => (
                  <li key={j} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-primary shrink-0">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}

        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <h3 className="font-bold text-amber-800 mb-2">⚠️ Important Reminder</h3>
            <p className="text-sm text-amber-700">
              This game is a supplement to professional speech therapy, not a replacement. If your child has a speech delay,
              please consult with a licensed Speech-Language Pathologist (SLP) who can create an individualized treatment plan.
            </p>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

/* ─────────────────────────────────────────
   MAIN APP
   ───────────────────────────────────────── */

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [currentActivity, setCurrentActivity] = useState<ActivityType | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("guided");
  const [showCaregiverTips, setShowCaregiverTips] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showReward, setShowReward] = useState(false);
  const [completionData, setCompletionData] = useState<{ stars: number; name: string } | null>(null);
  const [sessionData, setSessionData] = useState<Record<string, { stars: number; plays: number }>>({});

  const handleStartActivity = (id: ActivityType) => {
    setCurrentActivity(id);
    setScreen("activity");
  };

  const handleComplete = useCallback((activityId: string, stars: number) => {
    setSessionData(prev => ({
      ...prev,
      [activityId]: {
        stars: (prev[activityId]?.stars || 0) + stars,
        plays: (prev[activityId]?.plays || 0) + 1,
      },
    }));
    setCompletionData({ stars, name: ACTIVITIES.find(a => a.id === activityId)?.title || "" });
  }, []);

  const handleStarEarned = useCallback(() => {
    setShowReward(true);
    setTimeout(() => setShowReward(false), 800);
  }, []);

  const totalStars = Object.values(sessionData).reduce((sum, d) => sum + d.stars, 0);

  // Nav items
  const navItems = [
    { id: "home" as Screen, emoji: "🏠", label: "Home" },
    { id: "progress" as Screen, emoji: "⭐", label: "Stars" },
    { id: "caregiver-guide" as Screen, emoji: "📖", label: "Guide" },
    { id: "settings" as Screen, emoji: "⚙️", label: "Settings" },
  ];

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">
      <RewardParticles show={showReward} />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {screen === "activity" && (
              <button
                onClick={() => { setScreen("home"); setCurrentActivity(null); }}
                className="text-primary font-bold text-sm hover:underline"
              >
                ← Back
              </button>
            )}
            {screen !== "activity" && (
              <>
                <span className="text-2xl">🗣️</span>
                <h1 className="text-lg font-black tracking-tight">Speech Adventures</h1>
              </>
            )}
            {screen === "activity" && currentActivity && (
              <h1 className="text-lg font-black">
                {ACTIVITIES.find(a => a.id === currentActivity)?.emoji}{" "}
                {ACTIVITIES.find(a => a.id === currentActivity)?.title}
              </h1>
            )}
          </div>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold">
            {totalStars} ⭐
          </Badge>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {/* HOME SCREEN */}
        {screen === "home" && (
          <div className="flex flex-col gap-5">
            {/* Welcome */}
            <div className="text-center py-2">
              <h2 className="text-2xl font-black">Let's Talk! 🎉</h2>
              <p className="text-muted-foreground mt-1">Pick a fun activity to practice words</p>
            </div>

            {/* Session progress */}
            {totalStars > 0 && (
              <div className="bg-amber-50 rounded-xl p-3 flex items-center gap-3 border border-amber-200">
                <span className="text-3xl">🏆</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-800">Today's Stars</p>
                  <Progress value={Math.min(totalStars * 5, 100)} className="h-2 mt-1" />
                </div>
                <span className="text-xl font-black text-amber-700">{totalStars}</span>
              </div>
            )}

            {/* Activity cards */}
            <div className="grid gap-3">
              {ACTIVITIES.map(a => {
                const plays = sessionData[a.id]?.plays || 0;
                return (
                  <button
                    key={a.id}
                    onClick={() => handleStartActivity(a.id as ActivityType)}
                    className={`${a.bgColor} rounded-2xl p-4 flex items-center gap-4 border-2 border-transparent hover:border-primary/20 hover:shadow-md hover:scale-[1.01] transition-all duration-300 text-left active:scale-[0.98]`}
                  >
                    <span className="text-4xl shrink-0">{a.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-bold text-lg ${a.color}`}>{a.title}</p>
                        {plays > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {plays}x
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{a.description}</p>
                      <Badge variant="outline" className="mt-1 text-[10px]">{a.skill}</Badge>
                    </div>
                    <span className="text-muted-foreground text-xl">→</span>
                  </button>
                );
              })}
            </div>

            {/* Quick reference: Fitzgerald Key */}
            <Card className="bg-white/80">
              <CardContent className="p-4">
                <h3 className="font-bold text-sm mb-2">Color Guide (Fitzgerald Key)</h3>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.entries(FITZGERALD_COLORS) as [FitzCategory, typeof FITZGERALD_COLORS[FitzCategory]][]).map(([, val]) => (
                    <Badge key={val.label} className={`${val.bg} ${val.text} border ${val.border} text-xs`}>
                      {val.label}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ACTIVITY SCREEN */}
        {screen === "activity" && currentActivity === "word-explorer" && (
          <WordExplorerActivity
            difficulty={difficulty}
            showCaregiverTips={showCaregiverTips}
            onComplete={stars => handleComplete("word-explorer", stars)}
            onStarEarned={handleStarEarned}
          />
        )}
        {screen === "activity" && currentActivity === "sound-safari" && (
          <SoundSafariActivity
            showCaregiverTips={showCaregiverTips}
            onComplete={stars => handleComplete("sound-safari", stars)}
            onStarEarned={handleStarEarned}
          />
        )}
        {screen === "activity" && currentActivity === "sentence-builder" && (
          <SentenceBuilderActivity
            showCaregiverTips={showCaregiverTips}
            onComplete={stars => handleComplete("sentence-builder", stars)}
            onStarEarned={handleStarEarned}
          />
        )}
        {screen === "activity" && currentActivity === "social-circle" && (
          <SocialCircleActivity
            showCaregiverTips={showCaregiverTips}
            onComplete={stars => handleComplete("social-circle", stars)}
            onStarEarned={handleStarEarned}
          />
        )}
        {screen === "activity" && currentActivity === "story-time" && (
          <StoryTimeActivity
            showCaregiverTips={showCaregiverTips}
            onComplete={stars => handleComplete("story-time", stars)}
            onStarEarned={handleStarEarned}
          />
        )}

        {/* PROGRESS SCREEN */}
        {screen === "progress" && <ProgressScreen sessionData={sessionData} />}

        {/* SETTINGS SCREEN */}
        {screen === "settings" && (
          <SettingsScreen
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            showCaregiverTips={showCaregiverTips}
            setShowCaregiverTips={setShowCaregiverTips}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
          />
        )}

        {/* CAREGIVER GUIDE SCREEN */}
        {screen === "caregiver-guide" && <CaregiverGuideScreen />}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t">
        <div className="max-w-lg mx-auto flex">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setScreen(item.id); setCurrentActivity(null); }}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all duration-300 ${
                screen === item.id ? "text-primary scale-105" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-xl">{item.emoji}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Completion dialog */}
      <CompletionDialog
        open={completionData !== null}
        stars={completionData?.stars || 0}
        activityName={completionData?.name || ""}
        onClose={() => { setCompletionData(null); setScreen("home"); setCurrentActivity(null); }}
        onPlayAgain={() => { setCompletionData(null); }}
      />
    </div>
  );
}
