"use client";

import Link from "next/link";
import { createContext, useActionState, useContext, useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import type { ActionState } from "@/lib/action-types";
import { cn } from "@/lib/utils";
import { btn } from "@/components/ui";

export { btn };

const baseCtl =
  "block w-full rounded-control border border-zinc-300 bg-white px-3 text-base text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 disabled:bg-zinc-100 disabled:text-zinc-500 sm:text-sm";
const inputCls = cn(baseCtl, "h-10");
const selectCls = cn(baseCtl, "h-10 select-chevron");
const areaCls = cn(baseCtl, "min-h-10 py-2");

type Ctx = { errors: Record<string, string>; pending: boolean };
const FormCtx = createContext<Ctx>({ errors: {}, pending: false });

export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  cancelHref,
  resetOnSuccess = false,
  className,
  hideSubmit = false,
  submitClassName,
  stickyActions = false,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel?: string;
  cancelHref?: string;
  resetOnSuccess?: boolean;
  className?: string;
  hideSubmit?: boolean;
  submitClassName?: string;
  /** UI only: keep Save/Cancel pinned above the mobile tab bar on long forms */
  stickyActions?: boolean;
}) {
  const [state, dispatch, pending] = useActionState(action, {} as ActionState);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <FormCtx.Provider value={{ errors: state.fieldErrors ?? {}, pending }}>
      <form
        ref={ref}
        className={cn("space-y-4", className)}
        onSubmit={(e) => {
          // Submit manually so React doesn't reset the inputs when validation fails.
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => dispatch(fd));
        }}
      >
        {state.error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {state.error}
          </div>
        )}
        {state.ok && state.message && (
          <div role="status" className="rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2.5 text-sm text-brand-800 whitespace-pre-line">
            {state.message}
          </div>
        )}
        {children}
        {!hideSubmit && (
          <div
            className={cn(
              "flex items-center gap-3 pt-1",
              !stickyActions && "max-xs:flex-col-reverse max-xs:items-stretch",
              stickyActions && "no-print sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 border-t border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:pt-1 md:backdrop-blur-none",
            )}
          >
            <button type="submit" disabled={pending} className={cn(btn("primary"), stickyActions && "max-md:flex-1", submitClassName)}>
              {pending ? "Saving…" : submitLabel}
            </button>
            {cancelHref && (
              <Link href={cancelHref} className={btn("ghost")}>
                Cancel
              </Link>
            )}
          </div>
        )}
      </form>
    </FormCtx.Provider>
  );
}

function FieldShell({ label, name, hint, required, children, className }: { label: string; name: string; hint?: string; required?: boolean; children: ReactNode; className?: string }) {
  const { errors } = useContext(FormCtx);
  const err = errors[name];
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1.5 block text-[13px] font-medium text-zinc-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

type FieldProps = {
  label: string;
  name: string;
  hint?: string;
  className?: string;
  required?: boolean;
};

export function Field({
  label, name, hint, className, required, type = "text", defaultValue, ...rest
}: FieldProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "className">) {
  const { errors } = useContext(FormCtx);
  return (
    <FieldShell label={label} name={name} hint={hint} required={required} className={className}>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={!!errors[name]}
        className={cn(inputCls, errors[name] && "border-red-400")}
        {...rest}
      />
    </FieldShell>
  );
}

export function SelectField({
  label, name, hint, className, required, defaultValue, options, ...rest
}: FieldProps & { options: { value: string; label: string }[] } & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "name" | "className">) {
  const { errors } = useContext(FormCtx);
  return (
    <FieldShell label={label} name={name} hint={hint} required={required} className={className}>
      <select id={name} name={name} defaultValue={defaultValue} required={required} className={cn(selectCls, errors[name] && "border-red-400")} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function TextAreaField({
  label, name, hint, className, required, defaultValue, rows = 3, ...rest
}: FieldProps & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "className">) {
  const { errors } = useContext(FormCtx);
  return (
    <FieldShell label={label} name={name} hint={hint} required={required} className={className}>
      <textarea id={name} name={name} rows={rows} defaultValue={defaultValue} required={required} className={cn(areaCls, errors[name] && "border-red-400")} {...rest} />
    </FieldShell>
  );
}

/**
 * Toggle switch. Still a real <input type="checkbox"> underneath, so the form
 * posts exactly the same data as before (name / value / checked / disabled).
 * `CheckboxField` is kept as an alias so existing callers need no changes.
 */
export function ToggleField({ label, name, defaultChecked, hint, value, disabled, className }: { label: string; name: string; defaultChecked?: boolean; hint?: string; value?: string; disabled?: boolean; className?: string }) {
  return (
    <label className={cn("group flex cursor-pointer items-center justify-between gap-4 rounded-lg px-3 py-2.5 transition-colors hover:bg-zinc-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:hover:bg-transparent", className)}>
      <span className="min-w-0 text-sm leading-snug text-zinc-800 group-has-[:disabled]:text-zinc-500">
        {label}
        {hint && <span className="mt-0.5 block text-xs text-zinc-500">{hint}</span>}
      </span>
      <span className="relative inline-flex h-6 w-11 shrink-0">
        <input type="checkbox" role="switch" name={name} value={value} defaultChecked={defaultChecked} disabled={disabled} className="peer sr-only" />
        <span aria-hidden className="absolute inset-0 rounded-full bg-zinc-300 transition-colors duration-200 peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2 peer-disabled:opacity-50 motion-reduce:transition-none" />
        <span aria-hidden className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-5 peer-disabled:opacity-90 motion-reduce:transition-none" />
      </span>
    </label>
  );
}
export const CheckboxField = ToggleField;

/**
 * Segmented control built on radio inputs (replaces small yes/no <select>s).
 * Posts the same `name=value` pair a <select> did.
 */
export function SegmentedField({
  label, name, options, defaultValue, hint, className, disabled,
}: { label: string; name: string; options: { value: string; label: string }[]; defaultValue?: string; hint?: string; className?: string; disabled?: boolean }) {
  const { errors } = useContext(FormCtx);
  const gid = useId();
  const err = errors[name];
  return (
    <div className={className}>
      <span id={gid} className="mb-1.5 block text-[13px] font-medium text-zinc-700">{label}</span>
      <div role="radiogroup" aria-labelledby={gid} className="flex h-10 w-full gap-0.5 rounded-control bg-zinc-100 p-0.5 ring-1 ring-inset ring-zinc-200">
        {options.map((o) => (
          <label key={o.value} className="relative flex min-w-0 flex-1 cursor-pointer">
            <input type="radio" name={name} value={o.value} defaultChecked={(defaultValue ?? options[0]?.value) === o.value} disabled={disabled} className="peer sr-only" />
            <span className="flex w-full items-center justify-center truncate rounded-lg px-2 text-sm font-medium text-zinc-500 transition-[background-color,color,box-shadow] duration-150 hover:text-zinc-800 peer-checked:bg-white peer-checked:text-brand-800 peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-disabled:opacity-60 motion-reduce:transition-none">{o.label}</span>
          </label>
        ))}
      </div>
      {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

/** Button that runs a server action after a confirm() prompt (delete, archive, revoke…). */
export function ConfirmAction({
  action, fields, confirm: message, label, variant = "danger", size = "sm",
}: {
  action: (fd: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  confirm: string;
  label: string;
  variant?: "danger" | "secondary" | "ghost";
  size?: "sm" | "md";
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-stretch">
      <button
        type="button"
        disabled={pending}
        className={btn(variant, size)}
        onClick={() => {
          if (!window.confirm(message)) return;
          const fd = new FormData();
          for (const [k, v] of Object.entries(fields)) fd.set(k, v);
          setError(null);
          start(async () => {
            const r = await action(fd);
            if (r.error) setError(r.error);
          });
        }}
      >
        {pending ? "…" : label}
      </button>
      {error && <span className="mt-1 text-xs text-red-600">{error}</span>}
    </span>
  );
}

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={cn(btn("secondary"), "no-print")}>
      {label}
    </button>
  );
}

type Hit = { id: string; cardNo: number; name: string; address: string | null; phone: string | null; balance: number };

/** Type-ahead patient search. Submits the chosen patient's id in a hidden input. */
export function PatientPicker({
  name = "patientId", initial, label = "Patient", autoFocus,
}: {
  name?: string;
  initial?: { id: string; text: string } | null;
  label?: string;
  autoFocus?: boolean;
}) {
  const { errors } = useContext(FormCtx);
  const [selected, setSelected] = useState(initial ?? null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const listId = useId();

  useEffect(() => {
    if (q.trim().length < 1) {
      setHits([]);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/patients/search?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        if (r.ok) setHits((await r.json()).results);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  return (
    <div className="relative">
      <label className="mb-1.5 block text-[13px] font-medium text-zinc-700">
        {label} <span className="text-red-600">*</span>
      </label>
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      {selected ? (
        <div className="flex min-h-10 items-center justify-between gap-3 rounded-control border border-brand-300 bg-brand-50 px-3 py-1.5 text-sm">
          <span className="min-w-0 truncate font-medium text-brand-900">{selected.text}</span>
          <button type="button" className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-brand-800 hover:bg-brand-100" onClick={() => { setSelected(null); setQ(""); }}>
            change
          </button>
        </div>
      ) : (
        <>
          <input
            type="search"
            autoFocus={autoFocus}
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Type name, card no. or phone…"
            aria-controls={listId}
            className={cn(inputCls, errors[name] && "border-red-400")}
            autoComplete="off"
          />
          {open && q.trim() && (
            <ul id={listId} className="absolute z-20 mt-1.5 max-h-72 w-full overflow-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-lift">
              {loading && hits.length === 0 && <li className="px-3 py-2 text-xs text-zinc-400">Searching…</li>}
              {!loading && hits.length === 0 && <li className="px-3 py-2 text-xs text-zinc-400">No patient found</li>}
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-zinc-50 focus-visible:bg-zinc-50"
                    onClick={() => { setSelected({ id: h.id, text: `#${h.cardNo} · ${h.name}` }); setOpen(false); }}
                  >
                    <span>
                      <span className="font-medium">#{h.cardNo} {h.name}</span>
                      <span className="block text-xs text-zinc-500">{[h.address, h.phone].filter(Boolean).join(" · ")}</span>
                    </span>
                    {h.balance > 0 && <span className="shrink-0 text-xs font-medium text-amber-700">due ₹{Math.round(h.balance).toLocaleString("en-IN")}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {errors[name] && <p className="mt-1 text-xs text-red-600">{errors[name]}</p>}
    </div>
  );
}
