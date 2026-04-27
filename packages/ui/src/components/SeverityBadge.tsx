/**
 * SeverityBadge — color-coded status indicator.
 * Maps severity to CARS24 color palette with optional pulse animation.
 */

type Props = {
  severity: 'ok' | 'warning' | 'critical';
  pulse?: boolean;
  compact?: boolean;
};

const COLORS = {
  ok: '#2dc653',
  warning: '#ff9f1c',
  critical: '#e63946',
};

const LABELS = {
  ok: 'OK',
  warning: 'Warning',
  critical: 'Critical',
};

export function SeverityBadge({ severity, pulse, compact }: Props) {
  const color = COLORS[severity];
  const label = LABELS[severity];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? '4px' : '6px',
        padding: compact ? '2px 6px' : '4px 8px',
        backgroundColor: `${color}15`,
        border: `1px solid ${color}40`,
        borderRadius: '4px',
        fontSize: compact ? '11px' : '12px',
        color,
        fontWeight: 500,
        animation: pulse ? `pulse-${severity} 2s infinite` : undefined,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: compact ? '6px' : '8px',
          height: compact ? '6px' : '8px',
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />
      {!compact && label}
      <style>{`
        @keyframes pulse-ok { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes pulse-warning { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes pulse-critical { 0%, 100% { opacity: 1; box-shadow: 0 0 8px ${color}; } 50% { opacity: 0.8; box-shadow: 0 0 16px ${color}; } }
      `}</style>
    </span>
  );
}
