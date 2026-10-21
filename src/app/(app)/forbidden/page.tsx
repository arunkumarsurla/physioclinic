import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { btn } from "@/components/ui";

export const metadata = { title: "No access" };

export default async function Forbidden() {
  await requireUser();
  return (
    <div className="mx-auto mt-16 max-w-sm px-2 text-center sm:mt-24">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-2xl" aria-hidden>🔒</div>
      <h1 className="mt-4 text-lg font-semibold">You don&apos;t have access to this page</h1>
      <p className="mt-1 text-sm text-zinc-500">Ask an administrator to update your role if you need it.</p>
      <Link href="/" className={btn("secondary") + " mt-5"}>Back to home</Link>
    </div>
  );
}
