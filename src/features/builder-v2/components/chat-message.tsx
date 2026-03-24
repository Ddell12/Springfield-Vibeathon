import { ThinkingState } from "./thinking-state";

type ChatMessageProps = {
  role: "user" | "assistant";
  content: string;
};

export function ChatMessage({ role, content }: ChatMessageProps) {

  if (role === "assistant" && content.includes("Building your tool")) {
    return <ThinkingState status="Thinking..." time="30s" plan={content} />;
  }

  if (role === "assistant" && content.includes("Updating your tool")) {
    return <ThinkingState status="Thinking..." time="15s" plan={content} />;
  }

  if (role === "assistant") {
    // Only show assistant messages that aren't the building/thinking state occasionally
    // In lovables UI, standard assistant messages are rare, mostly just the user prompts and the preview.
    // For the welcome message:
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
