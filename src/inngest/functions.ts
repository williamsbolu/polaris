import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { inngest } from "./client";
import { firecrawl } from "@/lib/firecrawl";

const URL_REGEX = /https?:\/\/[^\s]+/g;

export const demoGenerate = inngest.createFunction(
  { id: "demo-generate", triggers: { event: "demo/generate" } },
  async ({ event, step }) => {
    const { prompt } = event.data as { prompt: string };

    const urls = (await step.run("extract-urls", async () => {
      return prompt.match(URL_REGEX) || [];
    })) as string[];

    const scrapedContent = await step.run("scrape-urls", async () => {
      const results = await Promise.all(
        urls.map(async (url) => {
          const result = await firecrawl.scrape(url, { formats: ["markdown"] });
          return result.markdown || null;
        }),
      );

      // filter out any of the null unsuccessfull scrapes
      return results.filter(Boolean).join("\n\n");
    });

    const finalPrompt = scrapedContent
      ? `Content:\n${scrapedContent}\n\nQuestion: ${prompt}`
      : prompt; // if no content is scraped, use the original prompt

    await step.run("generate-text", async () => {
      return await generateText({
        model: google("gemini-2.5-flash"),
        // model: anthropic("claude-3-5-sonnet-20240620"),  // any model from the ai sdk can be used here
        prompt: finalPrompt,
        experimental_telemetry: {
          isEnabled: true,
          recordInputs: true,
          recordOutputs: true,
        },
      });
    });
  },
);

export const demoError = inngest.createFunction(
  { id: "demo-error", triggers: { event: "demo/error" } },
  async ({ event, step }) => {
    await step.run("fail", async () => {
      throw new Error("Inngest error: Something went wrong in the Inngest");
    });
  },
);
