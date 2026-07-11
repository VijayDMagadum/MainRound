import { GeocodedLocation, WeatherForecastResponse } from "./types";

// Short-term in-memory cache (maps "lat,lon" -> cache entry)
interface CacheEntry {
  data: WeatherForecastResponse;
  timestamp: number;
}
const weatherCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache duration

export async function searchLocations(query: string): Promise<GeocodedLocation[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    
    if (!response.ok) {
      throw new Error(`Geocoding API responded with status ${response.status}`);
    }

    const result = await response.json();
    if (!result.results || !Array.isArray(result.results)) {
      return [];
    }

    return result.results.map((item: any) => ({
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      country: item.country,
      admin1: item.admin1,
      admin2: item.admin2,
    }));
  } catch (error) {
    console.error("Geocoding API search failed:", error);
    return [];
  }
}

export async function getForecast(
  latitude: number,
  longitude: number,
  bypassCache = false
): Promise<WeatherForecastResponse | null> {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  
  if (!bypassCache) {
    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  try {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      current: [
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "precipitation",
        "rain",
        "showers",
        "weather_code",
        "visibility",
        "wind_speed_10m",
        "wind_gusts_10m"
      ].join(","),
      hourly: [
        "temperature_2m",
        "apparent_temperature",
        "precipitation_probability",
        "precipitation",
        "weather_code",
        "visibility",
        "wind_speed_10m",
        "wind_gusts_10m"
      ].join(","),
      daily: [
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "precipitation_probability_max",
        "wind_gusts_10m_max",
        "sunrise",
        "sunset",
        "weather_code"
      ].join(","),
      timezone: "auto",
      forecast_days: "7"
    });

    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!response.ok) {
      throw new Error(`Open-Meteo forecast returned status ${response.status}`);
    }

    const data = await response.json();
    
    // Structure the result to match our TS interface
    const structuredResponse: WeatherForecastResponse = {
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      current: {
        temperature_2m: data.current.temperature_2m,
        apparent_temperature: data.current.apparent_temperature,
        relative_humidity_2m: data.current.relative_humidity_2m,
        precipitation: data.current.precipitation,
        rain: data.current.rain,
        showers: data.current.showers,
        weather_code: data.current.weather_code,
        visibility: data.current.visibility,
        wind_speed_10m: data.current.wind_speed_10m,
        wind_gusts_10m: data.current.wind_gusts_10m,
      },
      hourly: {
        time: data.hourly.time,
        temperature_2m: data.hourly.temperature_2m,
        apparent_temperature: data.hourly.apparent_temperature,
        precipitation_probability: data.hourly.precipitation_probability,
        precipitation: data.hourly.precipitation,
        weather_code: data.hourly.weather_code,
        visibility: data.hourly.visibility,
        wind_speed_10m: data.hourly.wind_speed_10m,
        wind_gusts_10m: data.hourly.wind_gusts_10m,
      },
      daily: {
        time: data.daily.time,
        temperature_2m_max: data.daily.temperature_2m_max,
        temperature_2m_min: data.daily.temperature_2m_min,
        precipitation_sum: data.daily.precipitation_sum,
        precipitation_probability_max: data.daily.precipitation_probability_max,
        wind_gusts_10m_max: data.daily.wind_gusts_10m_max,
        sunrise: data.daily.sunrise,
        sunset: data.daily.sunset,
        weather_code: data.daily.weather_code,
      },
      lastUpdated: new Date().toISOString()
    };

    // Store in cache
    weatherCache.set(cacheKey, {
      data: structuredResponse,
      timestamp: Date.now()
    });

    return structuredResponse;
  } catch (error) {
    console.error(`Failed to fetch weather forecast for ${cacheKey}:`, error);
    return null;
  }
}
