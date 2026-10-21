"use client";

import { btn } from "@/components/ui";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-sm px-2 text-center sm:mt-24">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="mt-1 text-sm text-zinc-500">The page could not be loaded. Please try again.</p>
      <button onClick={reset} className={btn("primary") + " mt-5"}>Try again</button>
    </div>
  );
}
