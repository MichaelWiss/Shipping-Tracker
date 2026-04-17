"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { ROUTES, type RouteDef } from "@/lib/map/routes";
import MapPanels from "@/components/map/MapPanels";
import MapLegend from "@/components/map/MapLegend";
import MapControls from "@/components/map/MapControls";

const CanvasMap = dynamic(() => import("@/components/map/CanvasMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <LoadingSpinner />
    </div>
  ),
});

interface Overlays {
  routes: boolean;
  weather: boolean;
  eca: boolean;
  emissions: boolean;
}

export default function MapPage() {
  const [overlays, setOverlays] = useState<Overlays>({
    routes: true, weather: false, eca: false, emissions: false,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [simSpeed, setSimSpeed] = useState(1);
  const [hover, setHover] = useState<{ r: RouteDef; x: number; y: number } | null>(null);
  const [clock, setClock] = useState("--:--:-- UTC");

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setClock(
        [n.getUTCHours(), n.getUTCMinutes(), n.getUTCSeconds()]
          .map((x) => String(x).padStart(2, "0"))
          .join(":") + " UTC",
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const toggle = (k: keyof Overlays) =>
    setOverlays((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* MASTHEAD */}
      <div className="shrink-0 border-b border-rule bg-cream px-[18px] pt-2 pb-[7px] relative z-[80]">
        <div className="hd-topline" />
        <div className="flex justify-between items-baseline mb-[2px]">
          <div className="hd-pub">
            Shipping Operations Intelligence · Live Fleet Monitor
          </div>
          <div className="hd-live">● <span>{clock}</span></div>
        </div>
        <h1 className="text-[21px] font-normal tracking-[-0.02em] leading-[1.1] mb-[1px]">
          Global Fleet &amp; Trade Route Monitor
        </h1>
        <div className="hd-deck">
          Six active corridors · {ROUTES.length} vessels in transit · live AIS · CII compliance
        </div>
      </div>

      {/* MAP + OVERLAYS */}
      <div className="relative flex-1 overflow-hidden">
        <CanvasMap
          overlays={overlays}
          selectedRouteId={selectedId}
          onSelectRoute={setSelectedId}
          onHoverRoute={(r, x, y) => setHover(r ? { r, x, y } : null)}
          simSpeed={simSpeed}
        />

        <MapPanels selectedId={selectedId} onSelect={setSelectedId} />
        <MapLegend />
        <MapControls
          overlays={overlays}
          onToggle={toggle}
          simSpeed={simSpeed}
          onSpeedChange={setSimSpeed}
        />

        {/* CREDIT */}
        <div className="credit-line">
          Source: AIS feed · Weather API · Fuel markets — For illustration only
        </div>

        {/* TOOLTIP */}
        {hover && (
          <div
            className="vessel-tooltip"
            style={{
              position: "fixed",
              left: hover.x + 16,
              top: hover.y + 16,
              pointerEvents: "none",
              zIndex: 100,
            }}
          >
            <div className="tt-vessel">{hover.r.vessel}</div>
            <div className="tt-route">{hover.r.name}</div>
            <div className="tt-rule" />
            <div className="tt-row"><span className="tt-k">Flag</span><span className="tt-v">{hover.r.flag}</span></div>
            <div className="tt-row"><span className="tt-k">Speed</span><span className="tt-v">{hover.r.speed}</span></div>
            <div className="tt-row"><span className="tt-k">Fuel</span><span className="tt-v">{hover.r.fuel}</span></div>
            <div className="tt-row"><span className="tt-k">Cargo</span><span className="tt-v">{hover.r.cargo}</span></div>
            <div className="tt-row"><span className="tt-k">CII</span><span className="tt-v">CII-{hover.r.cii}</span></div>
            <div className="tt-row"><span className="tt-k">ETA dest.</span><span className="tt-v">{hover.r.eta}</span></div>
            <div className="tt-row"><span className="tt-k">TEU</span><span className="tt-v">{hover.r.teu}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
