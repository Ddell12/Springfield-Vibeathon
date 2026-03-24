"use client";

import { Hand, Pencil, Share2, Sparkles, Volume2, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/core/utils";

const CAROUSEL_ITEMS = [
  {
    icon: Share2,
    title: "Share Instantly",
    description: "Every tool gets a shareable link. Send it to your therapist, partner, or another parent — works on any device.",
    color: "from-teal-500/20 to-cyan-500/20",
    iconColor: "text-teal-500",
  },
  {
    icon: Hand,
    title: "Built for Small Hands",
    description: "Large 44px+ tap targets, high contrast, and clear visuals — designed for children's motor skills.",
    color: "from-blue-500/20 to-indigo-500/20",
    iconColor: "text-blue-500",
  },
  {
    icon: Volume2,
    title: "Talk Out Loud",
    description: "Communication boards speak with natural text-to-speech. Your child hears their request spoken aloud.",
    color: "from-purple-500/20 to-pink-500/20",
    iconColor: "text-purple-500",
  },
  {
    icon: Pencil,
    title: "Customize Anytime",
    description: "Just tell me what to change. 'Make the pictures bigger' or 'Add yogurt to the choices' — I'll update it instantly.",
    color: "from-orange-500/20 to-amber-500/20",
    iconColor: "text-orange-500",
  },
  {
    icon: WifiOff,
    title: "Works Offline-Ready",
    description: "Once loaded, tools work without an internet connection. Perfect for appointments and car rides.",
    color: "from-green-500/20 to-emerald-500/20",
    iconColor: "text-green-500",
  },
];

export function LoadingCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CAROUSEL_ITEMS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-surface">
      <div className="flex items-center gap-2 mb-12 animate-pulse">
        <Sparkles size={16} className="text-muted" />
        <span className="text-sm font-semibold text-muted">Getting ready...</span>
      </div>

      <div className="relative w-full max-w-lg aspect-video">
        {CAROUSEL_ITEMS.map((item, index) => {
          const isActive = index === currentIndex;
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className={cn(
                "absolute inset-0 flex flex-col items-center justify-center text-center transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]",
                isActive ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95 pointer-events-none"
              )}
            >
              <div className={cn("w-full h-48 rounded-2xl bg-gradient-to-br mb-8 flex items-center justify-center border border-surface-container shadow-sm", item.color)}>
                <Icon size={48} className={item.iconColor} />
              </div>
              <h3 className="text-xl font-bold text-foreground tracking-tight mb-2">{item.title}</h3>
              <p className="text-muted text-[15px] leading-relaxed max-w-md">{item.description}</p>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 mt-12">
        {CAROUSEL_ITEMS.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-500",
              index === currentIndex ? "bg-foreground w-6" : "bg-surface-container-high hover:bg-muted"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
