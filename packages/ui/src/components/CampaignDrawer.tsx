'use client';

/**
 * CampaignDrawer — inline slide-out drawer for campaign detail view.
 * Shows issues, funnel stages, actions, creative scores, and action buttons.
 */

import { FunnelStageMini } from './FunnelStageMini';

type Props = {
  campaignId: string;
  campaignName: string;
  geo: string;
  funnel: string;
  issues: Array<{
    stage: string;
    dropoffRate: number;
    severity: 'ok' | 'warning' | 'critical';
    description: string;
  }>;
  recommendedActions: Array<{
    action: string;
    estimatedCmaImpact: number;
    reason: string;
  }>;
  creativeScore?: { score: number; signals: string[] };
  creative?: { oldCopy: string; newCopy: string };
  appointments: number;
  inspections: number;
  transactions: number;
  benchmarkRates: { apptToInspRate: number; inspToTxnRate: number };
  onForceDignoze: () => void;
  onApplyAllocation: () => void;
  onClose: () => void;
};

function getPerformanceLabel(severity: 'ok' | 'warning' | 'critical'): { text: string; bgColor: string; textColor: string } {
  switch (severity) {
    case 'ok':
      return { text: 'On Target', bgColor: '#f0fdf4', textColor: '#166534' };
    case 'warning':
      return { text: 'Needs Review', bgColor: '#fefce8', textColor: '#b45309' };
    case 'critical':
      return { text: 'Critical', bgColor: '#fef2f2', textColor: '#991b1b' };
  }
}

function getIssueLabel(severity: 'ok' | 'warning' | 'critical'): { text: string; bgColor: string; textColor: string } {
  switch (severity) {
    case 'ok':
      return { text: 'OK', bgColor: '#d1fae5', textColor: '#065f46' };
    case 'warning':
      return { text: 'Warning', bgColor: '#fef3c7', textColor: '#92400e' };
    case 'critical':
      return { text: 'Critical', bgColor: '#fee2e2', textColor: '#991b1b' };
  }
}

export function CampaignDrawer({
  campaignName,
  geo,
  funnel,
  issues,
  recommendedActions,
  creativeScore,
  creative,
  appointments,
  inspections,
  transactions,
  benchmarkRates,
  onForceDignoze,
  onApplyAllocation,
  onClose,
}: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000000aa',
        zIndex: 40,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          width: '600px',
          background: '#0c0c0e',
          borderLeft: '1px solid #2a2a2d',
          overflowY: 'auto',
          zIndex: 50,
          animation: 'slideInRight 0.3s ease',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #2a2a2d', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#f0f0f0' }}>{campaignName}</h2>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>{geo} · {funnel}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '0 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Issues */}
          {issues.length > 0 && (
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#f0f0f0', textTransform: 'uppercase' }}>Issues</h3>
              {issues.map((issue, i) => (
                <div key={i} style={{ fontSize: '11px', marginBottom: '8px', padding: '8px', background: '#1a1a1d', borderRadius: '4px', borderLeft: '2px solid #f5a623' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                    <span style={{ color: '#f0f0f0' }}>{issue.stage}</span>
                    {(() => {
                      const label = getIssueLabel(issue.severity);
                      return (
                        <div
                          style={{
                            padding: '2px 6px',
                            background: label.bgColor,
                            color: label.textColor,
                            borderRadius: '3px',
                            fontSize: '9px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}
                        >
                          {label.text}
                        </div>
                      );
                    })()}
                  </div>
                  <div style={{ color: '#888' }}>{issue.description}</div>
                  <div style={{ color: '#f5a623', fontFamily: "'IBM Plex Mono', monospace", marginTop: '4px' }}>
                    {Math.round(issue.dropoffRate * 100)}% dropoff
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Funnel stages */}
          <FunnelStageMini
            appointmentCount={appointments}
            inspectionCount={inspections}
            transactionCount={transactions}
            benchmarkRates={benchmarkRates}
          />

          {/* Recommended actions */}
          {recommendedActions.length > 0 && (
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#f0f0f0', textTransform: 'uppercase' }}>Actions</h3>
              {recommendedActions.map((action, i) => (
                <div key={i} style={{ fontSize: '11px', marginBottom: '8px', padding: '8px', background: '#1a1a1d', borderRadius: '4px' }}>
                  <div style={{ fontWeight: 500, color: '#f0f0f0' }}>{action.action}</div>
                  <div style={{ color: '#888', marginTop: '2px' }}>{action.reason}</div>
                  <div style={{ color: '#2dc653', fontFamily: "'IBM Plex Mono', monospace", marginTop: '4px' }}>
                    +₹{Math.round(action.estimatedCmaImpact)} CMA impact
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Creative score */}
          {creativeScore && (
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#f0f0f0', textTransform: 'uppercase' }}>Creative Score</h3>
              <div style={{ padding: '8px', background: '#1a1a1d', borderRadius: '4px', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#888' }}>Score</span>
                  <span style={{ color: '#17a2b8', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}>
                    {(creativeScore.score * 100).toFixed(0)}%
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {creativeScore.signals.map((sig) => (
                    <span
                      key={sig}
                      style={{
                        padding: '2px 6px',
                        background: '#17a2b820',
                        border: '1px solid #17a2b840',
                        borderRadius: '3px',
                        color: '#17a2b8',
                        fontSize: '10px',
                      }}
                    >
                      {sig}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Creative variant */}
          {creative && (
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#f0f0f0', textTransform: 'uppercase' }}>Creative Variant</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10px' }}>
                <div style={{ padding: '8px', background: '#1a1a1d', borderRadius: '4px' }}>
                  <div style={{ color: '#888', marginBottom: '4px' }}>Current</div>
                  <div style={{ color: '#f0f0f0', lineHeight: 1.4 }}>{creative.oldCopy}</div>
                </div>
                <div style={{ padding: '8px', background: '#1a1a1d', borderRadius: '4px' }}>
                  <div style={{ color: '#2dc653', marginBottom: '4px' }}>Improved</div>
                  <div style={{ color: '#f0f0f0', lineHeight: 1.4 }}>{creative.newCopy}</div>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button
              onClick={onForceDignoze}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'none',
                border: '1px solid #f5a623',
                color: '#f5a623',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 500,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = '#f5a62315';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = 'none';
              }}
            >
              Force Diagnose
            </button>
            <button
              onClick={onApplyAllocation}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: '#17a2b8',
                border: 'none',
                color: '#0c0c0e',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 500,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = '#1eb4ca';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = '#17a2b8';
              }}
            >
              Apply Allocation
            </button>
          </div>
        </div>

        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>
      </div>
    </div>
  );
}
