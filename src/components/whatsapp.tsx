import { btn, linkAction } from "@/components/ui";
import { cn } from "@/lib/utils";
import { WA_KIND_LABELS, normalizePhone, type WaKind } from "@/lib/whatsapp";

/** Speech-bubble glyph (inline so there is nothing extra to load). */
export function WaIcon({ className }: { className?: string }) {
  return (
   
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label="WhatsApp"
    >
      <path
        fill="#25D366"
        d="M24 3.5C12.7 3.5 3.5 12.6 3.5 23.8c0 3.6.95 7.1 2.75 10.2L3.4 44.5l10.75-2.8a20.6 20.6 0 0 0 9.85 2.5h.01c11.25 0 20.45-9.15 20.5-20.4A20.4 20.4 0 0 0 24 3.5Z"
      />
      <path
        fill="#FFFFFF"
        d="M18.05 13.4c-.45-1.02-.92-1.04-1.35-1.06l-1.15-.02c-.4 0-1.05.15-1.6.75-.55.6-2.1 2.05-2.1 5s2.15 5.8 2.45 6.2c.3.4 4.15 6.65 10.25 9.05 5.05 1.98 6.08 1.59 7.17 1.49 1.1-.1 3.55-1.45 4.05-2.85.5-1.4.5-2.6.35-2.85-.15-.25-.55-.4-1.15-.7-.6-.3-3.55-1.75-4.1-1.95-.55-.2-.95-.3-1.35.3-.4.6-1.55 1.95-1.9 2.35-.35.4-.7.45-1.3.15-.6-.3-2.55-.94-4.85-3-1.8-1.6-3.02-3.57-3.37-4.17-.35-.6-.04-.93.26-1.23.27-.27.6-.7.9-1.05.3-.35.4-.6.6-1 .2-.4.1-.75-.05-1.05-.15-.3-1.3-3.25-1.76-4.41Z"
      />
    </svg>
  );
}

type Props = {
  cardNo: number;
  kind: WaKind;
  /** The patient's phone field – used only to decide whether a button can be shown. */
  phone: string | null;
  countryCode: string;
  /** Required for receipts: the sitting date whose payment is being acknowledged. */
  date?: string;
  label?: string;
  /** button: bordered; action: small text link for table rows; icon: bare icon next to a number */
  variant?: "button" | "action" | "icon";
};

/**
 * Server-rendered link to /api/whatsapp/<card>?kind=…  The route re-checks the
 * session and permissions, builds the message from live data, writes the audit
 * log and redirects to WhatsApp. Renders nothing when the patient has no usable
 * mobile number (except as a muted note for the "button" variant).
 */
export function WhatsAppLink({ cardNo, kind, phone, countryCode, date, label, variant = "button" }: Props) {
  const text = label ?? WA_KIND_LABELS[kind];
  if (!normalizePhone(phone, countryCode)) {
    return variant === "button" ? (
      <span className={cn(btn("secondary"), "cursor-not-allowed opacity-50")} title="No valid mobile number on file" aria-disabled>
        <WaIcon /> {text}
      </span>
    ) : null;
  }
  const href = `/api/whatsapp/${cardNo}?kind=${kind}${date ? `&date=${date}` : ""}`;
  const common = { href, target: "_blank", rel: "noopener noreferrer" } as const;

  if (variant === "icon")
    return (
      <a {...common} title={`${text} on WhatsApp`} aria-label={`${text} on WhatsApp`} className="no-print inline-flex h-7 w-7 items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-500">
        <WaIcon />
      </a>
    );
  if (variant === "action")
    return (
      <a {...common} title={`${text} on WhatsApp`} className={cn(linkAction, "no-print gap-1 text-emerald-700! hover:bg-emerald-50!")}>
        <WaIcon className="h-3.5 w-3.5" /> {text}
      </a>
    );
  return (
    <a {...common} className={cn(btn("whatsapp"), "no-print")}>
      <WaIcon /> {text}
    </a>
  );
}
