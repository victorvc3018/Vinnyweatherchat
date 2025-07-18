import React, { useState, useEffect, useCallback } from 'react';
import type { WeatherData } from './types';
import { generateWeatherData } from './services/weatherService';
import WeatherIcon from './components/weather/WeatherIcon';
import SearchIcon from './components/icons/SearchIcon';
import WindIcon from './components/icons/WindIcon';
import UvIcon from './components/icons/UvIcon';
import SunriseIcon from './components/icons/SunriseIcon';
import SunsetIcon from './components/icons/SunsetIcon';
import HumidityIcon from './components/icons/HumidityIcon';
import PressureIcon from './components/icons/PressureIcon';
import FeelsLikeIcon from './components/icons/FeelsLikeIcon';

interface WeatherAppProps {
    onUnlockRequest: () => void;
}

const initialCities = ["Tokyo", "New York", "London", "Paris", "Sydney"];

const WeatherApp: React.FC<WeatherAppProps> = ({ onUnlockRequest }) => {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const fetchWeather = useCallback((location: string) => {
        setIsLoading(true);
        // Simulate network delay for a better UX
        setTimeout(() => {
            setWeather(generateWeatherData(location));
            setIsLoading(false);
        }, 500);
    }, []);

    useEffect(() => {
        const randomCity = initialCities[Math.floor(Math.random() * initialCities.length)];
        fetchWeather(randomCity);
    }, [fetchWeather]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (search.trim() === "VinnyLari") {
            onUnlockRequest();
            setSearch('');
        } else if (search.trim()) {
            fetchWeather(search.trim());
        }
    };
    
    const DetailItem: React.FC<{ icon: React.ReactNode; label: string; value: string | number; unit?: string }> = ({ icon, label, value, unit }) => (
        <div className="bg-gray-800/50 rounded-2xl p-3 sm:p-4 flex flex-col justify-between backdrop-blur-sm">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
                {icon}
                <span>{label}</span>
            </div>
            <p className="text-xl md:text-2xl font-semibold mt-2">{value} <span className="text-base md:text-lg font-normal">{unit}</span></p>
        </div>
    );

    return (
        <div className="h-screen w-screen overflow-y-auto bg-gradient-to-b from-blue-900 via-gray-900 to-black text-white font-sans p-4 md:p-6 flex flex-col gap-4 sm:gap-6">
            <header>
                <form onSubmit={handleSearch} className="relative max-w-lg mx-auto">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search for a city..."
                        className="w-full bg-black/30 placeholder-gray-400 text-white rounded-full py-3 pl-5 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 backdrop-blur-sm"
                    />
                    <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white transition-colors" aria-label="Search">
                        <SearchIcon />
                    </button>
                </form>
            </header>

            {isLoading || !weather ? (
                <div className="flex-1 flex items-center justify-center">
                    <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            ) : (
                <main className="flex flex-col gap-4 sm:gap-6 animate-fade-in">
                    {/* Current Weather */}
                    <section className="text-center flex flex-col items-center px-2">
                        <h1 className="text-3xl md:text-4xl font-bold tracking-wide">{weather.location}</h1>
                        <p className="text-7xl md:text-8xl font-thin my-1 md:my-2">{weather.currentTemp}°</p>
                        <p className="text-lg md:text-xl text-gray-300">{weather.condition}</p>
                        <p className="text-base md:text-lg text-gray-400">H: {weather.maxTemp}° L: {weather.minTemp}°</p>
                    </section>
                    
                    {/* 7-Day Forecast */}
                    <section className="bg-gray-800/50 rounded-2xl p-3 sm:p-4 backdrop-blur-sm">
                        <h2 className="text-sm text-gray-400 uppercase mb-3 px-2">7-Day Forecast</h2>
                        <div className="flex overflow-x-auto space-x-4 pb-2">
                            {weather.forecast.map(day => (
                                <div key={day.day} className="flex-shrink-0 flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-colors w-20 text-center">
                                    <p className="font-medium text-sm">{day.day}</p>
                                    <div className="w-10 h-10"><WeatherIcon condition={day.condition} /></div>
                                    <p className="font-semibold">{day.maxTemp}°</p>
                                    <p className="text-gray-400">{day.minTemp}°</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Weather Details */}
                    <section className="grid grid-cols-2 gap-3 sm:gap-4">
                        <DetailItem icon={<UvIcon />} label="UV Index" value={weather.details.uvIndex} />
                        <DetailItem icon={<WindIcon />} label="Wind" value={weather.details.windSpeed} unit="km/h" />
                        <DetailItem icon={<SunriseIcon />} label="Sunrise" value={weather.details.sunrise} />
                        <DetailItem icon={<SunsetIcon />} label="Sunset" value={weather.details.sunset} />
                        <DetailItem icon={<HumidityIcon />} label="Humidity" value={weather.details.humidity} unit="%" />
                        <DetailItem icon={<FeelsLikeIcon />} label="Feels Like" value={`${weather.details.feelsLike}°`} />
                        <DetailItem icon={<PressureIcon />} label="Pressure" value={weather.details.pressure} unit="hPa" />
                    </section>
                </main>
            )}
        </div>
    );
};

export default WeatherApp;