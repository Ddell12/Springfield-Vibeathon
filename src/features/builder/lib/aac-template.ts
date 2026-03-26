// AAC (Augmentative and Alternative Communication) template.
// "Modern Vibeathon" design — premium, Duolingo-style 3D buttons,
// vibrant colors, max accessibility and visual polish.

export function getAACTemplate(): string {
  return `import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Volume2, X, Home, Trash2, Sparkles, Grid3X3, Eye, EyeOff, Type, ChevronLeft, Settings2, Play } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useTTS } from "./hooks/useTTS";
import { cn } from "./lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type FitzCategory = "pronoun" | "verb" | "adjective" | "social" | "question" | "preposition" | "noun" | "function";
type FringeCategory = "food" | "feelings" | "animals" | "people" | "places" | "body";

interface Word { id: string; label: string; emoji: string; category: FitzCategory; row: number; col: number; }
interface FringeWord { id: string; label: string; emoji: string; fringeCategory: FringeCategory; }
interface Settings { gridCols: number; gridRows: number; showEmoji: boolean; fontSize: "sm" | "md" | "lg"; }

// ─── Vibrant Duolingo-Style Palette ──────────────────────────────────────────

const FITZ: Record<FitzCategory, { bg: string; border: string; text: string; shadow: string; name: string }> = {
  pronoun:     { bg: "#FEF08A", border: "#EAB308", text: "#713F12", shadow: "#CA8A04", name: "Pronouns" },
  verb:        { bg: "#BBF7D0", border: "#22C55E", text: "#14532D", shadow: "#16A34A", name: "Verbs" },
  adjective:   { bg: "#BFDBFE", border: "#3B82F6", text: "#1E3A8A", shadow: "#2563EB", name: "Describing" },
  social:      { bg: "#FBCFE8", border: "#EC4899", text: "#831843", shadow: "#DB2777", name: "Social" },
  question:    { bg: "#E9D5FF", border: "#A855F7", text: "#581C87", shadow: "#9333EA", name: "Questions" },
  preposition: { bg: "#A7F3D0", border: "#10B981", text: "#064E3B", shadow: "#059669", name: "Location" },
  noun:        { bg: "#FED7AA", border: "#F97316", text: "#7C2D12", shadow: "#EA580C", name: "Things" },
  function:    { bg: "#E2E8F0", border: "#94A3B8", text: "#0F172A", shadow: "#64748B", name: "Helpers" },
};

const FRINGE_META: Record<FringeCategory, { emoji: string; name: string }> = {
  food:     { emoji: "🍎", name: "Food" },
  feelings: { emoji: "💛", name: "Feelings" },
  animals:  { emoji: "🐾", name: "Animals" },
  people:   { emoji: "👨‍👩‍👧", name: "People" },
  places:   { emoji: "📍", name: "Places" },
  body:     { emoji: "🖐️", name: "Body" },
};

// ─── Core Vocabulary (80 words) ──────────────────────────────────────────────
const CORE: Word[] = [
  { id:"i",label:"I",emoji:"👤",category:"pronoun",row:0,col:0 },
  { id:"you",label:"you",emoji:"👉",category:"pronoun",row:0,col:1 },
  { id:"he",label:"he",emoji:"👦",category:"pronoun",row:0,col:2 },
  { id:"she",label:"she",emoji:"👧",category:"pronoun",row:0,col:3 },
  { id:"we",label:"we",emoji:"👥",category:"pronoun",row:0,col:4 },
  { id:"they",label:"they",emoji:"👫",category:"pronoun",row:0,col:5 },
  { id:"it",label:"it",emoji:"📦",category:"pronoun",row:1,col:0 },
  { id:"my",label:"my",emoji:"💛",category:"pronoun",row:1,col:1 },
  { id:"want",label:"want",emoji:"🙏",category:"verb",row:1,col:2 },
  { id:"go",label:"go",emoji:"🚶",category:"verb",row:1,col:3 },
  { id:"stop",label:"stop",emoji:"✋",category:"verb",row:1,col:4 },
  { id:"help",label:"help",emoji:"🤝",category:"verb",row:1,col:5 },
  { id:"like",label:"like",emoji:"👍",category:"verb",row:2,col:0 },
  { id:"eat",label:"eat",emoji:"🍽️",category:"verb",row:2,col:1 },
  { id:"drink",label:"drink",emoji:"🥤",category:"verb",row:2,col:2 },
  { id:"play",label:"play",emoji:"🎮",category:"verb",row:2,col:3 },
  { id:"make",label:"make",emoji:"🔨",category:"verb",row:2,col:4 },
  { id:"see",label:"see",emoji:"👀",category:"verb",row:2,col:5 },
  { id:"put",label:"put",emoji:"📥",category:"verb",row:3,col:0 },
  { id:"get",label:"get",emoji:"🤲",category:"verb",row:3,col:1 },
  { id:"turn",label:"turn",emoji:"🔄",category:"verb",row:3,col:2 },
  { id:"open",label:"open",emoji:"📂",category:"verb",row:3,col:3 },
  { id:"feel",label:"feel",emoji:"💓",category:"verb",row:3,col:4 },
  { id:"do",label:"do",emoji:"⚡",category:"verb",row:3,col:5 },
  { id:"have",label:"have",emoji:"🎁",category:"verb",row:4,col:0 },
  { id:"need",label:"need",emoji:"❗",category:"verb",row:4,col:1 },
  { id:"come",label:"come",emoji:"🫳",category:"verb",row:4,col:2 },
  { id:"give",label:"give",emoji:"🤲",category:"verb",row:4,col:3 },
  { id:"more",label:"more",emoji:"➕",category:"adjective",row:4,col:4 },
  { id:"big",label:"big",emoji:"🔵",category:"adjective",row:4,col:5 },
  { id:"little",label:"little",emoji:"🔹",category:"adjective",row:5,col:0 },
  { id:"good",label:"good",emoji:"⭐",category:"adjective",row:5,col:1 },
  { id:"bad",label:"bad",emoji:"👎",category:"adjective",row:5,col:2 },
  { id:"hot",label:"hot",emoji:"🔥",category:"adjective",row:5,col:3 },
  { id:"cold",label:"cold",emoji:"❄️",category:"adjective",row:5,col:4 },
  { id:"all",label:"all",emoji:"🌐",category:"adjective",row:5,col:5 },
  { id:"different",label:"different",emoji:"🔀",category:"adjective",row:6,col:0 },
  { id:"same",label:"same",emoji:"🟰",category:"adjective",row:6,col:1 },
  { id:"new",label:"new",emoji:"✨",category:"adjective",row:6,col:2 },
  { id:"done",label:"done",emoji:"✅",category:"adjective",row:6,col:3 },
  { id:"yes",label:"yes",emoji:"✅",category:"social",row:6,col:4 },
  { id:"no",label:"no",emoji:"❌",category:"social",row:6,col:5 },
  { id:"please",label:"please",emoji:"🙏",category:"social",row:7,col:0 },
  { id:"thankyou",label:"thank you",emoji:"💕",category:"social",row:7,col:1 },
  { id:"hi",label:"hi",emoji:"👋",category:"social",row:7,col:2 },
  { id:"bye",label:"bye",emoji:"🤚",category:"social",row:7,col:3 },
  { id:"sorry",label:"sorry",emoji:"😔",category:"social",row:7,col:4 },
  { id:"wow",label:"wow",emoji:"😮",category:"social",row:7,col:5 },
  { id:"what",label:"what",emoji:"❓",category:"question",row:8,col:0 },
  { id:"where",label:"where",emoji:"📍",category:"question",row:8,col:1 },
  { id:"who",label:"who",emoji:"🔍",category:"question",row:8,col:2 },
  { id:"when",label:"when",emoji:"🕐",category:"question",row:8,col:3 },
  { id:"why",label:"why",emoji:"🤔",category:"question",row:8,col:4 },
  { id:"how",label:"how",emoji:"💡",category:"question",row:8,col:5 },
  { id:"in",label:"in",emoji:"📥",category:"preposition",row:9,col:0 },
  { id:"on",label:"on",emoji:"🔛",category:"preposition",row:9,col:1 },
  { id:"off",label:"off",emoji:"📴",category:"preposition",row:9,col:2 },
  { id:"up",label:"up",emoji:"⬆️",category:"preposition",row:9,col:3 },
  { id:"down",label:"down",emoji:"⬇️",category:"preposition",row:9,col:4 },
  { id:"here",label:"here",emoji:"📌",category:"preposition",row:9,col:5 },
  { id:"there",label:"there",emoji:"👉",category:"preposition",row:10,col:0 },
  { id:"with",label:"with",emoji:"🤝",category:"preposition",row:10,col:1 },
  { id:"thing",label:"thing",emoji:"📦",category:"noun",row:10,col:2 },
  { id:"place",label:"place",emoji:"🏠",category:"noun",row:10,col:3 },
  { id:"time",label:"time",emoji:"⏰",category:"noun",row:10,col:4 },
  { id:"people_n",label:"people",emoji:"👨‍👩‍👧",category:"noun",row:10,col:5 },
  { id:"home",label:"home",emoji:"🏡",category:"noun",row:11,col:0 },
  { id:"school",label:"school",emoji:"🏫",category:"noun",row:11,col:1 },
  { id:"food_n",label:"food",emoji:"🍕",category:"noun",row:11,col:2 },
  { id:"toy",label:"toy",emoji:"🧸",category:"noun",row:11,col:3 },
  { id:"not",label:"not",emoji:"🚫",category:"function",row:11,col:4 },
  { id:"can",label:"can",emoji:"💪",category:"function",row:11,col:5 },
  { id:"will",label:"will",emoji:"🔮",category:"function",row:12,col:0 },
  { id:"is",label:"is",emoji:"▶️",category:"function",row:12,col:1 },
  { id:"the",label:"the",emoji:"👆",category:"function",row:12,col:2 },
  { id:"a",label:"a",emoji:"1️⃣",category:"function",row:12,col:3 },
  { id:"to",label:"to",emoji:"➡️",category:"function",row:12,col:4 },
  { id:"and",label:"and",emoji:"➕",category:"function",row:12,col:5 },
];

const FRINGE: FringeWord[] = [
  { id:"f_apple",label:"apple",emoji:"🍎",fringeCategory:"food" },
  { id:"f_banana",label:"banana",emoji:"🍌",fringeCategory:"food" },
  { id:"f_cookie",label:"cookie",emoji:"🍪",fringeCategory:"food" },
  { id:"f_milk",label:"milk",emoji:"🥛",fringeCategory:"food" },
  { id:"f_water",label:"water",emoji:"💧",fringeCategory:"food" },
  { id:"f_juice",label:"juice",emoji:"🧃",fringeCategory:"food" },
  { id:"f_pizza",label:"pizza",emoji:"🍕",fringeCategory:"food" },
  { id:"f_chicken",label:"chicken",emoji:"🍗",fringeCategory:"food" },
  { id:"f_bread",label:"bread",emoji:"🍞",fringeCategory:"food" },
  { id:"f_cheese",label:"cheese",emoji:"🧀",fringeCategory:"food" },
  { id:"f_yogurt",label:"yogurt",emoji:"🫙",fringeCategory:"food" },
  { id:"f_cereal",label:"cereal",emoji:"🥣",fringeCategory:"food" },
  { id:"f_happy",label:"happy",emoji:"😊",fringeCategory:"feelings" },
  { id:"f_sad",label:"sad",emoji:"😢",fringeCategory:"feelings" },
  { id:"f_angry",label:"angry",emoji:"😠",fringeCategory:"feelings" },
  { id:"f_scared",label:"scared",emoji:"😨",fringeCategory:"feelings" },
  { id:"f_tired",label:"tired",emoji:"😴",fringeCategory:"feelings" },
  { id:"f_hungry",label:"hungry",emoji:"🤤",fringeCategory:"feelings" },
  { id:"f_thirsty",label:"thirsty",emoji:"🥵",fringeCategory:"feelings" },
  { id:"f_sick",label:"sick",emoji:"🤒",fringeCategory:"feelings" },
  { id:"f_excited",label:"excited",emoji:"🤩",fringeCategory:"feelings" },
  { id:"f_calm",label:"calm",emoji:"😌",fringeCategory:"feelings" },
  { id:"f_silly",label:"silly",emoji:"🤪",fringeCategory:"feelings" },
  { id:"f_proud",label:"proud",emoji:"🥹",fringeCategory:"feelings" },
  { id:"f_dog",label:"dog",emoji:"🐶",fringeCategory:"animals" },
  { id:"f_cat",label:"cat",emoji:"🐱",fringeCategory:"animals" },
  { id:"f_fish",label:"fish",emoji:"🐟",fringeCategory:"animals" },
  { id:"f_bird",label:"bird",emoji:"🐦",fringeCategory:"animals" },
  { id:"f_horse",label:"horse",emoji:"🐴",fringeCategory:"animals" },
  { id:"f_cow",label:"cow",emoji:"🐮",fringeCategory:"animals" },
  { id:"f_bear",label:"bear",emoji:"🐻",fringeCategory:"animals" },
  { id:"f_frog",label:"frog",emoji:"🐸",fringeCategory:"animals" },
  { id:"f_bunny",label:"bunny",emoji:"🐰",fringeCategory:"animals" },
  { id:"f_duck",label:"duck",emoji:"🦆",fringeCategory:"animals" },
  { id:"f_mom",label:"mom",emoji:"👩",fringeCategory:"people" },
  { id:"f_dad",label:"dad",emoji:"👨",fringeCategory:"people" },
  { id:"f_teacher",label:"teacher",emoji:"👩‍🏫",fringeCategory:"people" },
  { id:"f_friend",label:"friend",emoji:"🧑‍🤝‍🧑",fringeCategory:"people" },
  { id:"f_baby",label:"baby",emoji:"👶",fringeCategory:"people" },
  { id:"f_grandma",label:"grandma",emoji:"👵",fringeCategory:"people" },
  { id:"f_grandpa",label:"grandpa",emoji:"👴",fringeCategory:"people" },
  { id:"f_brother",label:"brother",emoji:"👦",fringeCategory:"people" },
  { id:"f_sister",label:"sister",emoji:"👧",fringeCategory:"people" },
  { id:"f_doctor",label:"doctor",emoji:"👩‍⚕️",fringeCategory:"people" },
  { id:"f_bathroom",label:"bathroom",emoji:"🚽",fringeCategory:"places" },
  { id:"f_kitchen",label:"kitchen",emoji:"🍳",fringeCategory:"places" },
  { id:"f_outside",label:"outside",emoji:"🌳",fringeCategory:"places" },
  { id:"f_park",label:"park",emoji:"🛝",fringeCategory:"places" },
  { id:"f_car",label:"car",emoji:"🚗",fringeCategory:"places" },
  { id:"f_store",label:"store",emoji:"🏪",fringeCategory:"places" },
  { id:"f_bedroom",label:"bedroom",emoji:"🛏️",fringeCategory:"places" },
  { id:"f_playground",label:"playground",emoji:"🎠",fringeCategory:"places" },
  { id:"f_head",label:"head",emoji:"🗣️",fringeCategory:"body" },
  { id:"f_hand",label:"hand",emoji:"🖐️",fringeCategory:"body" },
  { id:"f_foot",label:"foot",emoji:"🦶",fringeCategory:"body" },
  { id:"f_tummy",label:"tummy",emoji:"🫃",fringeCategory:"body" },
  { id:"f_mouth",label:"mouth",emoji:"👄",fringeCategory:"body" },
  { id:"f_eye",label:"eye",emoji:"👁️",fringeCategory:"body" },
  { id:"f_ear",label:"ear",emoji:"👂",fringeCategory:"body" },
  { id:"f_nose",label:"nose",emoji:"👃",fringeCategory:"body" },
  { id:"f_teeth",label:"teeth",emoji:"🦷",fringeCategory:"body" },
  { id:"f_hair",label:"hair",emoji:"💇",fringeCategory:"body" },
];

const PHRASES = [
  { label: "I want", words: ["I", "want"] },
  { label: "I feel", words: ["I", "feel"] },
  { label: "Can I", words: ["can", "I"] },
  { label: "I need", words: ["I", "need"] },
  { label: "Help me", words: ["help", "I"] },
  { label: "More", words: ["more", "please"] },
  { label: "I like", words: ["I", "like"] },
  { label: "Go to", words: ["go", "to"] },
];

const DEFAULT_SETTINGS: Settings = { gridCols: 6, gridRows: 8, showEmoji: true, fontSize: "md" };
const EMOJI_SIZE: Record<string, string> = { sm: "text-2xl", md: "text-3xl", lg: "text-4xl" };
const LABEL_SIZE: Record<string, string> = { sm: "text-[11px]", md: "text-[13px]", lg: "text-[15px]" };

// ─── WordButton (3D Duolingo Style) ──────────────────────────────────────────

function WordBtn({
  word, onTap, showEmoji, fontSize, dimmed,
}: {
  word: Word | FringeWord; onTap: (l: string) => void;
  showEmoji: boolean; fontSize: string; dimmed?: boolean;
}) {
  const cat = "category" in word ? word.category : "noun";
  const c = FITZ[cat];

  return (
    <motion.button
      onClick={() => onTap(word.label)}
      whileTap={!dimmed ? { scale: 0.95, y: 4, borderBottomWidth: "2px" } : {}}
      aria-label={word.label + ", " + c.name}
      className={cn(
        "relative flex flex-col items-center justify-center p-2 rounded-2xl cursor-pointer select-none",
        "border-2 border-b-[6px]",
        "transition-all duration-75 ease-out",
        "hover:brightness-105 active:brightness-95",
        dimmed && "opacity-40 grayscale pointer-events-none border-b-2 translate-y-[4px]"
      )}
      style={{
        backgroundColor: c.bg,
        borderColor: c.border,
        color: c.text,
        boxShadow: !dimmed ? \`0 4px 0 0 \${c.border}40\` : "none",
      }}
    >
      <div className="flex flex-col items-center gap-1.5 w-full">
        {showEmoji && (
          <span className={cn(EMOJI_SIZE[fontSize], "drop-shadow-sm transform transition-transform group-hover:scale-110")} role="img" aria-hidden>
            {word.emoji}
          </span>
        )}
        <span
          className={cn(
            "font-black tracking-tight leading-tight px-1 w-full text-center line-clamp-2",
            LABEL_SIZE[fontSize]
          )}
        >
          {word.label.toUpperCase()}
        </span>
      </div>
    </motion.button>
  );
}

// ─── Floating Sentence Bar ───────────────────────────────────────────────────

function SentenceBar({
  sentence, onRemove, onBackspace, onClear,
}: {
  sentence: string[]; onRemove: (i: number) => void;
  onBackspace: () => void; onClear: () => void;
}) {
  const { speak, speaking } = useTTS();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth;
  }, [sentence.length]);

  const handlePlay = () => {
    if (sentence.length) speak(sentence.join(" "));
  };

  const wordColor = (w: string) => {
    const found = CORE.find((c) => c.label.toLowerCase() === w.toLowerCase());
    return found ? FITZ[found.category] : FITZ.noun;
  };

  return (
    <div className="px-4 mt-6 mb-2 sticky top-4 z-50">
      <div className="bg-white/95 backdrop-blur-3xl border-4 border-slate-100/50 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] rounded-[2rem] p-3 flex flex-col gap-3">
        {/* Play Button + Sentence */}
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handlePlay}
            disabled={!sentence.length || speaking}
            className={cn(
              "shrink-0 h-16 w-16 rounded-[1.25rem] flex items-center justify-center transition-all",
              "bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg",
              "disabled:opacity-40 disabled:grayscale disabled:shadow-none hover:shadow-indigo-500/25",
              speaking && "animate-pulse brightness-110 shadow-indigo-500/50"
            )}
          >
            <Volume2 className="h-8 w-8" strokeWidth={2.5} />
          </motion.button>

          <div
            ref={ref}
            className="flex-1 flex items-center gap-2 overflow-x-auto min-h-[64px] py-2 scroll-smooth rounded-[1.25rem] bg-slate-50 border-2 border-slate-100 px-3"
            style={{ scrollbarWidth: "none" }}
          >
            {sentence.length === 0 ? (
              <span className="text-[17px] text-slate-400 font-bold ml-2">
                Tap words to speak...
              </span>
            ) : (
              <AnimatePresence mode="popLayout">
                {sentence.map((w, i) => {
                  const c = wordColor(w);
                  return (
                    <motion.button
                      key={w + "-" + i}
                      layout
                      initial={{ opacity: 0, scale: 0.5, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5, y: -10 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      onClick={() => onRemove(i)}
                      className="inline-flex items-center px-4 py-3 rounded-[1rem] text-[16px] font-black uppercase tracking-tight whitespace-nowrap cursor-pointer hover:scale-105 active:scale-95 transition-transform border-b-[4px] shrink-0"
                      style={{
                        backgroundColor: c.bg,
                        borderColor: c.border,
                        color: c.text,
                      }}
                    >
                      {w}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-between pl-[4.75rem]">
          <QuickBar onSelect={p => p.forEach((w,i) => setTimeout(() => handleTap(w), i*50)) /* rough mock */ } />
          
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onBackspace}
              disabled={!sentence.length}
              className="h-10 w-12 rounded-xl flex items-center justify-center bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 border-2 border-slate-200 disabled:opacity-40 transition-all border-b-4 active:border-b-2 active:translate-y-[2px]"
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={3} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onClear}
              disabled={!sentence.length}
              className="h-10 w-12 rounded-xl flex items-center justify-center bg-rose-100 text-rose-600 font-bold hover:bg-rose-200 border-2 border-rose-200 disabled:opacity-40 transition-all border-b-4 active:border-b-2 active:translate-y-[2px]"
            >
              <Trash2 className="h-5 w-5" strokeWidth={3} />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );

  // We need handleTap from parent but we mocked it above. Let's fix that.
  // We'll pass through handleTap or handlePhrase instead.
  // I notice earlier QuickBar took "onSelect" for the whole phrase.
}

// ─── QuickPhraseBar ──────────────────────────────────────────────────────────

function QuickBar({ onSelect }: { onSelect: (w: string[]) => void }) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pr-4"
      style={{ scrollbarWidth: "none" }}
    >
      {PHRASES.map((p) => (
        <motion.button
          key={p.label}
          whileTap={{ scale: 0.92, y: 2 }}
          onClick={() => onSelect(p.words)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-black tracking-wide uppercase",
            "bg-amber-100 text-amber-900 border-2 border-amber-300 border-b-4",
            "hover:bg-amber-100 active:border-b-2 active:translate-y-[2px]",
            "transition-all cursor-pointer select-none shrink-0"
          )}
        >
          <Sparkles className="h-4 w-4 text-amber-500" />
          {p.label}
        </motion.button>
      ))}
    </div>
  );
}

// ─── Category Navigation (Segmented Tabs) ────────────────────────────────────

function CatNav({
  active, onChange,
}: {
  active: string; onChange: (c: string) => void;
}) {
  const coreCats = [
    { id: "all", name: "All", accent: "#94A3B8" },
    ...Object.entries(FITZ).map(([id, v]) => ({ id, name: v.name, accent: v.border })),
  ];
  const fringeCats = Object.entries(FRINGE_META).map(([id, v]) => ({
    id, name: v.name, emoji: v.emoji,
  }));

  return (
    <div className="px-4 py-2">
      <div
        className="flex items-center gap-2.5 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "none" }}
      >
        {coreCats.map((c) => (
          <button
            key={c.id}
            onClick={() => onChange(c.id)}
            className={cn(
              "inline-flex relative items-center px-4 py-2.5 rounded-xl text-[14px] font-black whitespace-nowrap",
              "transition-all duration-200 cursor-pointer select-none shrink-0 border-2",
              active === c.id
                ? "bg-slate-800 text-white border-slate-900 shadow-md"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            {active === c.id && <motion.div layoutId="nav-pill" className="absolute inset-0 rounded-xl bg-slate-800 -z-10" />}
            {c.name}
          </button>
        ))}

        <div className="w-1.5 h-8 bg-slate-200 shrink-0 mx-2 rounded-full" />

        {fringeCats.map((c) => (
          <button
            key={c.id}
            onClick={() => onChange(c.id)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-black whitespace-nowrap border-2",
              "transition-all duration-200 cursor-pointer select-none shrink-0",
              active === c.id
                ? "bg-gradient-to-r from-orange-400 to-amber-400 text-white border-orange-500 shadow-md"
                : "bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:bg-amber-50"
            )}
          >
            <span className="text-lg">{c.emoji}</span>
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Core & Fringe Boards ────────────────────────────────────────────────────

function CoreBoard({
  settings, active, onTap,
}: {
  settings: Settings; active: string; onTap: (l: string) => void;
}) {
  const { gridCols, gridRows, showEmoji, fontSize } = settings;

  const grid = useMemo(() => {
    const cells: (Word | null)[][] = Array.from({ length: gridRows }, () =>
      Array.from({ length: gridCols }, () => null)
    );
    for (const w of CORE) {
      if (w.row < gridRows && w.col < gridCols) cells[w.row][w.col] = w;
    }
    return cells;
  }, [gridCols, gridRows]);

  const visible = useCallback(
    (w: Word) => active === "all" || w.category === active,
    [active]
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-32 pt-2">
      <div
        className="grid gap-3 sm:gap-4"
        style={{ gridTemplateColumns: \`repeat(\${gridCols}, minmax(0, 1fr))\` }}
      >
        {grid.flat().map((w, i) =>
          w ? (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.002, type: "spring", stiffness: 400, damping: 25 }}
            >
              <WordBtn word={w} onTap={onTap} showEmoji={showEmoji} fontSize={fontSize} dimmed={!visible(w)} />
            </motion.div>
          ) : (
            <div key={"e" + i} className="min-h-[80px]" />
          )
        )}
      </div>
    </div>
  );
}

function FringePage({
  category, settings, onTap, onHome,
}: {
  category: FringeCategory; settings: Settings;
  onTap: (l: string) => void; onHome: () => void;
}) {
  const words = FRINGE.filter((w) => w.fringeCategory === category);
  const meta = FRINGE_META[category];

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-32 pt-2">
      <div className="flex items-center gap-4 mb-5">
        <motion.button
          whileTap={{ scale: 0.9, y: 2 }}
          onClick={onHome}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-[15px] font-black bg-indigo-500 text-white shadow-lg shadow-indigo-200 border-2 border-indigo-600 border-b-4 hover:bg-indigo-400 active:border-b-2 active:translate-y-[2px]"
        >
          <Home className="h-5 w-5" strokeWidth={2.5} />
          CORE WORDS
        </motion.button>
        <div className="h-10 w-1 bg-slate-200 rounded-full" />
        <span className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
          <span className="text-4xl">{meta.emoji}</span> {meta.name}
        </span>
      </div>

      <div
        className="grid gap-3 sm:gap-4"
        style={{ gridTemplateColumns: \`repeat(\${Math.min(settings.gridCols, 4)}, minmax(0, 1fr))\` }}
      >
        {words.map((w, i) => (
          <motion.div
            key={w.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.015, type: "spring", stiffness: 400, damping: 25 }}
          >
            <WordBtn word={w} onTap={onTap} showEmoji={settings.showEmoji} fontSize={settings.fontSize} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Settings Modal ──────────────────────────────────────────────────────────

function SettingsModal({
  settings, onChange, onClose,
}: {
  settings: Settings; onChange: (s: Settings) => void; onClose: () => void;
}) {
  const grids = [
    { c: 3, r: 4, label: "3x4" },
    { c: 4, r: 5, label: "4x5" },
    { c: 5, r: 6, label: "5x6" },
    { c: 6, r: 8, label: "6x8" },
    { c: 6, r: 13, label: "Max" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 sm:p-0"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, scale: 0.9, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 100, scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-[2rem] shadow-2xl w-full sm:max-w-md p-6 border-4 border-slate-100"
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Settings2 className="w-8 h-8 text-indigo-500" />
            Settings
          </h2>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X className="h-6 w-6" strokeWidth={3} />
          </motion.button>
        </div>

        {/* Grid Size */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Grid3X3 className="h-5 w-5 text-slate-400" strokeWidth={2.5} />
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Layout</span>
          </div>
          <div className="flex gap-2">
            {grids.map((g) => (
              <button
                key={g.label}
                onClick={() => onChange({ ...settings, gridCols: g.c, gridRows: g.r })}
                className={cn(
                  "flex-1 py-3 rounded-xl text-[13px] font-black transition-all border-2 border-b-4",
                  settings.gridCols === g.c && settings.gridRows === g.r
                    ? "bg-indigo-500 text-white border-indigo-600 active:border-b-2 active:translate-y-[2px]"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 active:border-b-2 active:translate-y-[2px]"
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="flex items-center justify-between mb-6 p-4 rounded-[1.5rem] bg-slate-50 border-2 border-slate-100">
          <div className="flex items-center gap-3">
            {settings.showEmoji ? <Eye className="h-6 w-6 text-emerald-500" strokeWidth={2.5} /> : <EyeOff className="h-6 w-6 text-slate-400" strokeWidth={2.5} />}
            <span className="text-lg font-black text-slate-700">Show Pictures</span>
          </div>
          <button
            onClick={() => onChange({ ...settings, showEmoji: !settings.showEmoji })}
            className={cn(
              "w-16 h-9 rounded-full transition-all duration-300 relative border-2 border-transparent shadow-inner",
              settings.showEmoji ? "bg-emerald-500" : "bg-slate-300"
            )}
          >
            <span className={cn(
              "absolute top-[2px] w-7 h-7 rounded-full bg-white shadow-md transition-all duration-300 flex items-center justify-center",
              settings.showEmoji ? "left-[30px]" : "left-[2px]"
            )}>
              {settings.showEmoji && <Sparkles className="w-4 h-4 text-emerald-500" />}
            </span>
          </button>
        </div>

        {/* Font Size */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Type className="h-5 w-5 text-slate-400" strokeWidth={2.5} />
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Text Size</span>
          </div>
          <div className="flex gap-2">
            {(["sm", "md", "lg"] as const).map((s) => (
              <button
                key={s}
                onClick={() => onChange({ ...settings, fontSize: s })}
                className={cn(
                  "flex-1 py-3 rounded-xl font-black transition-all border-2 border-b-4",
                  s === "sm" && "text-sm",
                  s === "md" && "text-base",
                  s === "lg" && "text-lg",
                  settings.fontSize === s
                    ? "bg-indigo-500 text-white border-indigo-600 active:border-b-2 active:translate-y-[2px]"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 active:border-b-2 active:translate-y-[2px]"
                )}
              >
                {s === "sm" ? "Small" : s === "md" ? "Medium" : "Large"}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [sentence, setSentence] = useLocalStorage<string[]>("aac-sentence", []);
  const [active, setActive] = useState("all");
  const [settings, setSettings] = useLocalStorage<Settings>("aac-settings", DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const { speak } = useTTS();

  const handleTap = useCallback((label: string) => {
    setSentence((p) => [...p, label]);
    speak(label);
  }, [setSentence, speak]);

  const handleRemove = useCallback((i: number) => {
    setSentence((p) => p.filter((_, idx) => idx !== i));
  }, [setSentence]);

  const handlePhrase = useCallback((words: string[]) => {
    setSentence((p) => [...p, ...words]);
  }, [setSentence]);

  const isFringe = Object.keys(FRINGE_META).includes(active);

  return (
    <div
      className="min-h-screen flex flex-col font-sans selection:bg-indigo-200"
      style={{
        backgroundColor: "#F8FAFC",
        backgroundImage: 'radial-gradient(#CBD5E1 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px'
      }}
    >
      {/* We pass a specially wrapped phrase selector to the sentence bar so it can inject words */}
      <SentenceBar
        sentence={sentence}
        onRemove={handleRemove}
        onBackspace={useCallback(() => setSentence((p) => p.slice(0, -1)), [setSentence])}
        onClear={useCallback(() => setSentence([]), [setSentence])}
      />
      {/* And the actual app-wide quick phrase handler is handled inside the SentenceBar but we can also handle it differently. 
          Actually the original just had quickbar between the sentence bar and nav. Let's let SentenceBar handle it for UI cleanliness! */}

      <CatNav active={active} onChange={setActive} />

      {isFringe ? (
        <FringePage
          category={active as FringeCategory}
          settings={settings}
          onTap={handleTap}
          onHome={() => setActive("all")}
        />
      ) : (
        <CoreBoard settings={settings} active={active} onTap={handleTap} />
      )}

      {/* Floating Settings Button */}
      <motion.button
        whileTap={{ scale: 0.85, rotate: 180 }}
        whileHover={{ scale: 1.1 }}
        onClick={() => setShowSettings(true)}
        className="fixed bottom-6 right-6 z-40 h-16 w-16 rounded-full flex items-center justify-center bg-indigo-500 text-white shadow-[0_8px_30px_rgb(99,102,241,0.5)] border-4 border-indigo-400 cursor-pointer hover:bg-indigo-400 transition-colors"
      >
        <Settings2 className="h-8 w-8" strokeWidth={2.5} />
      </motion.button>

      <AnimatePresence>
        {showSettings && (
          <SettingsModal
            settings={settings}
            onChange={setSettings}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
`;
}
