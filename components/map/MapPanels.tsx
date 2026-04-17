"use client";

import { ROUTES, type RouteDef } from "@/lib/map/routes";

interface Props {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function MapPanels({ selectedId, onSelect }: Props) {
  return (
    <>
      {/* LEFT: route list */}
      <div className="map-panel" style={{ top: 14, left: 14 }}>
        <div className="ptitle">ERP · Trade Positions</div>
        {ROUTES.map((r) => (
          <div
            key={r.id}
            className="ri"
            onClick={() => onSelect(selectedId === r.id ? null : r.id)}
          >
            <div className="ri-dot" style={{ background: r.color }} />
            <div className="ri-body">
              <div className="ri-name">{r.name}</div>
              <div className="ri-sub">{r.from} → {r.to}</div>
            </div>
          </div>
        ))}
      </div>

      {/* RIGHT: env CII + fuel */}
      <div className="map-panel" style={{ top: 14, right: 14 }}>
        <div className="ptitle">Environmental · CII Rating</div>
        {ROUTES.map((r) => {
          const abbr = r.vessel.split(" ").slice(0, 2).join(" ");
          return (
            <div key={r.id} className="ei">
              <span className="ei-lbl">{abbr}</span>
              <span className={`ei-val ${r.cii}`}>CII-{r.cii}</span>
            </div>
          );
        })}

        <div className="ptitle" style={{ marginTop: 12 }}>Fuel Optimizer</div>
        {ROUTES.map((r) => {
          const fv = parseFloat(r.fuel);
          const pct = Math.min(100, (fv / 200) * 100).toFixed(0);
          const nm = r.vessel.split(" ").pop();
          return (
            <div key={r.id} className="fb">
              <div className="fb-head">
                <span className="fb-nm">{nm}</span>
                <span className="fb-vl">{fv}t/d</span>
              </div>
              <div className="fb-track">
                <div
                  className={`fb-fill${fv > 150 ? " hi" : ""}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}

        <div
          style={{
            marginTop: 7,
            borderTop: "0.5px solid var(--color-rule-lt)",
            paddingTop: 6,
          }}
        >
          <div className="ei">
            <span className="ei-lbl">VLSFO avg</span>
            <span className="ei-val" style={{ fontSize: 10 }}>$658/MT</span>
          </div>
        </div>
      </div>
    </>
  );
}
