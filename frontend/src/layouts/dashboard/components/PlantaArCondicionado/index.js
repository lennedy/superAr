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

  // fallback: tenta parsear atributo viewBox="minX minY width height"
  const attr = svg.getAttribute("viewBox");
  if (attr) {
    const [x, y, width, height] = attr.split(/\s+|,/).map(Number);
    if ([x, y, width, height].every((n) => Number.isFinite(n)) && width > 0 && height > 0) {
      return { x, y, width, height };
    }
  }

  // último fallback: bbox do próprio svg (menos ideal)
  const b = svg.getBBox();
  return { x: b.x, y: b.y, width: b.width || 1, height: b.height || 1 };
}

// Converte coordenadas do SVG (viewBox) para percentuais (overlay responsivo)
function toPercent({ x, y }, viewBox) {
  const leftPct = ((x - viewBox.x) / viewBox.width) * 100;
  const topPct = ((y - viewBox.y) / viewBox.height) * 100;
  return {
    left: `${leftPct}%`,
    top: `${topPct}%`,
  };
}

// Centro do bbox de um elemento (em coordenadas do SVG)
function bboxCenter(el) {
  const b = el.getBBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

export default function PlantaAr({ rooms, onRoomClick, className, style }) {
  const wrapperRef = useRef(null);

  // Guarda a lista de badges com posição em %
  const [badges, setBadges] = useState([]);

  const roomEntries = useMemo(() => Object.entries(rooms), [rooms]);

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

      // clique na sala
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

  // 2) Recalcula posições em resize (importante: responsividade)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const svg = wrapper.querySelector("svg");
    if (!svg) return;

    const ro = new ResizeObserver(() => {
      const viewBox = getViewBox(svg);

      // Recalcula em cima do DOM atual (mais confiável que só reusar state)
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
      {/* Container RELATIVE para overlay absoluto */}
      <MDBox sx={{ position: "relative", width: "100%" }}>
        {/* SVG base */}
        <div ref={wrapperRef} style={{ width: "100%" }}>
          <PlantaSvg style={{ width: "100%", height: "auto", display: "block" }} />
        </div>

        {/* Overlay: ocupa a mesma área do SVG */}
        <MDBox
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none", // não bloqueia clique nas salas
          }}
        >
          {badges.map((b) => {
            const cfg = AC_COLORS[b.acState] ?? AC_COLORS.unmanaged;

            return (
              <MDBox
                key={b.id}
                sx={{
                  position: "absolute",
                  left: b.left,
                  top: b.top,
                  transform: "translate(-50%, -50%)",
                  width: 40,
                  borderRadius: "12px",
                  px: 1,
                  py: 0.75,
                  bgcolor: "rgba(255,255,255,0.90)",
                  border: "1px solid rgba(0,0,0,0.15)",
                  boxShadow: 2,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0.5,

                  // IMPORTANTÍSSIMO:
                  // mantém clique passando “através” do badge para a sala
                  pointerEvents: "none",
                }}
                title={b.id}
              >
                {/* Círculo status em cima */}
                <MDBox
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    bgcolor: cfg.dot,
                    border: "1px solid rgba(0,0,0,0.15)",
                  }}
                />

                {/* Temperatura embaixo */}
                <MDTypography variant="caption" sx={{ lineHeight: 1 }}>
                  {Number.isFinite(b.tempC) ? `${b.tempC.toFixed(1)}°C` : "--.-°C"}
                </MDTypography>
              </MDBox>
            );
          })}
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
