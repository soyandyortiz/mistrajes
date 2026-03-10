/**
 * AnimatedBackground
 * ─────────────────────────────────────────────────────────────────
 * Fondo animado global para las páginas públicas de MisTrajes.
 *
 * Técnicas combinadas:
 *   1. Dot grid  — patrón de puntos con radial-mask, fade animado
 *   2. Aurora    — línea superior luminosa con halo difuso pulsante
 *   3. Blobs     — 3 orbes de color con blur 90px, drift orgánico
 *   4. Vignette  — degradado radial en bordes para suavizar los blobs
 *
 * Rendimiento:
 *   • Solo usa `transform` y `opacity` en keyframes → 0 layout thrash
 *   • `will-change: transform` aplicado solo en los blobs
 *   • `pointer-events: none` + `aria-hidden` → sin impacto en UX/a11y
 *   • `@media (prefers-reduced-motion)` detiene todas las animaciones
 *   • `position: fixed` → no provoca reflows en el documento
 *
 * Temas:
 *   • Las variables --ab-* se definen en index.css para cada tema
 *   • Oscuro: opacidades altas, glow tecnológico, blobs vibrantes
 *   • Claro:  opacidades mínimas, tinta suave, sensación limpia
 * ─────────────────────────────────────────────────────────────────
 */
const AnimatedBackground = () => (
  <div aria-hidden="true" className="ab-root">

    {/* ── 1. Dot grid ── */}
    <div className="ab-grid" />

    {/* ── 2. Aurora top-line + halo difuso ── */}
    <div className="ab-aurora" />

    {/* ── 3. Blobs de color ── */}
    <div className="ab-blob ab-blob-1" />
    <div className="ab-blob ab-blob-2" />
    <div className="ab-blob ab-blob-3" />

    {/* ── 4. Vignette perimetral ── */}
    <div className="ab-vignette" />

  </div>
);

export default AnimatedBackground;
