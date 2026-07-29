/**
 * Simplified human silhouette — ported directly from the validated
 * prototype (UI Concepts/v7_bodymap_calendar_split.html, viewBox 0 0 280
 * 560). Same figure serves both Front and Back views (PRD-Timeline-View.md
 * §5.2); only the set of visible hotspots changes, not the figure itself.
 */
export function BodyFigureSvg() {
  return (
    <svg viewBox="0 0 280 560" width="100%" height="100%" style={{ display: 'block' }}>
      <g fill="#dfe3f0" stroke="#c7cce3" strokeWidth={1.5}>
        <circle cx={140} cy={42} r={30} />
        <rect x={115} y={70} width={50} height={22} rx={8} />
        <path d="M90,92 Q140,78 190,92 L200,220 Q140,250 80,220 Z" />
        <rect x={55} y={100} width={26} height={140} rx={13} />
        <rect x={199} y={100} width={26} height={140} rx={13} />
        <rect x={45} y={235} width={24} height={60} rx={11} />
        <rect x={211} y={235} width={24} height={60} rx={11} />
        <circle cx={57} cy={300} r={12} />
        <circle cx={223} cy={300} r={12} />
        <rect x={105} y={215} width={70} height={90} rx={14} />
        <rect x={103} y={300} width={32} height={150} rx={14} />
        <rect x={145} y={300} width={32} height={150} rx={14} />
        <rect x={98} y={445} width={34} height={70} rx={12} />
        <rect x={148} y={445} width={34} height={70} rx={12} />
        <ellipse cx={115} cy={530} rx={20} ry={10} />
        <ellipse cx={165} cy={530} rx={20} ry={10} />
      </g>
    </svg>
  );
}
