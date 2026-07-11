import CommunityCenter from "@/components/community/CommunityCenter";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function CommunityPage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Community Coordination Toolkit</h1>
        <p className="text-xs text-slate-400 mt-1">
          Coordinate neighborhood volunteer assignments, check on vulnerable residents, and generate alert broadcast templates.
        </p>
      </div>

      <CommunityCenter />
    </div>
  );
}
