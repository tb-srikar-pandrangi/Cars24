type Props = {
  severity: 'ok' | 'warning' | 'critical';
  pulse?: boolean;
  compact?: boolean;
};

const COLORS = {
  ok: '#27ae60',
  warning: '#f39c12',
  critical: '#e74c3c',
};

const BG_COLORS = {
  ok: '#d5f4e6',
  warning: '#fef5e7',
  critical: '#fadbd8',
};

const LABELS = {
  ok: 'Healthy',
  warning: 'Warning',
  critical: 'Critical',
};

export function SeverityBadge({ severity, pulse, compact }: Props) {
  const color = COLORS[severity];
  const bgColor = BG_COLORS[severity];
  const label = LABELS[severity];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? '4px' : '6px',
        padding: compact ? '4px 8px' : '6px 12px',
        backgroundColor: bgColor,
        border: `1px solid ${color}30`,
        borderRadius: '12px',
        fontSize: compact ? '11px' : '12px',
        color,
        fontWeight: 600,
        animation: pulse ? `pulse-${severity} 2s infinite` : undefined,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: compact ? '6px' : '8px',
          height: compact ? '6px' : '8px',
          borderRadius: '50%',
          backgroundColor: color,
          flexShrink: 0,
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
