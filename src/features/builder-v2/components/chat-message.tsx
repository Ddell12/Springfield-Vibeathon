import { DesignPlan } from "./design-plan";
import { FileProgress } from "./file-progress";
import type { ProgressPhase } from "./file-progress";
import { ThinkingState } from "./thinking-state";

export type MessageType = "text" | "thinking" | "plan" | "building" | "complete";

type ChatMessageProps = {
  role: "user" | "assistant";
  content: string;
  type?: MessageType;
  progressPhase?: ProgressPhase;
};

export function ChatMessage({ role, content, type, progressPhase }: ChatMessageProps) {
  if (role === "assistant") {
    if (type === "thinking") {
      return <ThinkingState status="Thinking..." isComplete={false} plan={content} />;
    }

    if (type === "building") {
      return <FileProgress progressPhase={progressPhase ?? "started"} />;
    }

    if (type === "plan") {
      return <DesignPlan content={content} />;
    }

    // type === "complete" | type === "text" | type === undefined
    return (
      <div className="flex w-full justify-start mb-6">
        <div className="max-w-full text-sm leading-relaxed whitespace-pre-wrap text-on-surface">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-start mb-6 w-[90%]">
      <div className="w-full rounded-2xl bg-[#f4f4f5] dark:bg-[#27272a] px-5 py-4 text-[15px] leading-relaxed whitespace-pre-wrap text-foreground shadow-sm">
        {content}
      </div>
    </div>
  );
}
