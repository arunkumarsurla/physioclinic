import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/server/settings";
import { sp } from "@/lib/utils";
import { LoginForm } from "./login-form";

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
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
      <aside className="relative hidden overflow-hidden bg-brand-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-400/20 text-lg font-semibold text-brand-200 ring-1 ring-inset ring-white/10">+</div>
          <span className="text-lg font-semibold">{clinic}</span>
        </div>
        <div className="max-w-md">
          <p className="text-balance text-3xl font-semibold leading-snug">Patients, sittings and payments in one calm place.</p>
          <p className="mt-3 text-sm text-brand-100/70">Sign in to continue to today&apos;s register.</p>
        </div>
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full border border-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-10 -right-10 h-72 w-72 rounded-full border border-white/10" />
      </aside>
      <section className="safe-t safe-b flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-7 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-800 text-xl font-semibold text-brand-100">+</div>
            <h1 className="text-xl font-semibold">{clinic}</h1>
            <p className="mt-0.5 text-sm text-zinc-500">Sign in to continue</p>
          </div>
          <div className="mb-6 hidden lg:block">
            <h1 className="text-2xl font-semibold">Sign in</h1>
            <p className="mt-1 text-sm text-zinc-500">Use the username and password your administrator gave you.</p>
          </div>
          <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-card sm:p-6">
            <LoginForm next={next} />
          </div>
        </div>
      </section>
    </main>
  );
}
