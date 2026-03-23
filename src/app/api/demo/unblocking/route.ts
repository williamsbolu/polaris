import { inngest } from "@/inngest/client";

export async function POST() {
  await inngest.send({
    name: "demo/generate",
    data: {},
  });

  return Response.json({ status: "started" });
}

// const google = createGoogleGenerativeAI({   // custom setting or configuration
//   apiKey: "GOOGLE_GENERATIVE_AI_API_KEY",
// });
