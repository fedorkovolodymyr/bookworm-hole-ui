import { cn } from "@/lib/utils";
import type { ChatMessageResponse } from "@/lib/api/types";

export interface MessageBubbleProps {
  message: ChatMessageResponse;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-lg px-3 py-2 text-sm",
          isOwn ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {message.body}
      </div>
    </div>
  );
}
