"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/nextjs";

export default function DemoPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const { userId } = useAuth();

  const handleBlocking = async () => {
    setIsLoading(true);

    const response = await fetch("/api/demo/blocking", {
      method: "POST",
    });

    const data = await response.json();
    console.log(data);

    setIsLoading(false);
  };

  const handleBackground = async () => {
    setIsBackgroundLoading(true);

    const response = await fetch("/api/demo/unblocking", {
      method: "POST",
    });

    const data = await response.json();
    console.log(data);

    setIsBackgroundLoading(false);
  };

  const handleClientError = () => {
    Sentry.logger.info("User attempting to click on client function", {
      userId, // this user attempted to click the client error button
    });

    throw new Error("Client error: Something went wrong in the browser");
  };

  const handleApiError = async () => {
    await fetch("/api/demo/error", {
      method: "POST",
    });
  };

  const handleInngestError = async () => {
    await fetch("/api/demo/inngest-error", {
      method: "POST",
    });
  };

  return (
    <div className="p-8 space-x-4">
      <Button onClick={handleBlocking} disabled={isLoading}>
        {isLoading ? "Loading..." : "Blocking"}
      </Button>
      <Button onClick={handleBackground} disabled={isBackgroundLoading}>
        {isBackgroundLoading ? "Loading..." : "Background"}
      </Button>

      <Button variant={"destructive"} onClick={handleClientError}>
        Client Error
      </Button>
      <Button variant={"destructive"} onClick={handleApiError}>
        API Error
      </Button>
      <Button variant={"destructive"} onClick={handleInngestError}>
        Inngest Error
      </Button>
    </div>
  );
}
