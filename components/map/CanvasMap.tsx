"use client";

// ---------------------------------------------------------------------------
// CanvasMap — two-canvas (base + anim) Natural Earth map with d3-zoom pan/zoom.
// Ports the visuals of References/shipping-map.html exactly: cream/ink palette,
// hand-drawn tan land with crosshatch, animated route dashes, vessel arrows,
// wakes, ports, weather, ECA glyphs.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState, useCallback } from "react";
import { geoPath, geoGraticule, type GeoProjection } from "d3-geo";
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomTransform } from "d3-zoom";
import { select } from "d3-selection";
import { feature, mesh } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import {
  ROUTES,
  MAP_PORTS,
  MAP_WEATHER,
  MAP_ECA,
  COUNTRY_LABELS,
  type RouteDef,
} from "@/lib/map/routes";
import {
  makeProjection,
  calcPts,
  ptAtT,
  headAtT,
  screenToWorld,
  type Pt,
} from "@/lib/map/projection";

interface Overlays {
  routes: boolean;
  weather: boolean;
  eca: boolean;
  emissions: boolean;
}

interface Props {
  overlays?: Partial<Overlays>;
  selectedRouteId?: string | null;
  onSelectRoute?: (id: string | null) => void;
  onHoverRoute?: (route: RouteDef | null, x: number, y: number) => void;
  simSpeed?: number;
}

const WORLD_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";

export default function CanvasMap({
  overlays: overlaysProp,
  selectedRouteId = null,
  onSelectRoute,
  onHoverRoute,
  simSpeed = 1,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<HTMLCanvasElement>(null);

  const [size, setSize] = useState({ W: 1, H: 1 });
  const projRef = useRef<GeoProjection | null>(null);
  const worldRef = useRef<Topology | null>(null);
  const routePtsRef = useRef<Record<string, Pt[]>>({});
  const vprogRef = useRef<Record<string, number>>({});
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const dashOffRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const selIdRef = useRef<string | null>(selectedRouteId);
  const overlaysRef = useRef<Overlays>({
    routes: true,
    weather: false,
    eca: false,
    emissions: false,
    ...overlaysProp,
  });
  const simSpdRef = useRef(simSpeed);

  // Keep refs synced with props (no re-render needed for animation loop)
  useEffect(() => {
    selIdRef.current = selectedRouteId;
  }, [selectedRouteId]);
  useEffect(() => {
    overlaysRef.current = {
      routes: true,
      weather: false,
      eca: false,
      emissions: false,
      ...overlaysProp,
    };
  }, [overlaysProp]);
  useEffect(() => {
    simSpdRef.current = simSpeed;
  }, [simSpeed]);

  // ────── BASE DRAW ──────
  const drawBase = useCallback(() => {
    const canvas = baseRef.current;
    const proj = projRef.current;
    if (!canvas || !proj) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { W, H } = size;
    const t = transformRef.current;

    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.translate(t.x, t.y);
    ctx.scale(t.k, t.k);

    const gp = geoPath(proj, ctx);

    // Ocean gradient sphere
    const og = ctx.createRadialGradient(
      W * 0.5, H * 0.48, 0,
      W * 0.5, H * 0.48, Math.max(W, H) * 0.65,
    );
    og.addColorStop(0, "#BDD1DC");
    og.addColorStop(1, "#9AB4C2");
    ctx.beginPath(); gp({ type: "Sphere" });
    ctx.fillStyle = og; ctx.fill();

    // Graticule
    ctx.beginPath(); gp(geoGraticule()());
    ctx.strokeStyle = "rgba(155,175,190,0.30)";
    ctx.lineWidth = 0.5 / t.k; ctx.stroke();

    // Sphere border
    ctx.beginPath(); gp({ type: "Sphere" });
    ctx.strokeStyle = "rgba(130,155,170,0.4)";
    ctx.lineWidth = 1 / t.k; ctx.stroke();

    const world = worldRef.current;
    if (world) {
      const countries = feature(
        world,
        world.objects.countries as GeometryCollection,
      );
      // Land fill
      ctx.beginPath(); gp(countries);
      ctx.fillStyle = "#CCBB8C"; ctx.fill();

      // Crosshatch on land
      ctx.save();
      ctx.beginPath(); gp(countries); ctx.clip();
      ctx.strokeStyle = "rgba(120,95,55,0.07)";
      ctx.lineWidth = 0.8 / t.k;
      const step = 4;
      for (let i = -H; i < W + H; i += step) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + H, H);
        ctx.stroke();
      }
      ctx.restore();

      // Internal borders
      ctx.beginPath();
      gp(mesh(world, world.objects.countries as GeometryCollection, (a, b) => a !== b));
      ctx.strokeStyle = "rgba(160,135,85,0.50)";
      ctx.lineWidth = 0.5 / t.k; ctx.stroke();

      // Coastlines
      ctx.beginPath();
      gp(mesh(world, world.objects.countries as GeometryCollection, (a, b) => a === b));
      ctx.strokeStyle = "rgba(150,125,78,0.70)";
      ctx.lineWidth = 0.9 / t.k; ctx.stroke();

      // Country name labels
      COUNTRY_LABELS.forEach((cl) => {
        const pt = proj(cl.c);
        if (!pt) return;
        ctx.font = `italic ${6.5 / t.k}px Georgia`;
        ctx.fillStyle = "rgba(26,22,16,0.30)";
        ctx.textAlign = "center";
        ctx.fillText(cl.name, pt[0], pt[1]);
      });
    } else {
      // Fallback ocean wash
      const lg = ctx.createLinearGradient(0, 0, W, H);
      lg.addColorStop(0, "#B6CAD8");
      lg.addColorStop(1, "#9AB4C2");
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }, [size]);

  // ────── ANIM DRAW ──────
  const drawAnim = useCallback(() => {
    const canvas = animRef.current;
    const proj = projRef.current;
    if (!canvas || !proj) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { W, H } = size;
    const t = transformRef.current;
    const k = t.k;
    const ov = overlaysRef.current;
    const selId = selIdRef.current;
    const dashOff = dashOffRef.current;

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.scale(k, k);

    // Weather
    if (ov.weather) {
      const cols: Record<string, [number, number, number]> = {
        storm: [120, 80, 185],
        high: [80, 160, 200],
        monsoon: [60, 145, 185],
        wind: [200, 160, 60],
      };
      MAP_WEATHER.forEach((w) => {
        const cx = proj(w.c); if (!cx) return;
        const ex = proj([w.c[0] + w.r * 0.7, w.c[1]]); if (!ex) return;
        const r = Math.abs(ex[0] - cx[0]);
        const rgb = cols[w.type] || [150, 150, 200];
        const g = ctx.createRadialGradient(cx[0], cx[1], 0, cx[0], cx[1], r);
        g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${w.s * 0.26})`);
        g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx[0], cx[1], r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(26,22,16,0.55)";
        ctx.font = `${7.5 / k}px "Courier New"`;
        ctx.textAlign = "center";
        ctx.fillText(w.name, cx[0], cx[1] + 3 / k);
      });
    }

    // ECA
    if (ov.eca) {
      MAP_ECA.forEach((z) => {
        const cx = proj(z.c); if (!cx) return;
        const ex = proj([z.c[0] + z.r * 0.7, z.c[1]]); if (!ex) return;
        const r = Math.abs(ex[0] - cx[0]);
        ctx.save();
        ctx.setLineDash([3 / k, 3 / k]);
        ctx.beginPath(); ctx.arc(cx[0], cx[1], r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(180,80,30,0.65)";
        ctx.lineWidth = 1 / k; ctx.stroke();
        ctx.fillStyle = "rgba(180,80,30,0.06)"; ctx.fill();
        ctx.setLineDash([]);
        ctx.fillStyle = "#B04A1C";
        ctx.font = `bold ${7.5 / k}px "Courier New"`;
        ctx.textAlign = "center";
        ctx.fillText("ECA", cx[0], cx[1] + 3 / k);
        ctx.restore();
      });
    }

    // Routes
    if (ov.routes) {
      ROUTES.forEach((r) => {
        const pts = routePtsRef.current[r.id];
        if (!pts || pts.length < 2) return;
        const tt = vprogRef.current[r.id];
        const isSel = selId === r.id;

        // Ghost trail
        ctx.beginPath();
        pts.forEach((p, i) =>
          i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]),
        );
        ctx.strokeStyle = r.color + "1C";
        ctx.lineWidth = 4; ctx.stroke();

        // Planned (dashed)
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = -dashOff;
        ctx.beginPath();
        pts.forEach((p, i) =>
          i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]),
        );
        ctx.strokeStyle = r.color + (isSel ? "CC" : "70");
        ctx.lineWidth = isSel ? 1.6 : 1.0;
        ctx.stroke();
        ctx.restore();

        // Traveled (solid)
        const endI = Math.floor(tt * (pts.length - 1));
        if (endI > 0) {
          ctx.beginPath();
          for (let i = 0; i <= endI; i++) {
            if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]);
            else ctx.lineTo(pts[i][0], pts[i][1]);
          }
          ctx.strokeStyle = r.color;
          ctx.lineWidth = isSel ? 2.4 : 1.6;
          ctx.stroke();
        }

        // Label at midpoint when selected
        if (isSel) {
          const mp = ptAtT(pts, 0.5);
          if (mp) {
            ctx.font = `${9 / k}px "Courier New"`;
            const tw = ctx.measureText(r.name).width;
            ctx.fillStyle = "rgba(243,237,224,0.85)";
            ctx.fillRect(mp[0] - tw / 2 - 4 / k, mp[1] - 14 / k, tw + 8 / k, 16 / k);
            ctx.fillStyle = r.color;
            ctx.textAlign = "center";
            ctx.fillText(r.name, mp[0], mp[1] - 3 / k);
          }
        }
      });
    }

    // Ports
    MAP_PORTS.forEach((p) => {
      const px = proj(p.c); if (!px) return;
      ctx.beginPath();
      ctx.arc(px[0], px[1], 5 / k, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(243,237,224,0.88)";
      ctx.strokeStyle = "#C41230";
      ctx.lineWidth = 1.2 / k;
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.arc(px[0], px[1], 1.5 / k, 0, Math.PI * 2);
      ctx.fillStyle = "#C41230"; ctx.fill();

      ctx.font = `bold ${8.5 / k}px Georgia`;
      const tw = ctx.measureText(p.name.toUpperCase()).width;
      let lx = px[0] + 9 / k;
      let ly = px[1] - 3 / k;
      // viewport-aware shift (in world coords)
      if (lx + tw > (W - 10 - t.x) / k) lx = px[0] - tw - 9 / k;
      if (ly < (14 - t.y) / k) ly = px[1] + 14 / k;
      ctx.fillStyle = "rgba(243,237,224,0.72)";
      ctx.fillRect(lx - 2 / k, ly - 9 / k, tw + 4 / k, 12 / k);
      ctx.fillStyle = "#1A1610";
      ctx.textAlign = "left";
      ctx.fillText(p.name.toUpperCase(), lx, ly);
    });

    // Vessels
    ROUTES.forEach((r) => {
      const pts = routePtsRef.current[r.id];
      if (!pts || pts.length < 2) return;
      const tt = vprogRef.current[r.id];
      const pos = ptAtT(pts, tt); if (!pos) return;
      const ang = headAtT(pts, tt);
      const isSel = selId === r.id;
      const sz = (isSel ? 8 : 6) / k;

      // Selection halo
      if (isSel) {
        ctx.beginPath();
        ctx.arc(pos[0], pos[1], 16 / k, 0, Math.PI * 2);
        ctx.fillStyle = r.color + "18"; ctx.fill();
        ctx.beginPath();
        ctx.arc(pos[0], pos[1], 12 / k, 0, Math.PI * 2);
        ctx.strokeStyle = r.color + "40";
        ctx.lineWidth = 1 / k; ctx.stroke();
      }

      // Wake
      const wt0 = Math.max(0, tt - 0.035);
      const wpts: Pt[] = [];
      for (let wt = wt0; wt < tt; wt += 0.003) {
        const wp = ptAtT(pts, wt);
        if (wp) wpts.push(wp);
      }
      if (wpts.length > 1) {
        ctx.beginPath();
        wpts.forEach((wp, i) =>
          i === 0 ? ctx.moveTo(wp[0], wp[1]) : ctx.lineTo(wp[0], wp[1]),
        );
        const wg = ctx.createLinearGradient(
          wpts[0][0], wpts[0][1], pos[0], pos[1],
        );
        wg.addColorStop(0, r.color + "00");
        wg.addColorStop(1, r.color + "50");
        ctx.strokeStyle = wg;
        ctx.lineWidth = 2 / k; ctx.stroke();
      }

      // Ship silhouette
      ctx.save();
      ctx.translate(pos[0], pos[1]);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(sz * 1.8, 0);
      ctx.lineTo(sz * 0.2, -sz * 0.8);
      ctx.lineTo(-sz * 0.8, -sz * 0.6);
      ctx.lineTo(-sz, 0);
      ctx.lineTo(-sz * 0.8, sz * 0.6);
      ctx.lineTo(sz * 0.2, sz * 0.8);
      ctx.closePath();
      ctx.fillStyle = r.color; ctx.fill();
      ctx.strokeStyle = "rgba(243,237,224,0.9)";
      ctx.lineWidth = 0.8 / k; ctx.stroke();
      ctx.restore();
    });

    // Emissions badges
    if (ov.emissions) {
      const cols: Record<string, string> = {
        A: "#2D6A4F", B: "#3A6B94", C: "#C87C18", D: "#C41230",
      };
      ROUTES.forEach((r) => {
        const pts = routePtsRef.current[r.id]; if (!pts || pts.length < 2) return;
        const pos = ptAtT(pts, vprogRef.current[r.id]); if (!pos) return;
        ctx.fillStyle = "rgba(243,237,224,0.82)";
        ctx.fillRect(pos[0] + 10 / k, pos[1] + 8 / k, 36 / k, 14 / k);
        ctx.fillStyle = cols[r.cii] || "#666";
        ctx.font = `bold ${9 / k}px "Courier New"`;
        ctx.textAlign = "left";
        ctx.fillText(`CII-${r.cii}`, pos[0] + 12 / k, pos[1] + 19 / k);
      });
    }

    ctx.restore();
  }, [size]);

  // ────── INIT: size, projection, route points, world data ──────
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const measure = () => {
      const W = Math.max(1, wrap.clientWidth);
      const H = Math.max(1, wrap.clientHeight);
      setSize({ W, H });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // Rebuild projection + route points whenever size changes
  useEffect(() => {
    const { W, H } = size;
    if (W < 2 || H < 2) return;
    projRef.current = makeProjection(W, H);
    const rp: Record<string, Pt[]> = {};
    ROUTES.forEach((r) => {
      rp[r.id] = calcPts(r, projRef.current!);
      if (vprogRef.current[r.id] === undefined) {
        vprogRef.current[r.id] = r.initT;
      }
    });
    routePtsRef.current = rp;
    drawBase();
  }, [size, drawBase]);

  // Fetch world topology once
  useEffect(() => {
    let cancelled = false;
    fetch(WORLD_URL)
      .then((r) => r.json())
      .then((w: Topology) => {
        if (cancelled) return;
        worldRef.current = w;
        drawBase();
      })
      .catch(() => {
        // Fallback already handled in drawBase when worldRef is null
      });
    return () => { cancelled = true; };
  }, [drawBase]);

  // ────── d3-zoom wiring ──────
  useEffect(() => {
    const anim = animRef.current;
    if (!anim) return;
    const sel = select<HTMLCanvasElement, unknown>(anim);

    let baseRedrawTimer: ReturnType<typeof setTimeout> | null = null;

    const z = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([1, 8])
      .on("zoom", (ev: D3ZoomEvent<HTMLCanvasElement, unknown>) => {
        transformRef.current = ev.transform;
        // Redraw base immediately while zooming for accurate land transform.
        // Debounce heavy re-render so the wheel stays smooth.
        if (baseRedrawTimer) clearTimeout(baseRedrawTimer);
        baseRedrawTimer = setTimeout(() => drawBase(), 60);
        // Anim canvas keeps redrawing in its rAF loop; nothing else needed.
      })
      .on("end", () => {
        if (baseRedrawTimer) clearTimeout(baseRedrawTimer);
        drawBase();
      });

    sel.call(z);
    sel.on("dblclick.zoom", null); // disable double-click zoom (we'll add reset via UI)
    return () => {
      sel.on(".zoom", null);
      if (baseRedrawTimer) clearTimeout(baseRedrawTimer);
    };
  }, [drawBase]);

  // ────── Animation loop ──────
  useEffect(() => {
    const frame = (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.1) * simSpdRef.current;
      lastTsRef.current = ts;
      dashOffRef.current += dt * 30;
      ROUTES.forEach((r) => {
        vprogRef.current[r.id] = (vprogRef.current[r.id] + dt * 0.007) % 1;
      });
      drawAnim();
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [drawAnim]);

  // ────── Mouse: hit-test in world coords ──────
  const hitTest = useCallback(
    (sx: number, sy: number): RouteDef | null => {
      const t = transformRef.current;
      const [wx, wy] = screenToWorld(sx, sy, t.k, t.x, t.y);
      const tol = 14 / t.k; // 14px in screen → world
      const tol2 = tol * tol;
      let hit: RouteDef | null = null;
      ROUTES.forEach((r) => {
        const pts = routePtsRef.current[r.id]; if (!pts) return;
        const p = ptAtT(pts, vprogRef.current[r.id]); if (!p) return;
        const dx = p[0] - wx, dy = p[1] - wy;
        if (dx * dx + dy * dy < tol2) hit = r;
      });
      return hit;
    },
    [],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const hit = hitTest(sx, sy);
      e.currentTarget.style.cursor = hit ? "pointer" : "grab";
      onHoverRoute?.(hit, e.clientX, e.clientY);
    },
    [hitTest, onHoverRoute],
  );

  const onClickCanvas = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const hit = hitTest(sx, sy);
      onSelectRoute?.(hit ? hit.id : null);
    },
    [hitTest, onSelectRoute],
  );

  return (
    <div
      ref={wrapRef}
      style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#B6CAD8" }}
    >
      <canvas
        ref={baseRef}
        width={size.W}
        height={size.H}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
      <canvas
        ref={animRef}
        width={size.W}
        height={size.H}
        onMouseMove={onMouseMove}
        onMouseLeave={() => onHoverRoute?.(null, 0, 0)}
        onClick={onClickCanvas}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          cursor: "grab",
        }}
      />
    </div>
  );
}
