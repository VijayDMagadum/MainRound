export type RiskLevel = "low" | "moderate" | "high" | "severe";

export interface MonsoonRiskAssessment {
  overall: RiskLevel;
  heavyRain: RiskLevel;
  flooding: RiskLevel;
  thunderstorm: RiskLevel;
  wind: RiskLevel;
  visibility: RiskLevel;
  travel: RiskLevel;
  powerDisruption: RiskLevel;
  reasons: string[];
  recommendedActions: string[];
  validFrom: string;
  validUntil: string;
  confidence: "low" | "medium" | "high";
}

export interface GeocodedLocation {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string; // state/region
  admin2?: string; // district
}

export interface CurrentWeather {
  temperature_2m: number;
  apparent_temperature: number;
  relative_humidity_2m: number;
  precipitation: number;
  rain: number;
  showers: number;
  weather_code: number;
  visibility: number;
  wind_speed_10m: number;
  wind_gusts_10m: number;
}

export interface HourlyForecast {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  precipitation_probability: number[];
  precipitation: number[];
  weather_code: number[];
  visibility: number[];
  wind_speed_10m: number[];
  wind_gusts_10m: number[];
}

export interface DailyForecast {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  precipitation_probability_max: number[];
  wind_gusts_10m_max: number[];
  sunrise: string[];
  sunset: string[];
  weather_code: number[];
}

export interface WeatherForecastResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current: CurrentWeather;
  hourly: HourlyForecast;
  daily: DailyForecast;
  lastUpdated: string;
}

export type EventPhase = "normal" | "prepare" | "active" | "recovery";
