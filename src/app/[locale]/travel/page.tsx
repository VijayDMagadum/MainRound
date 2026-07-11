import TravelForm from "@/components/travel/TravelForm";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function TravelPage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Travel Advisory Tool</h1>
        <p className="text-xs text-slate-400 mt-1">
          Input your route to cross-analyze forecasts at departure and arrival times, and check safety windows.
        </p>
      </div>

      <TravelForm locale={locale} />
    </div>
  );
}
