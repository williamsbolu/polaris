"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function DemoPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);

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

  return (
    <div className="p-8 space-x-4">
      <Button onClick={handleBlocking} disabled={isLoading}>
        {isLoading ? "Loading..." : "Blocking"}
      </Button>
      <Button onClick={handleBackground} disabled={isBackgroundLoading}>
        {isBackgroundLoading ? "Loading..." : "Background"}
      </Button>
    </div>
  );
}
