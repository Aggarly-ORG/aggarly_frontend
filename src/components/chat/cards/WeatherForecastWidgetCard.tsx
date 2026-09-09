import React from "react";
import { WeatherForecastData } from "../../../lib/types";
import { SparklesIcon, MapPinIcon } from "../../common/Icons";

interface WeatherForecastWidgetCardProps {
  data: WeatherForecastData;
}

export const WeatherForecastWidgetCard: React.FC<WeatherForecastWidgetCardProps> = ({
  data,
}) => {
  return (
    <div className="weather-widget-card animate-fade-in">
      <div className="weather-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
            <MapPinIcon size={12} color="var(--accent-coral)" />
            <span>{data.location}</span>
          </div>
          <h4 className="weather-title">5-Day Coastal Forecast</h4>
        </div>

        <div className="sea-temp-badge">
          <span>Sea Temp: </span>
          <strong style={{ color: "#0288d1" }}>{data.seaTemperature}</strong>
        </div>
      </div>

      {/* 5-Day Strip */}
      <div className="weather-days-strip">
        {data.days.map((day, idx) => (
          <div key={idx} className="weather-day-col">
            <span className="weather-day-name">{day.day}</span>
            <span className="weather-date-label">{day.date}</span>

            <div className="weather-icon-circle">
              {day.condition === "sunny" && "☀️"}
              {day.condition === "partly-cloudy" && "⛅"}
              {day.condition === "breezy" && "🌤️"}
              {day.condition === "clear" && "✨"}
            </div>

            <div className="weather-temp-range">
              <span className="temp-high">{day.tempHigh}°</span>
              <span className="temp-low">{day.tempLow}°</span>
            </div>

            <span className="weather-uv-label">UV {day.uvIndex}</span>
          </div>
        ))}
      </div>

      <div className="weather-advice-box">
        <SparklesIcon size={14} color="var(--accent-coral)" style={{ flexShrink: 0, marginTop: "2px" }} />
        <span>{data.generalAdvice}</span>
      </div>
    </div>
  );
};
