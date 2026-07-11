export interface WeatherCodeDescription {
  en: string;
  hi: string;
  mr: string;
}

export const WEATHER_CODES: Record<number, WeatherCodeDescription> = {
  0: { en: "Clear Sky", hi: "साफ आसमान", mr: "स्वच्छ आकाश" },
  1: { en: "Mainly Clear", hi: "मुख्यतः साफ आसमान", mr: "मुख्यतः स्वच्छ" },
  2: { en: "Partly Cloudy", hi: "आंशिक रूप से बादल", mr: "अंशतः ढगाळ" },
  3: { en: "Overcast", hi: "पूर्णतः बादलों से घिरा", mr: "पूर्णतः ढगाळ" },
  45: { en: "Fog", hi: "कोहरा", mr: "धुके" },
  48: { en: "Depositing Rime Fog", hi: "बर्फानी कोहरा", mr: "हिम धुकं" },
  51: { en: "Light Drizzle", hi: "हल्की बूंदाबांदी", mr: "हलकी भुरभुर" },
  53: { en: "Moderate Drizzle", hi: "मध्यम बूंदाबांदी", mr: "मध्यम भुरभुर" },
  55: { en: "Dense Drizzle", hi: "घनी बूंदाबांदी", mr: "दाट भुरभुर" },
  56: { en: "Light Freezing Drizzle", hi: "हल्की बर्फीली बूंदाबांदी", mr: "हलकी गोठवणारी भुरभुर" },
  57: { en: "Dense Freezing Drizzle", hi: "घनी बर्फीली बूंदाबांदी", mr: "दाट गोठवणारी भुरभुर" },
  61: { en: "Slight Rain", hi: "हल्की बारिश", mr: "हलका पाऊस" },
  63: { en: "Moderate Rain", hi: "मध्यम बारिश", mr: "मध्यम पाऊस" },
  65: { en: "Heavy Rain", hi: "भारी बारिश", mr: "मुसळधार पाऊस" },
  66: { en: "Light Freezing Rain", hi: "हल्की बर्फीली बारिश", mr: "हलका गोठवणारा पाऊस" },
  67: { en: "Heavy Freezing Rain", hi: "भारी बर्फीली बारिश", mr: "मुसळधार गोठवणारा पाऊस" },
  71: { en: "Slight Snow Fall", hi: "हल्का हिमपात", mr: "हलकी हिमवृष्टी" },
  73: { en: "Moderate Snow Fall", hi: "मध्यम हिमपात", mr: "मध्यम हिमवृष्टी" },
  75: { en: "Heavy Snow Fall", hi: "भारी हिमपात", mr: "मुसळधार हिमवृष्टी" },
  77: { en: "Snow Grains", hi: "बर्फ के दाने", mr: "बर्फाचे दाणे" },
  80: { en: "Slight Rain Showers", hi: "हल्की बौछारें", mr: "हलक्या पावसाच्या सरी" },
  81: { en: "Moderate Rain Showers", hi: "मध्यम बौछारें", mr: "मध्यम पावसाच्या सरी" },
  82: { en: "Violent Rain Showers", hi: "तेज बौछारें", mr: "जोरदार पावसाच्या सरी" },
  85: { en: "Slight Snow Showers", hi: "हल्की बर्फबारी की बौछारें", mr: "हलक्या हिमवर्षावाच्या सरी" },
  86: { en: "Heavy Snow Showers", hi: "भारी बर्फबारी की बौछारें", mr: "मुसळधार हिमवर्षावाच्या सरी" },
  95: { en: "Thunderstorm", hi: "गरज के साथ तूफान", mr: "वादळी पाऊस" },
  96: { en: "Thunderstorm with Slight Hail", hi: "ओलावृष्टि के साथ तूफान", mr: "हलक्या गारपीटसह वादळी पाऊस" },
  99: { en: "Thunderstorm with Heavy Hail", hi: "भारी ओलावृष्टि के साथ तूफान", mr: "मुसळधार गारपीटसह वादळी पाऊस" },
};

export function getWeatherDescription(code: number, locale: string = "en"): string {
  const desc = WEATHER_CODES[code] || { en: "Unknown Weather", hi: "अज्ञात मौसम", mr: "अज्ञात हवामान" };
  if (locale === "hi") return desc.hi;
  if (locale === "mr") return desc.mr;
  return desc.en;
}
