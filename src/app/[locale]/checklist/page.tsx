import ChecklistDashboard from "@/components/checklist/ChecklistDashboard";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ChecklistPage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Emergency Checklist</h1>
        <p className="text-xs text-slate-400 mt-1">
          Monitor your supply preparedness status. Task requirements adjust automatically to household member numbers.
        </p>
      </div>

      <ChecklistDashboard locale={locale} />
    </div>
  );
}
