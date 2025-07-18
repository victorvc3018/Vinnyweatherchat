export interface Message {
  id: string;
  text: string;
  senderId: string;
  isError?: boolean;
  reactions?: { [emoji: string]: string[] };
}

export type WeatherCondition = 
  | 'Sunny' 
  | 'Partly Cloudy' 
  | 'Cloudy' 
  | 'Rain' 
  | 'Thunderstorm' 
  | 'Snow'
  | 'Mist';

export interface ForecastDay {
  day: string;
  condition: WeatherCondition;
  maxTemp: number;
  minTemp: number;
}

export interface WeatherDetails {
  uvIndex: number;
  windSpeed: number; // in km/h
  sunrise: string; // "HH:MM"
  sunset: string; // "HH:MM"
  humidity: number; // percentage
  feelsLike: number;
  pressure: number; // in hPa
}

export interface WeatherData {
  location: string;
  currentTemp: number;
  condition: WeatherCondition;
  maxTemp: number;
  minTemp: number;
  forecast: ForecastDay[];
  details: WeatherDetails;
}