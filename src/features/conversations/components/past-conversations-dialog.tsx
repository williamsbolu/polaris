"use client";

import ky from "ky";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import {
  useConversations,
  useDeleteConversation,
} from "../hooks/use-conversations";

import { Id } from "../../../../convex/_generated/dataModel";

interface PastConversationsDialogProps {
  projectId: Id<"projects">;
  open: boolean;
  selectedConversationId?: Id<"conversations"> | null;
  onOpenChange: (open: boolean) => void;
  onSelect: (conversationId: Id<"conversations"> | null) => void;
}

export const PastConversationsDialog = ({
  projectId,
  open,
  selectedConversationId,
  onOpenChange,
  onSelect,
}: PastConversationsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const conversations = useConversations(projectId);
  const deleteConversation = useDeleteConversation();

  const handleSelect = (conversationId: Id<"conversations">) => {
    onSelect(conversationId);
    onOpenChange(false);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Past Conversations"
      description="Search and select a past conversation"
    >
      <CommandInput placeholder="Search conversations..." />
      <CommandList>
        <CommandEmpty>No conversations found.</CommandEmpty>
        <CommandGroup heading="Conversations">
          {conversations?.map((conversation) => (
            <CommandItem
              key={conversation._id}
              value={`${conversation.title}-${conversation._id}`}
              onSelect={() => handleSelect(conversation._id)}
            >
              <div className="w-full flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span>{conversation.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(conversation._creationTime, {
                      addSuffix: true,
                    })}
                  </span>
                </div>

                <button
                  disabled={loading}
                  className="group/button"
                  onClick={async (e) => {
                    try {
                      e.stopPropagation();
                      setLoading(true);

                      await ky.post("/api/conversation/cancel", {
                        json: { conversationId: conversation._id },
                      });

                      await deleteConversation({
                        conversationId: conversation._id,
                      });
                      if (selectedConversationId === conversation._id) {
                        onSelect(null);
                      }
                    } catch {
                      toast.error("Failed to delete conversation");
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <Trash2 className="opacity-70 group-hover/button:opacity-100 transition-opacity duration-150 w-4 h-4" />
                </button>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
