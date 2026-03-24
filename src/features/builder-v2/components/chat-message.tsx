import { cn } from "@/core/utils";

type ChatMessageProps = {
  role: "user" | "assistant";
  content: string;
};

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "self-end bg-primary text-white rounded-br-sm"
            : "self-start bg-surface-container-low text-on-surface rounded-bl-sm assistant-message"
        )}
      >
        {content}
      </div>
    </div>
  );
}
