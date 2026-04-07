import { inngest } from "@/inngest/client";

export async function POST() {
  await inngest.send({ name: "demo/error" });

  return Response.json({ status: "Started" });
}
