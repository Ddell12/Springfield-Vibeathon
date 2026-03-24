import { ChevronDown,Lightbulb } from "lucide-react";

type ThinkingStateProps = {
  status: string;
  time?: string;
  plan?: string;
};

export function ThinkingState({ status, time, plan }: ThinkingStateProps) {
  return (
    <div className="flex w-full justify-start mb-8 pl-1">
      <div className="flex flex-col gap-3 max-w-full">
        <div className="flex items-center gap-2 text-muted text-sm font-medium">
          <Lightbulb size={16} />
          <span>{status === "Thinking..." && time ? `Thought for ${time}` : status}</span>
        </div>
        
        {plan && (
          <div className="flex flex-col gap-2">
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {plan === "Building your tool — this takes about 15 seconds..." 
                ? "I'll create a stunning design based on your request. Setting up components and assembling the page layout..."
                : plan}
            </div>
            
            <button className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-foreground transition-colors self-start mt-1">
              <ChevronDown size={14} />
              <span>Features for V1</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
