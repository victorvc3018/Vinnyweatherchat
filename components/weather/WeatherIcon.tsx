import React from 'react';
import type { WeatherCondition } from '../../types';
import SunnyIcon from '../icons/SunnyIcon';
import CloudyIcon from '../icons/CloudyIcon';
import RainyIcon from '../icons/RainyIcon';

interface WeatherIconProps {
  condition: WeatherCondition;
}

const WeatherIcon: React.FC<WeatherIconProps> = ({ condition }) => {
  switch (condition) {
    case 'Sunny':
    case 'Partly Cloudy': // Use sunny for partly cloudy for simplicity
      return <SunnyIcon />;
    case 'Cloudy':
    case 'Mist':
      return <CloudyIcon />;
    case 'Rain':
    case 'Thunderstorm':
      return <RainyIcon />;
    case 'Snow':
      return <CloudyIcon />; // Placeholder, can add snow icon
    default:
      return <SunnyIcon />;
  }
};

export default WeatherIcon;
