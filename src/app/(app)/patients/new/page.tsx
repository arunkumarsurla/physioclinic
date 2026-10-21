import { Card, PageHeader } from "@/components/ui";
import { PatientForm } from "@/components/patient-form";
import { can, requirePermission } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { getSettings } from "@/server/settings";

export const metadata = { title: "New patient" };

export default async function NewPatient() {
  const user = await requirePermission("patients:create");
  const settings = await getSettings();
  const today = todayISO();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Register new patient" subtitle="A card number is assigned automatically." back={{ href: "/patients", label: "Patients" }} />
      <Card>
        <PatientForm mode="create" canClinical={can(user, "clinical:edit")} cancelHref="/patients" maxDate={today} defaults={{ registeredOn: today, cardFee: settings.defaultCardFee }} />
      </Card>
    </div>
  );
}
