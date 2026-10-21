import Link from "next/link";
import { btn } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-4 text-center">
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="mt-1 text-sm text-zinc-500">The page you are looking for doesn&apos;t exist or was removed.</p>
      <Link href="/" className={btn("secondary") + " mt-5"}>Go home</Link>
    </main>
  );
}
