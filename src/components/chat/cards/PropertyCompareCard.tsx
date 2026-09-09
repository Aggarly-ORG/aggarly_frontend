import React from "react";
import { PropertyCompareData } from "../../../lib/types";
import { StarIcon, CheckIcon, CloseIcon } from "../../common/Icons";

interface PropertyCompareCardProps {
  data: PropertyCompareData;
  onSelectProperty?: (propertyId: string, propertyTitle: string) => void;
}

export const PropertyCompareCard: React.FC<PropertyCompareCardProps> = ({
  data,
  onSelectProperty,
}) => {
  return (
    <div className="property-compare-card animate-fade-in">
      <div className="compare-header">
        <h3 className="compare-title">{data.title}</h3>
        <p className="compare-subtitle">{data.subtitle}</p>
      </div>

      <div className="compare-table-wrapper">
        <table className="compare-table">
          <thead>
            <tr>
              <th className="feature-col">Feature</th>
              {data.properties.map((p) => (
                <th key={p.id} className="property-col">
                  <img
                    src={p.imageUrl}
                    alt={p.title}
                    className="compare-thumb"
                  />
                  <div className="compare-prop-name">{p.title}</div>
                  <div className="compare-prop-loc">{p.location}</div>
                  <div className="compare-prop-price">
                    <span className="numeral-gold" style={{ fontSize: "16px" }}>
                      €{p.nightlyPrice}
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>
                      /night
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="feature-label">Rating</td>
              {data.properties.map((p) => (
                <td key={p.id} className="feature-val">
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                    <StarIcon size={12} filled color="var(--accent-gold)" />
                    <span style={{ fontWeight: 600 }}>{p.rating.toFixed(2)}</span>
                  </div>
                </td>
              ))}
            </tr>

            <tr>
              <td className="feature-label">Capacity</td>
              {data.properties.map((p) => (
                <td key={p.id} className="feature-val">
                  {p.maxGuests} guests · {p.bedrooms} bed · {p.bathrooms} bath
                </td>
              ))}
            </tr>

            <tr>
              <td className="feature-label">Pool & Wellness</td>
              {data.properties.map((p) => (
                <td key={p.id} className="feature-val">
                  {p.poolType}
                </td>
              ))}
            </tr>

            <tr>
              <td className="feature-label">Sea Distance</td>
              {data.properties.map((p) => (
                <td key={p.id} className="feature-val">
                  {p.seaDistance}
                </td>
              ))}
            </tr>

            <tr>
              <td className="feature-label">Private Chef Option</td>
              {data.properties.map((p) => (
                <td key={p.id} className="feature-val">
                  {p.chefAvailable ? (
                    <span style={{ color: "var(--accent-sage)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <CheckIcon size={12} color="var(--accent-sage)" /> Available
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-tertiary)" }}>On Request</span>
                  )}
                </td>
              ))}
            </tr>

            <tr>
              <td className="feature-label">Cancellation</td>
              {data.properties.map((p) => (
                <td key={p.id} className="feature-val" style={{ fontSize: "11px" }}>
                  {p.cancellationPolicy}
                </td>
              ))}
            </tr>

            <tr>
              <td className="feature-label">Action</td>
              {data.properties.map((p) => (
                <td key={p.id} className="feature-val">
                  <button
                    onClick={() =>
                      onSelectProperty && onSelectProperty(p.id, p.title)
                    }
                    className="btn-select-compare"
                  >
                    Select {p.title.split(" ")[0]}
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
