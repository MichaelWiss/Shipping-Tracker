"use client";

interface Overlays {
  routes: boolean;
  weather: boolean;
  eca: boolean;
  emissions: boolean;
}

const OVERLAY_BTNS: { key: keyof Overlays; label: string }[] = [
  { key: "routes",    label: "Routes" },
  { key: "weather",   label: "Weather" },
  { key: "eca",       label: "ECA Zones" },
  { key: "emissions", label: "Emissions" },
];

interface Props {
  overlays: Overlays;
  onToggle: (key: keyof Overlays) => void;
  simSpeed: number;
  onSpeedChange: (s: number) => void;
}

export default function MapControls({ overlays, onToggle, simSpeed, onSpeedChange }: Props) {
  return (
    <div className="ctrl-bar">
      <span className="ctrl-lbl">Overlay</span>
      {OVERLAY_BTNS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onToggle(key)}
          className={`cbtn${overlays[key] ? " on" : ""}`}
        >
          {label}
        </button>
      ))}
      <div className="ctrl-sep" />
      <span className="ctrl-lbl">Speed</span>
      {[0.5, 1, 5].map((s) => (
        <button
          key={s}
          onClick={() => onSpeedChange(s)}
          className={`cbtn${simSpeed === s ? " on" : ""}`}
        >
          {s === 0.5 ? "½×" : `${s}×`}
        </button>
      ))}
    </div>
  );
}
