import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export async function POST() {
  const response = await generateText({
    model: google("gemini-2.5-flash"),
    // model: anthropic("claude-3-5-sonnet-20240620"),  // any model from the ai sdk can be used here
    prompt: "Write a vegetarian lasagna recipe for 4 people.",
  });

  return Response.json({ response });
}

// const google = createGoogleGenerativeAI({   // custom setting or configuration
//   apiKey: "GOOGLE_GENERATIVE_AI_API_KEY",
// });
