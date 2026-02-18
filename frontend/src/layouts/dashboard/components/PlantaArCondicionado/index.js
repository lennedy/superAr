import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { ReactComponent as PlantaSvg } from "assets/planta_p1.svg";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

const AC_COLORS = {
  on: { dot: "#1db954", fill: "rgba(29,185,84,0.18)" },
  off: { dot: "#e53935", fill: "rgba(229,57,53,0.18)" },
  unmanaged: { dot: "#9e9e9e", fill: "rgba(158,158,158,0.12)" },
};

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
  const cfg = AC_COLORS[acState] ?? AC_COLORS.unmanaged;

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
        pointerEvents: "auto", // ✅ permite clicar

        // badge responsivo
        width: "clamp(28px, 3.2vw, 44px)",
        borderRadius: "12px",
        px: "clamp(4px, 0.7vw, 8px)",
        py: "clamp(3px, 0.6vw, 7px)",
        border: "1px solid rgba(167, 163, 163, 0.15)",
        boxShadow: 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0.5,
        cursor: "pointer",
        userSelect: "none",

        "&:hover": { boxShadow: 4 },
        "&:focus-visible": { outline: "2px solid rgba(25,118,210,0.8)", outlineOffset: "2px" },
      }}
      title={id}
    >
      <MDBox
        sx={{
          width: "clamp(10px, 1.1vw, 14px)",
          height: "clamp(10px, 1.1vw, 14px)",
          borderRadius: "50%",
          bgcolor: cfg.dot,
          border: "1px solid rgba(0,0,0,0.15)",
        }}
      />
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

  // lista de badges com posição em %
  const [badges, setBadges] = useState([]);

  // ratio do SVG p/ container responsivo
  const [svgRatio, setSvgRatio] = useState({ w: 1, h: 1 });

  const roomEntries = useMemo(() => Object.entries(rooms), [rooms]);

  // 0) Captura o viewBox para fixar aspect-ratio (1x só)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const svg = wrapper?.querySelector("svg");
    if (!svg) return;

    const vb = getViewBox(svg);
    setSvgRatio({ w: vb.width || 1, h: vb.height || 1 });
  }, []);

  // 1) Aplica estilos/click nas salas e calcula badges (em %)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const svg = wrapper?.querySelector("svg");
    if (!svg) return;

    const viewBox = getViewBox(svg);
    const nextBadges = [];

    roomEntries.forEach(([roomId, data]) => {
      const el = svg.querySelector(`#${CSS.escape(roomId)}`);
      if (!el) return;

      const cfg = AC_COLORS[data.acState] ?? AC_COLORS.unmanaged;

      // pinta sala
      el.style.fill = cfg.fill;
      el.style.cursor = "pointer";
      el.style.pointerEvents = "all";

      // clique na sala (não bloqueado pelo overlay)
      el.onclick = () => {
        if (onRoomClick) onRoomClick(roomId, data);
      };

      // posição do badge (centro da sala -> %)
      const center = bboxCenter(el);
      const pos = toPercent(center, viewBox);

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
      const viewBox = getViewBox(svg);
      const nextBadges = [];

      roomEntries.forEach(([roomId, data]) => {
        const el = svg.querySelector(`#${CSS.escape(roomId)}`);
        if (!el) return;

        const center = bboxCenter(el);
        const pos = toPercent(center, viewBox);

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
      {/* Container com proporção do SVG (aqui está a responsividade correta) */}
      <MDBox
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: `${svgRatio.w} / ${svgRatio.h}`,
          overflow: "hidden",
        }}
      >
        {/* SVG ocupa 100% do container */}
        <MDBox ref={wrapperRef} sx={{ position: "absolute", inset: 0 }}>
          <PlantaSvg style={{ width: "100%", height: "100%", display: "block" }} />
        </MDBox>

        {/* Overlay ocupa 100% do mesmo container */}
        <MDBox sx={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
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
