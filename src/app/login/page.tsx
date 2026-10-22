import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/server/settings";
import { sp } from "@/lib/utils";
import { LoginForm } from "./login-form";
import { HeartPulse } from "lucide-react";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (await getSession()) redirect("/");
  const next = sp((await searchParams).next);
  let clinic = "Clinic Manager";
  try {
    clinic = (await getSettings()).clinicName;
  } catch {
    /* database not reachable yet – still show the form */
  }
  return (
    <main className="safe-t safe-b relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-brand-100 via-[#f5faf9] to-[#e8f1f0] px-4 py-8">
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-200/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-brand-300/20 blur-3xl" />

      <section className="relative w-full max-w-[26rem] rounded-2xl border border-white/80 bg-white/95 p-7 shadow-[0_24px_70px_-30px_rgba(10,37,35,0.28)] backdrop-blur sm:p-9">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-800 text-brand-100 shadow-[0_8px_20px_-8px_rgba(21,73,67,0.65)]">
            <HeartPulse size={25} strokeWidth={1.8} aria-hidden />
          </div>
          <p className="max-w-full truncate text-sm font-medium text-zinc-500">{clinic}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">Welcome back</h1>
          <p className="mt-2 text-sm text-zinc-500">Sign in to continue</p>
        </div>

        <LoginForm next={next} />
      </section>
    </main>
  );
}
