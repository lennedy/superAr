import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { ReactComponent as PlantaSvg } from "assets/planta_p1_v6.svg";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

const AC_COLORS = {
  on: { dot: "#1db954", fill: "rgba(29,185,84,0.18)" },
  off: { dot: "#e53935", fill: "rgba(229,57,53,0.18)" },
  unmanaged: { dot: "#9e9e9e", fill: "rgba(158,158,158,0.12)" },
};

function centerPercentFromRects(el, overlayEl) {
  const r = el.getBoundingClientRect();
  const o = overlayEl.getBoundingClientRect();

  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;

  const leftPct = ((cx - o.left) / o.width) * 100;
  const topPct = ((cy - o.top) / o.height) * 100;

  return { left: `${leftPct}%`, top: `${topPct}%` };
}

// Lê o viewBox do SVG com fallback seguro
function getViewBox(svg) {
  const vb = svg.viewBox?.baseVal;
  if (vb && vb.width && vb.height) {
    return { x: vb.x, y: vb.y, width: vb.width, height: vb.height };
  }

  const attr = svg.getAttribute("viewBox");
  if (attr) {
    const [x, y, width, height] = attr.split(/\s+|,/).map(Number);
    if ([x, y, width, height].every((n) => Number.isFinite(n)) && width > 0 && height > 0) {
      return { x, y, width, height };
    }
  }

  const b = svg.getBBox();
  return { x: b.x, y: b.y, width: b.width || 1, height: b.height || 1 };
}

// Converte coordenadas do SVG (viewBox) para percentuais (overlay responsivo)
function toPercent({ x, y }, viewBox) {
  const leftPct = ((x - viewBox.x) / viewBox.width) * 100;
  const topPct = ((y - viewBox.y) / viewBox.height) * 100;
  return { left: `${leftPct}%`, top: `${topPct}%` };
}

// Centro do bbox de um elemento (em coordenadas do SVG)
function bboxCenter(el) {
  const b = el.getBBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

function Badge({ id, acState, tempC, left, top, onClick }) {
  let cfg = [];
  for (const state of acState) {
    cfg.push(AC_COLORS[state] ?? AC_COLORS.unmanaged);
  }

  return (
    <MDBox
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation(); // não dispara clique da sala por trás
        onClick?.(id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onClick?.(id);
        }
      }}
      sx={{
        position: "absolute",
        left,
        top,
        transform: "translate(-50%, -50%)",
        pointerEvents: "auto",
        cursor: "pointer",
        userSelect: "none",

        // ✅ Em xs vira "só bolinha"; em sm+ mantém o badge completo
        width: {
          xs: "clamp(14px, 2.4vw, 18px)",
          sm: acState.length == 3 ? "clamp(28px, 4.8vw, 60px)" : "clamp(28px, 3.2vw, 44px)",
        },
        height: {
          xs:
            acState.length === 3
              ? "clamp(22px, 12vw, 40px)"
              : acState.length === 2
              ? "clamp(18px, 10vw, 32px)"
              : "clamp(14px, 8.4vw, 29px)",
          sm: "auto",
        },
        borderRadius: { xs: "999px", sm: "12px" },
        px: { xs: 0, sm: "clamp(4px, 0.7vw, 8px)" },
        py: { xs: 0, sm: "clamp(3px, 0.6vw, 7px)" },
        border: { xs: "none", sm: "1px solid rgba(167, 163, 163, 0.15)" },
        boxShadow: { xs: 0, sm: 2 },

        display: acState === "unmanaged" ? "none" : "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: { xs: 0, sm: 0.5 },

        "&:hover": { boxShadow: { xs: 0, sm: 4 } },
        "&:focus-visible": {
          outline: "2px solid rgba(25,118,210,0.8)",
          outlineOffset: "2px",
        },
      }}
      title={id}
    >
      <MDBox
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: "center",
          justifyContent: "center",
          gap: { xs: 0.25, sm: 0.5 },
          width: { xs: "100%", sm: "auto" },
          height: { xs: "100%", sm: "auto" },
        }}
      >
        {Array.from({ length: acState.length }).map((_, idx) => (
          <MDBox
            key={`${id}-acdot-${idx}`}
            sx={{
              width: { xs: "clamp(10px, 2.0vw, 14px)", sm: "clamp(10px, 1.1vw, 14px)" },
              height: { xs: "clamp(10px, 2.0vw, 14px)", sm: "clamp(10px, 1.1vw, 14px)" },
              borderRadius: "50%",
              bgcolor: cfg[idx].dot,
              border: "1px solid rgba(0,0,0,0.15)",
              flexShrink: 0,
            }}
          />
        ))}
        {/* <MDBox
          sx={{
            // ✅ Em xs a bolinha ocupa o badge todo
            width: { xs: "100%", sm: "clamp(10px, 1.1vw, 14px)" },
            height: { xs: "100%", sm: "clamp(10px, 1.1vw, 14px)" },
            borderRadius: "50%",
            bgcolor: cfg[0].dot,
            border: "1px solid rgba(0,0,0,0.15)",
          }}
        /> */}
      </MDBox>

      {/* ✅ some automaticamente em xs */}
      <MDTypography
        variant="caption"
        sx={{
          lineHeight: 1,
          fontSize: "clamp(9px, 0.9vw, 12px)",
          whiteSpace: "nowrap",
          display: { xs: "none", sm: "block" },
        }}
      >
        {Number.isFinite(tempC) ? `${tempC.toFixed(1)}°C` : "--.-°C"}
      </MDTypography>
    </MDBox>
  );
}

Badge.propTypes = {
  id: PropTypes.string.isRequired,
  acState: PropTypes.oneOf(["on", "off", "unmanaged"]).isRequired,
  tempC: PropTypes.number,
  left: PropTypes.string.isRequired,
  top: PropTypes.string.isRequired,
  onClick: PropTypes.func,
};

Badge.defaultProps = {
  tempC: NaN,
  onClick: null,
};

export default function PlantaAr({ rooms, onRoomClick, className, style }) {
  const wrapperRef = useRef(null);

  const [badges, setBadges] = useState([]);
  const [svgRatio, setSvgRatio] = useState({ w: 1, h: 1 });

  const roomEntries = useMemo(() => Object.entries(rooms), [rooms]);

  // 0) Captura o viewBox para fixar aspect-ratio (1x só)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const updateRatio = () => {
      const svg = wrapper.querySelector("svg");
      if (!svg) return;
      const vb = getViewBox(svg);
      setSvgRatio({ w: vb.width || 1, h: vb.height || 1 });
    };

    // calcula logo que montar
    updateRatio();

    // recalcula se o wrapper mudar de tamanho (responsivo)
    const ro = new ResizeObserver(() => updateRatio());
    ro.observe(wrapper);

    return () => ro.disconnect();
  }, []);

  // 1) Aplica estilos/click nas salas e calcula badges (em %)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const svg = wrapper?.querySelector("svg");
    if (!svg) return;

    svg.setAttribute("preserveAspectRatio", "none");

    const nextBadges = [];

    roomEntries.forEach(([roomId, data]) => {
      const el = svg.querySelector(`#${CSS.escape(roomId)}`);
      if (!el) return;

      const cfg = AC_COLORS[data.acState] ?? AC_COLORS.unmanaged;

      el.style.fill = cfg.fill;
      el.style.cursor = "pointer";
      el.style.pointerEvents = "all";

      el.onclick = () => {
        if (onRoomClick) onRoomClick(roomId, data);
      };

      const overlayEl = wrapper; // o MDBox ref={wrapperRef} ocupa exatamente a mesma caixa do overlay
      const pos = centerPercentFromRects(el, overlayEl);

      nextBadges.push({
        id: roomId,
        acState: data.acState ?? "unmanaged",
        tempC: data.tempC,
        left: pos.left,
        top: pos.top,
      });
    });

    setBadges(nextBadges);
  }, [roomEntries, onRoomClick]);

  // 2) Recalcula posições em resize (mantém badges alinhados)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const svg = wrapper.querySelector("svg");
    if (!svg) return;

    const ro = new ResizeObserver(() => {
      const svgNow = wrapper.querySelector("svg");
      if (!svgNow) return;
      const nextBadges = [];

      roomEntries.forEach(([roomId, data]) => {
        const el = svgNow.querySelector(`#${CSS.escape(roomId)}`); // ✅ usar svgNow
        if (!el) return;

        const pos = centerPercentFromRects(el, wrapper); // ✅ usa rect real na tela

        nextBadges.push({
          id: roomId,
          acState: data.acState ?? "unmanaged",
          tempC: data.tempC,
          left: pos.left,
          top: pos.top,
        });
      });

      setBadges(nextBadges);
    });

    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [roomEntries]);

  return (
    <MDBox className={className} style={style} sx={{ width: "100%" }}>
      <MDBox
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: `${svgRatio.w} / ${svgRatio.h}`,
          minHeight: { xs: 240, sm: 360 },
          overflow: "hidden",
        }}
      >
        {/* ✅ gira SVG em xs */}
        <MDBox
          ref={wrapperRef}
          sx={{
            position: "absolute",
            inset: 0,
            transformOrigin: "center",
          }}
        >
          <PlantaSvg style={{ width: "100%", height: "100%", display: "block" }} />
        </MDBox>

        {/* ✅ gira overlay junto para não desalinhar badges */}
        <MDBox
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            transformOrigin: "center",
          }}
        >
          {badges.map((b) => (
            <Badge key={b.id} {...b} onClick={(roomId) => onRoomClick?.(roomId, rooms[roomId])} />
          ))}
        </MDBox>
      </MDBox>
    </MDBox>
  );
}

/* ===============================
   PROP VALIDATION
=================================*/
const roomShape = PropTypes.shape({
  acState: PropTypes.oneOf(["on", "off", "unmanaged"]).isRequired,
  tempC: PropTypes.number,
});

PlantaAr.propTypes = {
  rooms: PropTypes.objectOf(roomShape).isRequired,
  onRoomClick: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
};

PlantaAr.defaultProps = {
  onRoomClick: null,
  className: "",
  style: {},
};
