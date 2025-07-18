import type { WeatherData, WeatherCondition, ForecastDay, WeatherDetails } from '../types';

const conditions: WeatherCondition[] = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rain', 'Thunderstorm', 'Snow', 'Mist'];

// Simple hash function to get a seed from a string
const getSeed = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

// Seedable random number generator
const seededRandom = (seed: number) => {
    let s = seed;
    return () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
    };
};

const getRandomInt = (rand: () => number, min: number, max: number): number => {
    return Math.floor(rand() * (max - min + 1)) + min;
};

const formatTime = (rand: () => number, baseHour: number, baseMinute: number): string => {
    const hour = (baseHour + getRandomInt(rand, -1, 1)) % 24;
    const minute = (baseMinute + getRandomInt(rand, -29, 29)) % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

export const generateWeatherData = (location: string): WeatherData => {
    const seed = getSeed(location.toLowerCase());
    const rand = seededRandom(seed);
    
    const currentTemp = getRandomInt(rand, -10, 35);
    const tempVariation = getRandomInt(rand, 5, 10);
    const maxTemp = currentTemp + getRandomInt(rand, 0, 5);
    const minTemp = maxTemp - tempVariation;
    const condition = conditions[getRandomInt(rand, 0, conditions.length - 1)];

    const forecast: ForecastDay[] = Array.from({ length: 7 }, (_, i) => {
        const dayMax = maxTemp + getRandomInt(rand, -5, 5);
        return {
            day: new Date(Date.now() + (i + 1) * 86400000).toLocaleDateString('en-US', { weekday: 'short' }),
            condition: conditions[getRandomInt(rand, 0, conditions.length - 1)],
            maxTemp: dayMax,
            minTemp: dayMax - getRandomInt(rand, 5, 12),
        };
    });

    const details: WeatherDetails = {
        uvIndex: getRandomInt(rand, 0, 11),
        windSpeed: getRandomInt(rand, 2, 40),
        sunrise: formatTime(rand, 6, 30),
        sunset: formatTime(rand, 18, 30),
        humidity: getRandomInt(rand, 30, 95),
        feelsLike: currentTemp + getRandomInt(rand, -3, 3),
        pressure: getRandomInt(rand, 980, 1040),
    };

    return {
        location,
        currentTemp,
        condition,
        maxTemp,
        minTemp,
        forecast,
        details,
    };
};
