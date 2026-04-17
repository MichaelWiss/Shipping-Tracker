"use client";

import { ROUTES } from "@/lib/map/routes";

export default function MapLegend() {
  return (
    <div className="lgnd">
      <div className="lgnd-ttl">Active routes</div>
      {ROUTES.map((r) => (
        <div key={r.id} className="lgnd-row">
          <svg width="18" height="7">
            <line x1="0" y1="3.5" x2="18" y2="3.5" stroke={r.color} strokeWidth="2" />
          </svg>
          <span>{r.shortName}</span>
        </div>
      ))}
      <div
        className="mt-[5px] pt-[4px]"
        style={{ borderTop: "0.5px solid var(--color-rule-lt)" }}
      >
        <div className="lgnd-row">
          <svg width="16" height="9">
            <polygon points="9,4.5 4,1.5 4,7.5" fill="#C41230" />
            <line x1="0" y1="4.5" x2="4" y2="4.5" stroke="#C41230" strokeWidth="1.5" />
          </svg>
          <span>Vessel (hover/click)</span>
        </div>
        <div className="lgnd-row">
          <svg width="16" height="9">
            <circle cx="8" cy="4.5" r="3.5" fill="none" stroke="#C41230" strokeWidth="1" />
            <circle cx="8" cy="4.5" r="1" fill="#C41230" />
          </svg>
          <span>Port</span>
        </div>
      </div>
    </div>
  );
}
