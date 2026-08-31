import { inngest } from "@/inngest/client";
import {
  createAgent,
  // anthropic,
  gemini,
  createNetwork,
} from "@inngest/agent-kit";
import { Id } from "../../../../convex/_generated/dataModel";
import { NonRetriableError } from "inngest";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../convex/_generated/api";
import {
  CODING_AGENT_SYSTEM_PROMPT,
  TITLE_GENERATOR_SYSTEM_PROMPT,
} from "./constants";
import { DEFAULT_CONVERSATION_TITLE } from "../constants";
import { createReadFilesTool } from "./tools/read-files";
import { createListFilesTool } from "./tools/list-files";
import { createUpdateFileTool } from "./tools/update-file";
import { createCreateFilesTool } from "./tools/create-files";
import { createCreateFolderTool } from "./tools/create-folder";
import { createRenameFileTool } from "./tools/rename-file";
import { createDeleteFilesTool } from "./tools/delete-files";
import { createScrapeUrlsTool } from "./tools/scrape-urls";

interface MessageEvent {
  messageId: Id<"messages">;
  conversationId: Id<"conversations">;
  projectId: Id<"projects">;
  message: string;
}

export const processMessage = inngest.createFunction(
  {
    id: "process-message",
    triggers: { event: "message/sent" },
    cancelOn: [
      {
        event: "message/cancel",
        // match: "data.messageId", // Cancel this job if a cancellation event is received for the same message id
        if: "event.data.messageId == async.data.messageId", // similar logic as "match" above.. "event" refers to the incoming cancel event and "async" refers to the original event that triggered the function
      },
    ],
    onFailure: async ({ event, step }) => {
      const { messageId } = event.data.event.data as MessageEvent;
      const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

      // Update the message with error content
      if (internalKey) {
        await step.run("update-message-on-failure", async () => {
          await convex.mutation(api.system.updateMessageContent, {
            internalKey,
            messageId,
            content:
              "My apologies, I encountered an error while processing your request. Let me know if you need anything else!",
          });
        });
      }
    },
  },
  async ({ event, step }) => {
    const { messageId, conversationId, projectId, message } =
      event.data as MessageEvent;

    const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

    if (!internalKey) {
      throw new NonRetriableError(
        "POLARIS_CONVEX_INTERNAL_KEY is not configured",
      );
    }

    await step.sleep("wait-for-db-sync", "1s");

    // Get conversation for title generation check
    const conversation = await step.run("get-conversation", async () => {
      return await convex.query(api.system.getConversationById, {
        internalKey,
        conversationId,
      });
    });

    if (!conversation) {
      throw new NonRetriableError("Conversation not found");
    }

    // Fetch recent messages for conversation context
    const recentMessages = await step.run("get-recent-messages", async () => {
      return await convex.query(api.system.getRecentMessages, {
        internalKey,
        conversationId: conversation._id,
        limit: 10, // 10 most recent messages // Depending on how smart our AI models get
      });
    });

    // Build system prompt with conversation history (exclude the current processing message)
    let systemPrompt = CODING_AGENT_SYSTEM_PROMPT;

    // Filter out the current processing message and empty messages // Remove it from the last 10 recent messages we have
    const contextMessages = recentMessages.filter(
      (msg) => msg._id !== messageId && msg.content.trim() !== "",
    );

    // Are there any message at all before this message
    if (contextMessages.length > 0) {
      // ASSISTANT: How can i help you?
      // USER: Do this and this
      const historyText = contextMessages
        .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join("\n\n");

      systemPrompt += `\n\n## Previous Conversation (for context only - do NOT repeat these responses):\n${historyText}\n\n## Current Request:\nRespond ONLY to the user's new message below. Do not repeat or reference your previous responses.`;
    }

    // Generate conversation title if it's still the default
    const shouldGenerateTitle =
      conversation.title === DEFAULT_CONVERSATION_TITLE;

    if (shouldGenerateTitle) {
      const titleAgent = createAgent({
        name: "title-generator",
        system: TITLE_GENERATOR_SYSTEM_PROMPT,
        // model: anthropic({
        //   model: "claude-haiku-4-5-20251001",
        //   apiKey: process.env.ANTHROPIC_API_KEY,
        //   defaultParameters: {
        //     temperature: 0,
        //     max_tokens: 50,
        //   },
        // }),
        model: gemini({
          model: "gemini-2.5-flash",
          apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
          defaultParameters: {
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 50,
            },
          },
        }),
      });

      const { output } = await titleAgent.run(message, { step });
      // console.log({ output });

      const textMessage = output.find(
        (m) => m.type === "text" && m.role === "assistant",
      );

      if (textMessage?.type === "text") {
        // console.log({ textMessage });
        const title =
          typeof textMessage.content === "string"
            ? textMessage.content.trim()
            : textMessage.content
                .map((c) => c.text.trim())
                .join("")
                .trim();

        if (title) {
          await step.run("update-conversation-title", async () => {
            await convex.mutation(api.system.updateConversationTitle, {
              internalKey,
              conversationId,
              title,
            });
          });
        }
      }
    }

    // Create the coding agent with file tools
    const codingAgent = createAgent({
      name: "polaris",
      description: "An expert AI coding assistant",
      system: systemPrompt,
      // model: anthropic({
      //   // model: "claude-opus-4-20250514",
      //   model: "claude-sonnet-4-6",
      //   defaultParameters: { temperature: 0.3, max_tokens: 16000 },
      // }),
      model: gemini({
        model: "gemini-2.5-flash",
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        defaultParameters: {
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8192,
          },
        },
      }),
      tools: [
        createListFilesTool({ internalKey, projectId }),
        createReadFilesTool({ internalKey }),
        createUpdateFileTool({ internalKey }),
        createCreateFilesTool({ internalKey, projectId }),
        createCreateFolderTool({ internalKey, projectId }),
        createRenameFileTool({ internalKey }),
        createDeleteFilesTool({ internalKey }),
        createScrapeUrlsTool(),
      ],
    });

    // Create network with single agent
    const network = createNetwork({
      name: "polaris-network",
      agents: [codingAgent],
      maxIter: 20,
      router: ({ network }) => {
        const lastResult = network.state.results.at(-1); // get the last result
        const hasTextResponse = lastResult?.output.some(
          (m) => m.type === "text" && m.role === "assistant",
        );
        const hasToolCalls = lastResult?.output.some(
          (m) => m.type === "tool_call",
        );

        // "Anthropic" outputs text AND tool calls together
        // Only stop if there's text WITHOUT tool calls (final response)
        if (hasTextResponse && !hasToolCalls) {
          return undefined;
        }
        return codingAgent;
      },
    });

    // Run the agent
    const result = await network.run(message);

    // Extract the assistant's text response from the last agent result`
    const lastResult = result.state.results.at(-1);
    console.log({ results: result.state.results });
    console.log({ output: lastResult?.output });
    const textMessage = lastResult?.output.find(
      (m) => m.type === "text" && m.role === "assistant",
    );

    let assistantResponse =
      "I processed your request. Let me know if you need anything else!";

    if (textMessage?.type === "text") {
      assistantResponse =
        typeof textMessage.content === "string"
          ? textMessage.content
          : textMessage.content.map((c) => c.text).join("");
    }

    // Update the assistant message with the response (this also sets status to completed)
    await step.run("update-assistant-message", async () => {
      await convex.mutation(api.system.updateMessageContent, {
        internalKey,
        messageId,
        content: assistantResponse,
      });
    });

    return { success: true, messageId, conversationId };
  },
);
