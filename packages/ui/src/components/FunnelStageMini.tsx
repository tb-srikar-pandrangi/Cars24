/**
 * FunnelStageMini — 3-bar mini funnel visualization using CSS width.
 * Shows appointment → inspection → transaction flow with dropoff rates.
 */

type Props = {
  appointmentCount: number;
  inspectionCount: number;
  transactionCount: number;
  benchmarkRates: {
    apptToInspRate: number;
    inspToTxnRate: number;
  };
};

export function FunnelStageMini({
  appointmentCount,
  inspectionCount,
  transactionCount,
  benchmarkRates,
}: Props) {
  const maxVal = Math.max(appointmentCount, 1);
  const apptPct = 100;
  const inspPct = inspectionCount > 0 ? (inspectionCount / maxVal) * 100 : benchmarkRates.apptToInspRate * 100;
  const txnPct = transactionCount > 0 ? (transactionCount / maxVal) * 100 : benchmarkRates.apptToInspRate * benchmarkRates.inspToTxnRate * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
      {[
        { label: 'Appt', pct: apptPct, count: appointmentCount, color: '#f5a623' },
        { label: 'Insp', pct: inspPct, count: inspectionCount, color: '#2dc653' },
        { label: 'Txn', pct: txnPct, count: transactionCount, color: '#17a2b8' },
      ].map(({ label, pct, count, color }) => (
        <div key={label} style={{ fontSize: '11px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span style={{ color: '#888' }}>{label}</span>
            <span style={{ color: '#f0f0f0', fontFamily: "'IBM Plex Mono', monospace" }}>{count}</span>
          </div>
          <div
            style={{
              height: '12px',
              background: '#1a1a1c',
              borderRadius: '2px',
              overflow: 'hidden',
              border: `1px solid ${color}20`,
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(pct, 100)}%`,
                background: color,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
