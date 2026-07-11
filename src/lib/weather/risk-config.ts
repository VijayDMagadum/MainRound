export const RISK_THRESHOLDS = {
  // Hourly Rainfall (mm)
  RAIN_HOURLY: {
    MODERATE: 5,
    HIGH: 15,
    SEVERE: 30,
  },
  // Daily Accumulated Rainfall (mm)
  RAIN_DAILY: {
    MODERATE: 30,
    HIGH: 75,
    SEVERE: 150,
  },
  // Wind Gusts (km/h)
  WIND_GUST: {
    MODERATE: 40,
    HIGH: 65,
    SEVERE: 90,
  },
  // Visibility (meters)
  VISIBILITY: {
    MODERATE: 5000,
    HIGH: 2000,
    SEVERE: 500,
  },
  // Consecutive hours of rain
  CONSECUTIVE_RAIN_HOURS: {
    MODERATE: 4,
    HIGH: 8,
    SEVERE: 12,
  },
  // Weather Codes
  CODES: {
    THUNDERSTORM_MODERATE: [95],
    THUNDERSTORM_SEVERE: [96, 99],
    HEAVY_RAIN: [65, 82],
    TORRENTIAL_RAIN: [67, 86],
  }
};
