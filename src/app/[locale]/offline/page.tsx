import Link from "next/link";
import { AlertTriangle, WifiOff, Phone, Clipboard, ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function OfflinePage({ params }: PageProps) {
  const { locale } = await params;
  
  const isHi = locale === "hi";
  const isMr = locale === "mr";

  const title = isHi ? "आप ऑफ़लाइन हैं" : isMr ? "तुम्ही ऑफलाईन आहात" : "You are Offline";
  const desc = isHi 
    ? "मानसून साथी वर्तमान में इंटरनेट से कनेक्ट नहीं हो सकता है। आपकी पहले से सेव की गई जानकारी उपलब्ध है।" 
    : isMr
    ? "पावसाळा साथी सध्या इंटरनेटशी कनेक्ट करू शकत नाही. तुमची आधी सेव्ह केलेली माहिती उपलब्ध आहे."
    : "Monsoon Saathi cannot connect to the internet. However, your critical safety resources are saved locally.";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-6 shadow-2xl">
        <div className="flex justify-center">
          <div className="bg-amber-950/40 p-4 rounded-full border border-amber-900/50 text-amber-500 animate-pulse">
            <WifiOff className="w-16 h-16" />
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>

        <div className="border-t border-slate-850 my-2"></div>

        {/* Offline Safety Quick Cards */}
        <div className="space-y-3 text-left">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider px-1">
            {isHi ? "ऑफ़लाइन उपलब्ध सुविधाएँ" : isMr ? "ऑफलाईन उपलब्ध गोष्टी" : "Available Offline"}
          </h2>
          
          <div className="flex items-start gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-850">
            <Clipboard className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-slate-200">
                {isHi ? "सुरक्षा चेकलिस्ट और योजना" : isMr ? "सुरक्षा चेकलिस्ट आणि प्लॅन" : "Emergency Checklist & Plans"}
              </h3>
              <p className="text-xs text-slate-400">View and update your saved preparedness checkpoints.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-850">
            <Phone className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-slate-200">
                {isHi ? "आपत्कालीन नंबर" : isMr ? "आपत्कालीन फोन नंबर्स" : "Emergency Contacts"}
              </h3>
              <p className="text-xs text-slate-400">Dial saved community and local authority contacts.</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-start gap-3 text-left">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-xs text-slate-400">
            <strong>{isHi ? "आधिकारिक चेतावनी" : isMr ? "अधिकृत इशारे" : "Official Notice"}:</strong>{" "}
            Offline forecasts may not reflect active cloud bursts. Tune in to local FM radio for state broadcasts.
          </div>
        </div>

        <div className="pt-2">
          <Link
            href={`/${locale}/dashboard`}
            className="inline-flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300 font-medium transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            {isHi ? "डैशबोर्ड पर वापस जाएं" : isMr ? "डॅशबोर्डवर परत जा" : "Back to Dashboard"}
          </Link>
        </div>
      </div>
    </div>
  );
}
