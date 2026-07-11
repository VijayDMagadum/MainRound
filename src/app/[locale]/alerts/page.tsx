import AlertsManager from "@/components/alerts/AlertsManager";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function AlertsPage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Alerts & Observations</h1>
        <p className="text-xs text-slate-400 mt-1">
          Review dynamic weather-hazard warnings and view crowd-sourced observations logged by citizens.
        </p>
      </div>

      <AlertsManager locale={locale} />
    </div>
  );
}
