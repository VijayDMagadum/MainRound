import Link from "next/link";
import { getDictionary, Locale } from "@/lib/i18n";
import { 
  CloudRain, 
  LayoutDashboard, 
  CheckSquare, 
  MapPin, 
  MessageSquare, 
  AlertTriangle, 
  Users, 
  RefreshCw, 
  Settings, 
  Shield, 
  Info,
  Globe
} from "lucide-react";
import HeaderControls from "@/components/layout/HeaderControls";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocalizedLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  const dict = getDictionary(locale);

  // Define navigation links with translated titles
  const navItems = [
    { href: `/${locale}/dashboard`, icon: LayoutDashboard, label: dict.nav.dashboard },
    { href: `/${locale}/preparedness`, icon: CloudRain, label: dict.nav.preparedness },
    { href: `/${locale}/checklist`, icon: CheckSquare, label: dict.nav.checklist },
    { href: `/${locale}/travel`, icon: MapPin, label: dict.nav.travel },
    { href: `/${locale}/assistant`, icon: MessageSquare, label: dict.nav.assistant },
    { href: `/${locale}/alerts`, icon: AlertTriangle, label: dict.nav.alerts },
    { href: `/${locale}/community`, icon: Users, label: dict.nav.community },
    { href: `/${locale}/recovery`, icon: RefreshCw, label: dict.nav.recovery },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 pb-20 md:pb-0">
      {/* Top Header */}
      <header className="sticky top-0 z-50 glass-card bg-slate-950/80 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <Link href={`/${locale}`} className="flex items-center gap-2 hover:opacity-90">
          <div className="bg-teal-500/20 p-1.5 rounded-lg border border-teal-500/30 text-teal-400">
            <CloudRain className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
              {dict.common.appName}
            </span>
            <span className="hidden sm:inline-block text-[10px] text-teal-500/90 font-medium ml-2 border border-teal-500/25 px-1.5 py-0.5 rounded">
              v1.0-MVP
            </span>
          </div>
        </Link>

        {/* Global Controls: Language dropdown, reset session, offline state indicator */}
        <HeaderControls locale={locale} />
      </header>

      {/* Main Grid: Sidebar for desktop, Main Content */}
      <div className="flex flex-1">
        {/* Sidebar Nav (Desktop) */}
        <aside className="hidden md:flex flex-col w-64 glass-card bg-slate-950/30 border-r border-slate-800/60 p-4 space-y-2 shrink-0">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800/50 text-slate-300 hover:text-teal-400 transition-all group"
                >
                  <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex-1"></div>

          {/* Footer controls in sidebar */}
          <div className="pt-4 border-t border-slate-900 space-y-1">
            <Link
              href={`/${locale}/settings`}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200"
            >
              <Settings className="w-4 h-4" />
              <span>{dict.nav.settings}</span>
            </Link>
            <Link
              href={`/${locale}/privacy`}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200"
            >
              <Shield className="w-4 h-4" />
              <span>{dict.nav.privacy}</span>
            </Link>
            <Link
              href={`/${locale}/about`}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200"
            >
              <Info className="w-4 h-4" />
              <span>{dict.nav.about}</span>
            </Link>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Bottom Nav Tab-bar (Mobile/Tablet UI) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-card bg-slate-950/90 border-t border-slate-850 px-2 py-2 flex items-center justify-around">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center p-1 rounded-xl text-slate-400 hover:text-teal-400 transition-all focus:text-teal-400"
            >
              <Icon className="w-5.5 h-5.5" />
              <span className="text-[9px] mt-1 font-medium text-center leading-none">{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
        {/* Alerts & More in mobile */}
        <Link
          href={`/${locale}/alerts`}
          className="flex flex-col items-center justify-center p-1 rounded-xl text-slate-400 hover:text-teal-400 transition-all focus:text-teal-400"
        >
          <AlertTriangle className="w-5.5 h-5.5" />
          <span className="text-[9px] mt-1 font-medium text-center leading-none">Alerts</span>
        </Link>
      </nav>
    </div>
  );
}
