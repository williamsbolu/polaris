import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { inngest } from "@/inngest/client";
import { convex } from "@/lib/convex-client";

import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

const requestSchema = z.object({
  conversationId: z.string(),
});

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { conversationId } = requestSchema.parse(body);

  const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    return NextResponse.json(
      { error: "Internal key not configured" },
      { status: 500 },
    );
  }

  // Find the processing message in this conversation
  const [processingMsg] = await convex.query(
    api.system.getProcessingMessagesByConversation,
    {
      internalKey,
      conversationId: conversationId as Id<"conversations">,
    },
  );

  // If there are no processing messages, we break execution.
  if (!processingMsg) {
    return NextResponse.json({ success: true, cancelled: false });
  }

  // Cancel the processing message
  await inngest.send({
    name: "message/cancel",
    data: {
      messageId: processingMsg._id,
    },
  });

  await convex.mutation(api.system.updateMessageStatus, {
    internalKey,
    messageId: processingMsg._id,
    status: "cancelled",
  });

  return NextResponse.json({
    success: true,
    cancelled: true,
    messageId: processingMsg._id,
  });
}
