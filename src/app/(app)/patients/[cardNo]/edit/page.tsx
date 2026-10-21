import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { PatientForm } from "@/components/patient-form";
import { can, requirePermission } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { getPatientByCardNo } from "@/server/patients";

export const metadata = { title: "Edit patient" };

export default async function EditPatient({ params }: { params: Promise<{ cardNo: string }> }) {
  const user = await requirePermission("patients:edit");
  const p = await getPatientByCardNo(Number((await params).cardNo));
  if (!p) notFound();
  const clinical = can(user, "clinical:edit");
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={`Edit #${p.cardNo} – ${p.name}`} back={{ href: `/patients/${p.cardNo}`, label: "Patient" }} />
      <Card>
        <PatientForm mode="edit" canClinical={clinical} cancelHref={`/patients/${p.cardNo}`} maxDate={todayISO()} defaults={{ ...p }} />
      </Card>
    </div>
  );
}
