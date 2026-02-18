import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { ReactComponent as PlantaSvg } from "assets/planta_p1.svg";
import MDBox from "components/MDBox";

const SVG_NS = "http://www.w3.org/2000/svg";

const AC_COLORS = {
  on: { dot: "#1db954", fill: "rgba(29,185,84,0.18)" },
  off: { dot: "#e53935", fill: "rgba(229,57,53,0.18)" },
  unmanaged: { dot: "#9e9e9e", fill: "rgba(158,158,158,0.12)" },
};

function ensureOverlayLayer(svgEl) {
  let layer = svgEl.querySelector("#ac-overlays");
  if (!layer) {
    layer = document.createElementNS(SVG_NS, "g");
    layer.setAttribute("id", "ac-overlays");
    layer.setAttribute("pointer-events", "none");
    svgEl.appendChild(layer);
  }
  return layer;
}

function clearOverlayLayer(svgEl) {
  const layer = svgEl.querySelector("#ac-overlays");
  if (layer) layer.innerHTML = "";
}

function bboxCenter(el) {
  const b = el.getBBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

function drawBadge(overlayLayer, { x, y, tempC, acState }) {
  const cfg = AC_COLORS[acState] ?? AC_COLORS.unmanaged;

  // ===== Dimensões do badge (ajuste aqui) =====
  const W = 34; // largura
  const H = 44; // altura
  const R = 10; // raio da borda
  const DOT_R = 7; // raio do círculo
  const PADDING_TOP = 12;
  const PADDING_BOTTOM = 12;

  // Grupo do badge no centro da sala
  const g = document.createElementNS(SVG_NS, "g");
  g.setAttribute("transform", `translate(${x}, ${y})`);

  // Fundo (retângulo vertical)
  const card = document.createElementNS(SVG_NS, "rect");
  card.setAttribute("x", `${-W / 2}`);
  card.setAttribute("y", `${-H / 2}`);
  card.setAttribute("width", `${W}`);
  card.setAttribute("height", `${H}`);
  card.setAttribute("rx", `${R}`);
  card.setAttribute("fill", "rgba(255,255,255,0.85)");
  card.setAttribute("stroke", "rgba(0,0,0,0.20)");
  card.setAttribute("stroke-width", "0.6");

  // Círculo status (em cima)
  const dot = document.createElementNS(SVG_NS, "circle");
  dot.setAttribute("cx", "0");
  dot.setAttribute("cy", `${-H / 2 + PADDING_TOP}`); // topo do card + padding
  dot.setAttribute("r", `${DOT_R}`);
  dot.setAttribute("fill", cfg.dot);
  dot.setAttribute("stroke", "rgba(0,0,0,0.20)");
  dot.setAttribute("stroke-width", "0.6");

  // Texto temperatura (embaixo)
  const text = document.createElementNS(SVG_NS, "text");
  text.setAttribute("x", "0");
  text.setAttribute("y", `${H / 2 - PADDING_BOTTOM + 4}`); // +4 pra alinhar baseline
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("font-size", "10");
  text.setAttribute("font-family", "Arial, sans-serif");
  text.setAttribute("fill", "rgba(0,0,0,0.85)");
  text.textContent = Number.isFinite(tempC) ? `${tempC.toFixed(1)}°C` : "--.-°C";

  // (Opcional) linha separadora entre o círculo e o texto
  const sep = document.createElementNS(SVG_NS, "line");
  sep.setAttribute("x1", `${-W / 2 + 6}`);
  sep.setAttribute("x2", `${W / 2 - 6}`);
  sep.setAttribute("y1", `${-H / 2 + 22}`);
  sep.setAttribute("y2", `${-H / 2 + 22}`);
  sep.setAttribute("stroke", "rgba(0,0,0,0.12)");
  sep.setAttribute("stroke-width", "0.6");

  g.appendChild(card);
  g.appendChild(dot);
  g.appendChild(sep);
  g.appendChild(text);

  overlayLayer.appendChild(g);
}

export default function PlantaAr({ rooms, onRoomClick, className, style }) {
  const wrapperRef = useRef(null);

  const [selectedRoom, setSelectedRoom] = useState(null);

  const roomEntries = useMemo(() => Object.entries(rooms), [rooms]);

  useEffect(() => {
    const svg = wrapperRef.current?.querySelector("svg");
    if (!svg) return;

    ensureOverlayLayer(svg);
    clearOverlayLayer(svg);

    const overlay = ensureOverlayLayer(svg);

    roomEntries.forEach(([roomId, data]) => {
      const el = svg.querySelector(`#${CSS.escape(roomId)}`);
      if (!el) return;

      const cfg = AC_COLORS[data.acState] ?? AC_COLORS.unmanaged;

      el.style.fill = cfg.fill;
      el.style.cursor = "pointer";

      el.onclick = () => {
        setSelectedRoom(roomId);
        if (onRoomClick) {
          onRoomClick(roomId, data);
        }
      };

      const { x, y } = bboxCenter(el);
      drawBadge(overlay, {
        x,
        y,
        tempC: data.tempC,
        acState: data.acState,
      });
    });
  }, [roomEntries, onRoomClick]);

  return (
    <MDBox>
      {/* <div className={className} style={style}> */}
      <div ref={wrapperRef}>
        <PlantaSvg style={{ width: "100%", height: "auto" }} />
      </div>
      {/* </div> */}
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
  /**
   * Objeto com estado das salas
   * chave = id do SVG (ex: "room-025")
   */
  rooms: PropTypes.objectOf(roomShape).isRequired,

  /**
   * Callback ao clicar na sala
   */
  onRoomClick: PropTypes.func,

  /**
   * CSS class do container
   */
  className: PropTypes.string,

  /**
   * style inline
   */
  style: PropTypes.object,
};

PlantaAr.defaultProps = {
  onRoomClick: null,
  className: "",
  style: {},
};
