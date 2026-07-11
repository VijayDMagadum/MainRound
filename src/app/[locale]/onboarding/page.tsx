"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  MapPin, 
  Home, 
  Users, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Sparkles, 
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check
} from "lucide-react";

// Form Zod Schema
const ContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
});

const OnboardingFormSchema = z.object({
  // Location
  locationName: z.string().min(1, "Please search and select a primary location"),
  latitude: z.number(),
  longitude: z.number(),
  dwellingType: z.enum(["apartment", "house", "temporary", "hostel", "other"]),
  floorLevel: z.number().min(0, "Floor level cannot be negative"),
  waterloggingProne: z.boolean().default(false),
  nearHazardSource: z.boolean().default(false),
  hasUpperFloor: z.boolean().default(false),
  
  // Household
  adults: z.number().min(1, "At least 1 adult required"),
  children: z.number().min(0),
  olderAdults: z.number().min(0),
  pets: z.boolean().default(false),
  accessibilityNeeds: z.boolean().default(false),
  medicalPowerDependent: z.boolean().default(false),
  
  // Transit & Contacts
  vehicleAvailable: z.enum(["none", "2wheeler", "4wheeler"]),
  preferredTravelMode: z.enum(["public", "private"]),
  emergencyContacts: z.array(ContactSchema).default([]),
  preferredLanguage: z.enum(["en", "hi", "mr"]),
});

type OnboardingFormData = z.infer<typeof OnboardingFormSchema>;

export default function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const router = useRouter();
  const [locale, setLocale] = useState("en");
  const [currentStep, setCurrentStep] = useState(1);
  const [cityQuery, setCityQuery] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<any[]>([]);
  const [searchingCities, setSearchingCities] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Await page params
  useEffect(() => {
    params.then((p) => {
      setLocale(p.locale);
      setValue("preferredLanguage", p.locale as any);
    });
  }, [params]);

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<any>({
    resolver: zodResolver(OnboardingFormSchema),
    defaultValues: {
      locationName: "",
      latitude: 0,
      longitude: 0,
      dwellingType: "apartment",
      floorLevel: 0,
      waterloggingProne: false,
      nearHazardSource: false,
      hasUpperFloor: false,
      adults: 1,
      children: 0,
      olderAdults: 0,
      pets: false,
      accessibilityNeeds: false,
      medicalPowerDependent: false,
      vehicleAvailable: "none",
      preferredTravelMode: "public",
      emergencyContacts: [{ name: "Local Helpline", phone: "1077" }],
      preferredLanguage: "en",
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "emergencyContacts"
  });

  // Watch location to display
  const watchedLocationName = watch("locationName");

  // Geocoding search effect
  useEffect(() => {
    if (cityQuery.trim().length < 2) {
      setCitySuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setSearchingCities(true);
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery)}&count=5&language=en&format=json`);
        const data = await res.json();
        if (data.results) {
          setCitySuggestions(data.results);
        } else {
          setCitySuggestions([]);
        }
      } catch (err) {
        console.error("Geocoding search failed:", err);
      } finally {
        setSearchingCities(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [cityQuery]);

  // Form submission handler
  const onSubmit = async (data: OnboardingFormData) => {
    setSubmitting(true);
    try {
      // 1. Save Profile
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Failed to save profile on server");
      }

      const savedProfile = await res.json();

      // 2. Set saved primary location
      await fetch("/api/cron/check-alerts?token=", { // trigger initial weather snap cache
        method: "GET"
      }).catch(() => {});

      // Add a primary saved location record in the database
      const locRes = await fetch("/api/profile/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.locationName,
          latitude: data.latitude,
          longitude: data.longitude,
          isPrimary: true
        })
      });

      // Clear any cached plans to force regeneration
      localStorage.removeItem("preparednessPlan");

      // Redirect to dashboard
      router.push(`/${data.preferredLanguage}/dashboard`);
    } catch (err) {
      console.error(err);
      alert("Something went wrong saving your onboarding details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Seed Demo Profile
  const handleSeedDemo = async () => {
    setSubmitting(true);
    const demoData: OnboardingFormData = {
      locationName: "Mumbai, Maharashtra, India",
      latitude: 19.0760,
      longitude: 72.8777,
      dwellingType: "apartment",
      floorLevel: 0, // ground floor
      waterloggingProne: true, // flood prone
      nearHazardSource: true, // open drain
      hasUpperFloor: true, // has shelter
      adults: 2,
      children: 1,
      olderAdults: 1,
      pets: true,
      accessibilityNeeds: true, // older adult has mobility needs
      medicalPowerDependent: true, // dependent equipment
      vehicleAvailable: "4wheeler",
      preferredTravelMode: "private",
      emergencyContacts: [
        { name: "Suresh (Neighbor)", phone: "9876543210" },
        { name: "BMC Disaster Helpline", phone: "1916" }
      ],
      preferredLanguage: locale as any,
    };

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demoData),
      });

      if (res.ok) {
        // Save demo primary location
        await fetch("/api/profile/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: demoData.locationName,
            latitude: demoData.latitude,
            longitude: demoData.longitude,
            isPrimary: true
          })
        });

        // Trigger weather snapshot caching
        await fetch("/api/cron/check-alerts").catch(() => {});
        
        router.push(`/${locale}/dashboard`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 3));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  return (
    <div className="max-w-2xl mx-auto py-4 md:py-8 px-4">
      {/* Wizard Progress Header */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center flex-1 last:flex-initial">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${
              currentStep === step 
                ? "bg-teal-500 text-slate-950 border-teal-500 shadow-lg shadow-teal-500/20"
                : currentStep > step
                ? "bg-slate-900 border-teal-500 text-teal-400"
                : "bg-slate-950 border-slate-800 text-slate-500"
            }`}>
              {currentStep > step ? <Check className="w-4 h-4" /> : step}
            </div>
            {step < 3 && (
              <div className={`h-0.5 flex-1 mx-2 ${
                currentStep > step ? "bg-teal-500/50" : "bg-slate-850"
              }`}></div>
            )}
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl relative">
        {/* Onboarding Intro */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <MapPin className="text-teal-400 w-5 h-5" />
                Step 1: Set Primary Location & Structure
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Enter your town or locality. This allows us to fetch live forecasts. Your coordinates are never shared with third parties.
              </p>
            </div>

            {/* Location Search Bar */}
            <div className="space-y-2 relative">
              <label htmlFor="onboarding-city-search" className="text-xs text-slate-300 font-semibold">City or Town Name</label>
              <input
                id="onboarding-city-search"
                type="text"
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                placeholder="Search e.g. Mumbai, Pune, Thane..."
                className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
              />
              
              {searchingCities && (
                <div className="absolute right-3 top-9">
                  <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                </div>
              )}

              {/* Suggestions dropdown */}
              {citySuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-1 divide-y divide-slate-850">
                  {citySuggestions.map((city) => (
                    <button
                      key={`${city.latitude}-${city.longitude}`}
                      type="button"
                      onClick={() => {
                        const name = `${city.name}, ${city.admin1 || ""}, ${city.country}`;
                        setValue("locationName", name);
                        setValue("latitude", city.latitude);
                        setValue("longitude", city.longitude);
                        setCityQuery("");
                        setCitySuggestions([]);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-350 hover:text-teal-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-between"
                    >
                      <span>{city.name}, {city.admin1} ({city.country})</span>
                      <span className="text-[10px] text-slate-500 font-mono">Lat: {city.latitude.toFixed(2)}, Lon: {city.longitude.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}

              {watchedLocationName && (
                <div className="bg-teal-950/20 border border-teal-500/30 rounded-xl p-3 flex items-center gap-2 text-xs text-teal-400">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Selected: <strong>{watchedLocationName}</strong></span>
                </div>
              )}
              {errors.locationName && (
                <span className="text-[10px] text-red-400">{errors.locationName.message?.toString()}</span>
              )}
            </div>

            {/* Dwelling type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="onboarding-dwelling-type" className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-slate-400" /> Dwelling Type
                </label>
                <select
                  id="onboarding-dwelling-type"
                  {...register("dwellingType")}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:border-teal-500 outline-none"
                >
                  <option value="apartment">Apartment / Flat</option>
                  <option value="house">Independent House</option>
                  <option value="temporary">Informal or Temporary Structure</option>
                  <option value="hostel">Hostel / Dormitory</option>
                  <option value="other">Other Structure</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="onboarding-floor-level" className="text-xs text-slate-300 font-semibold">Floor Level</label>
                <input
                  id="onboarding-floor-level"
                  type="number"
                  {...register("floorLevel", { valueAsNumber: true })}
                  placeholder="0 for Ground floor"
                  className="w-full glass-input px-3 py-2 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Dwelling checkboxes */}
            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-900 hover:border-slate-800/80 rounded-xl transition-all cursor-pointer">
                <input
                  type="checkbox"
                  {...register("waterloggingProne")}
                  className="mt-0.5 w-4 h-4 text-teal-500 rounded accent-teal-500 border-slate-700 bg-slate-900 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-200 block">Waterlogging Prone Location</span>
                  <span className="text-slate-400 block mt-0.5">This dwelling or immediate street experiences water accumulation during normal downpours.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-900 hover:border-slate-800/80 rounded-xl transition-all cursor-pointer">
                <input
                  type="checkbox"
                  {...register("nearHazardSource")}
                  className="mt-0.5 w-4 h-4 text-teal-500 rounded accent-teal-500 border-slate-700 bg-slate-900 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-200 block">Near Hazard Hazards</span>
                  <span className="text-slate-400 block mt-0.5">Dwelling lies near rivers, storm channels, open drainage channels, unstable slopes, or sea coasts.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-900 hover:border-slate-800/80 rounded-xl transition-all cursor-pointer">
                <input
                  type="checkbox"
                  {...register("hasUpperFloor")}
                  className="mt-0.5 w-4 h-4 text-teal-500 rounded accent-teal-500 border-slate-700 bg-slate-900 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-200 block">Access to Safe Height</span>
                  <span className="text-slate-400 block mt-0.5">I have easy access to a secure upper level or safe terrace in case of flash floods.</span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Step 2: Household Profile */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Users className="text-teal-400 w-5 h-5" />
                Step 2: Household Composition & Needs
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Tell us about your household size and special needs. This helps us calculate required supply stocks (like liters of water) and draft safety tasks.
              </p>
            </div>

            {/* Grid for members count */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label htmlFor="onboarding-adults" className="text-[10px] text-slate-350 uppercase tracking-wider font-semibold">Adults</label>
                <input
                  id="onboarding-adults"
                  type="number"
                  {...register("adults", { valueAsNumber: true })}
                  className="w-full glass-input px-3 py-2 text-xs rounded-xl"
                />
                {errors.adults && <span className="text-[9px] text-red-400">{errors.adults.message?.toString()}</span>}
              </div>
              <div className="space-y-1">
                <label htmlFor="onboarding-children" className="text-[10px] text-slate-350 uppercase tracking-wider font-semibold">Children</label>
                <input
                  id="onboarding-children"
                  type="number"
                  {...register("children", { valueAsNumber: true })}
                  className="w-full glass-input px-3 py-2 text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="onboarding-elders" className="text-[10px] text-slate-350 uppercase tracking-wider font-semibold">Elders</label>
                <input
                  id="onboarding-elders"
                  type="number"
                  {...register("olderAdults", { valueAsNumber: true })}
                  className="w-full glass-input px-3 py-2 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-900 hover:border-slate-800/80 rounded-xl transition-all cursor-pointer">
                <input
                  type="checkbox"
                  {...register("pets")}
                  className="mt-0.5 w-4 h-4 text-teal-500 rounded accent-teal-500 border-slate-700 bg-slate-900 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-200 block">We have pets</span>
                  <span className="text-slate-400 block mt-0.5">Ensures preparedness plans detail pet rations, dry resting areas, and collar identification advice.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-900 hover:border-slate-800/80 rounded-xl transition-all cursor-pointer">
                <input
                  type="checkbox"
                  {...register("accessibilityNeeds")}
                  className="mt-0.5 w-4 h-4 text-teal-500 rounded accent-teal-500 border-slate-700 bg-slate-900 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-200 block">Accessibility / Mobility limitations</span>
                  <span className="text-slate-400 block mt-0.5">Customize evacuations for those requiring wheelchairs, walking support, or sensory assistance.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-900 hover:border-slate-800/80 rounded-xl transition-all cursor-pointer">
                <input
                  type="checkbox"
                  {...register("medicalPowerDependent")}
                  className="mt-0.5 w-4 h-4 text-teal-500 rounded accent-teal-500 border-slate-700 bg-slate-900 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-200 block">Power-Dependent Medical Equipment</span>
                  <span className="text-slate-400 block mt-0.5">Critical: Household depends on electrical devices like nebulizers, oxygen, or ventilators. Wires backup power tasks.</span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Step 3: Transit & Contacts */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="text-teal-400 w-5 h-5" />
                Step 3: Transit & Emergency Helplines
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Final checks. Let us know how you commute so we can outline driving/public transit advisories, and save your emergency contacts offline.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="onboarding-vehicle" className="text-xs text-slate-300 font-semibold">Available Household Vehicles</label>
                <select
                  id="onboarding-vehicle"
                  {...register("vehicleAvailable")}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:border-teal-500 outline-none"
                >
                  <option value="none">No vehicle</option>
                  <option value="2wheeler">Two Wheeler (Bike/Scooter)</option>
                  <option value="4wheeler">Four Wheeler (Car/SUV)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="onboarding-travel-mode" className="text-xs text-slate-300 font-semibold">Preferred Transit Mode</label>
                <select
                  id="onboarding-travel-mode"
                  {...register("preferredTravelMode")}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:border-teal-500 outline-none"
                >
                  <option value="public">Public Transport (Train/Bus)</option>
                  <option value="private">Private Driving</option>
                </select>
              </div>
            </div>

            {/* Language Selector inside onboarding */}
            <div className="space-y-2">
              <label htmlFor="onboarding-language" className="text-xs text-slate-300 font-semibold">Preferred App Language</label>
              <select
                id="onboarding-language"
                {...register("preferredLanguage")}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:border-teal-500 outline-none"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="mr">मराठी (Marathi)</option>
              </select>
            </div>

            {/* Emergency contacts fields list */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-300 font-semibold">Emergency Contact Numbers</label>
                <button
                  type="button"
                  onClick={() => append({ name: "", phone: "" })}
                  className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Contact
                </button>
              </div>

              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Contact Name (e.g. Brother)"
                      {...register(`emergencyContacts.${index}.name` as const)}
                      className="flex-1 glass-input px-3 py-2 text-xs rounded-xl"
                    />
                    <input
                      type="text"
                      placeholder="Phone (10 digits)"
                      {...register(`emergencyContacts.${index}.phone` as const)}
                      className="flex-1 glass-input px-3 py-2 text-xs rounded-xl"
                    />
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-2 bg-slate-950 border border-slate-850 hover:bg-slate-900 rounded-xl text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-6">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="px-5 py-2.5 border border-slate-800 hover:bg-slate-800 text-xs font-semibold rounded-xl text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSeedDemo}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-medium text-slate-400 rounded-xl transition-all cursor-pointer"
            >
              Demo Profile
            </button>
          )}

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-850 text-xs font-semibold rounded-xl text-slate-200 border border-slate-800 transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  Finish & Get Plan <Sparkles className="w-4 h-4 text-slate-950" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
