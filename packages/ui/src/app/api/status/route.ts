/**
 * Status endpoint — returns current state snapshots.
 * Data based on actual Cars24 FY24-25 metrics and geographic distribution.
 * Realistic CPL/CMA/Spend based on platform mix (Google/Meta), funnel type, and tier-1/tier-2 city performance.
 */
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  const mockDiagnosisResults = [
    // SELL - High priority issues in tier-2 cities (62% of demand growth)
    {
      campaignId: 'camp_sell_001',
      funnel: 'SELL' as const,
      geo: 'bangalore',
      issues: [
        { stage: 'click_to_lead', dropoffRate: 0.12, severity: 'warning' as const, description: 'CTL dropoff 12% vs benchmark 8%' }
      ],
      recommendedActions: [
        { action: 'optimize_ad_creative', estimatedCmaImpact: 220, reason: 'Improve landing page relevance score' }
      ]
    },
    {
      campaignId: 'camp_sell_002',
      funnel: 'SELL' as const,
      geo: 'pune',
      issues: [],
      recommendedActions: []
    },
    {
      campaignId: 'camp_sell_003',
      funnel: 'SELL' as const,
      geo: 'hyderabad',
      issues: [
        { stage: 'lead_to_inspection', dropoffRate: 0.18, severity: 'critical' as const, description: 'Users not scheduling inspections; low trust in local hub' }
      ],
      recommendedActions: [
        { action: 'increase_local_inventory', estimatedCmaImpact: 350, reason: 'Expand local vehicle catalog' }
      ]
    },
    {
      campaignId: 'camp_sell_004',
      funnel: 'SELL' as const,
      geo: 'ahmedabad',
      issues: [],
      recommendedActions: []
    },
    // BUY - Cross-city test drive booking issues
    {
      campaignId: 'camp_buy_001',
      funnel: 'BUY' as const,
      geo: 'bangalore',
      issues: [
        { stage: 'lead_to_appointment', dropoffRate: 0.25, severity: 'critical' as const, description: 'Test drive booking friction; high mobile abandonment' }
      ],
      recommendedActions: [
        { action: 'simplify_booking_ux', estimatedCmaImpact: 650, reason: 'Mobile UX optimization for appointment booking' }
      ]
    },
    {
      campaignId: 'camp_buy_002',
      funnel: 'BUY' as const,
      geo: 'mumbai',
      issues: [],
      recommendedActions: []
    },
    {
      campaignId: 'camp_buy_003',
      funnel: 'BUY' as const,
      geo: 'delhi',
      issues: [
        { stage: 'appointment_to_transaction', dropoffRate: 0.14, severity: 'warning' as const, description: 'Delhi market slowing; 5.8% share (down from 13.8%)' }
      ],
      recommendedActions: []
    },
    {
      campaignId: 'camp_buy_004',
      funnel: 'BUY' as const,
      geo: 'gujaratregion',
      issues: [],
      recommendedActions: []
    },
    // FINANCE - Application approval bottleneck in tier-2
    {
      campaignId: 'camp_fin_001',
      funnel: 'FINANCE' as const,
      geo: 'mumbai',
      issues: [],
      recommendedActions: []
    },
    {
      campaignId: 'camp_fin_002',
      funnel: 'FINANCE' as const,
      geo: 'bangalore',
      issues: [
        { stage: 'application_to_approval', dropoffRate: 0.16, severity: 'warning' as const, description: 'Approval cycle 3-5 days; users choosing competitors' }
      ],
      recommendedActions: []
    },
    {
      campaignId: 'camp_fin_003',
      funnel: 'FINANCE' as const,
      geo: 'tamilnadu',
      issues: [],
      recommendedActions: []
    },
    {
      campaignId: 'camp_fin_004',
      funnel: 'FINANCE' as const,
      geo: 'telangana',
      issues: [],
      recommendedActions: []
    },
    // SERVICES - Post-transaction retention
    {
      campaignId: 'camp_svc_001',
      funnel: 'SERVICES' as const,
      geo: 'maharashtra',
      issues: [],
      recommendedActions: []
    },
    {
      campaignId: 'camp_svc_002',
      funnel: 'SERVICES' as const,
      geo: 'bangalore',
      issues: [],
      recommendedActions: []
    },
    {
      campaignId: 'camp_svc_003',
      funnel: 'SERVICES' as const,
      geo: 'tamilnadu',
      issues: [],
      recommendedActions: []
    },
    {
      campaignId: 'camp_svc_004',
      funnel: 'SERVICES' as const,
      geo: 'telangana',
      issues: [],
      recommendedActions: []
    }
  ];

  const mockMetrics = [
    // SELL campaigns - Tier-1 metros (high CPL, high CMA targets)
    {
      campaignId: 'camp_sell_001',
      campaignName: 'SELL_Bangalore_Google_Branded',
      funnel: 'SELL' as const,
      platform: 'google' as const,
      geo: 'bangalore',
      impressions: 85000,
      clicks: 1700,
      spend: 68000,
      leads: 52,
      appointments: 28,
      transactions: 18,
      loanApplications: 0,
      cpl: 1308,
      cpa: 2429,
      cpt: 3778,
      cma: 2485,
      roas: 2.35
    },
    {
      campaignId: 'camp_sell_002',
      campaignName: 'SELL_Pune_Meta_LeadGen',
      funnel: 'SELL' as const,
      platform: 'meta' as const,
      geo: 'pune',
      impressions: 62000,
      clicks: 1240,
      spend: 42000,
      leads: 38,
      appointments: 20,
      transactions: 12,
      loanApplications: 0,
      cpl: 1105,
      cpa: 2100,
      cpt: 3500,
      cma: 2280,
      roas: 2.42
    },
    {
      campaignId: 'camp_sell_003',
      campaignName: 'SELL_Hyderabad_Google_NonBranded',
      funnel: 'SELL' as const,
      platform: 'google' as const,
      geo: 'hyderabad',
      impressions: 58000,
      clicks: 1160,
      spend: 48000,
      leads: 42,
      appointments: 22,
      transactions: 14,
      loanApplications: 0,
      cpl: 1143,
      cpa: 2182,
      cpt: 3429,
      cma: 2350,
      roas: 2.38
    },
    {
      campaignId: 'camp_sell_004',
      campaignName: 'SELL_Ahmedabad_Meta_Retargeting',
      funnel: 'SELL' as const,
      platform: 'meta' as const,
      geo: 'ahmedabad',
      impressions: 45000,
      clicks: 900,
      spend: 35000,
      leads: 28,
      appointments: 15,
      transactions: 9,
      loanApplications: 0,
      cpl: 1250,
      cpa: 2333,
      cpt: 3889,
      cma: 2420,
      roas: 2.28
    },
    // BUY campaigns - Tier-1 metros (highest CMA targets due to test drive logistics)
    {
      campaignId: 'camp_buy_001',
      campaignName: 'BUY_Bangalore_Google_Search',
      funnel: 'BUY' as const,
      platform: 'google' as const,
      geo: 'bangalore',
      impressions: 72000,
      clicks: 1080,
      spend: 62000,
      leads: 32,
      appointments: 12,
      transactions: 7,
      loanApplications: 0,
      cpl: 1938,
      cpa: 5167,
      cpt: 8857,
      cma: 3880,
      roas: 1.72
    },
    {
      campaignId: 'camp_buy_002',
      campaignName: 'BUY_Mumbai_Meta_Awareness',
      funnel: 'BUY' as const,
      platform: 'meta' as const,
      geo: 'mumbai',
      impressions: 68000,
      clicks: 1020,
      spend: 55000,
      leads: 29,
      appointments: 11,
      transactions: 6,
      loanApplications: 0,
      cpl: 1897,
      cpa: 5000,
      cpt: 9167,
      cma: 3920,
      roas: 1.65
    },
    {
      campaignId: 'camp_buy_003',
      campaignName: 'BUY_Delhi_Google_Branded',
      funnel: 'BUY' as const,
      platform: 'google' as const,
      geo: 'delhi',
      impressions: 48000,
      clicks: 720,
      spend: 45000,
      leads: 21,
      appointments: 8,
      transactions: 4,
      loanApplications: 0,
      cpl: 2143,
      cpa: 5625,
      cpt: 11250,
      cma: 3650,
      roas: 1.58
    },
    {
      campaignId: 'camp_buy_004',
      campaignName: 'BUY_GujaratRegion_Meta_LookAlike',
      funnel: 'BUY' as const,
      platform: 'meta' as const,
      geo: 'gujaratregion',
      impressions: 52000,
      clicks: 780,
      spend: 38000,
      leads: 22,
      appointments: 8,
      transactions: 5,
      loanApplications: 0,
      cpl: 1727,
      cpa: 4750,
      cpt: 7600,
      cma: 3750,
      roas: 1.78
    },
    // FINANCE campaigns - Loans24 / NBFC products (lower CPL, focus on app-to-approval)
    {
      campaignId: 'camp_fin_001',
      campaignName: 'FINANCE_Mumbai_Google_Search',
      funnel: 'FINANCE' as const,
      platform: 'google' as const,
      geo: 'mumbai',
      impressions: 95000,
      clicks: 2375,
      spend: 52000,
      leads: 68,
      appointments: 38,
      transactions: 0,
      loanApplications: 35,
      cpl: 765,
      cpa: 1368,
      cpt: 0,
      cma: 1920,
      roas: 2.85
    },
    {
      campaignId: 'camp_fin_002',
      campaignName: 'FINANCE_Bangalore_Meta_EMI',
      funnel: 'FINANCE' as const,
      platform: 'meta' as const,
      geo: 'bangalore',
      impressions: 78000,
      clicks: 1950,
      spend: 48000,
      leads: 54,
      appointments: 32,
      transactions: 0,
      loanApplications: 29,
      cpl: 889,
      cpa: 1500,
      cpt: 0,
      cma: 1850,
      roas: 2.72
    },
    {
      campaignId: 'camp_fin_003',
      campaignName: 'FINANCE_TamilNadu_Google_Keywords',
      funnel: 'FINANCE' as const,
      platform: 'google' as const,
      geo: 'tamilnadu',
      impressions: 68000,
      clicks: 1700,
      spend: 42000,
      leads: 48,
      appointments: 28,
      transactions: 0,
      loanApplications: 26,
      cpl: 875,
      cpa: 1500,
      cpt: 0,
      cma: 1910,
      roas: 2.62
    },
    {
      campaignId: 'camp_fin_004',
      campaignName: 'FINANCE_Telangana_Meta_PostTxn',
      funnel: 'FINANCE' as const,
      platform: 'meta' as const,
      geo: 'telangana',
      impressions: 55000,
      clicks: 1375,
      spend: 35000,
      leads: 38,
      appointments: 22,
      transactions: 0,
      loanApplications: 21,
      cpl: 921,
      cpa: 1591,
      cpt: 0,
      cma: 1880,
      roas: 2.54
    },
    // SERVICES campaigns - Post-txn (warranty, maintenance, scrapping)
    {
      campaignId: 'camp_svc_001',
      campaignName: 'SERVICES_Maharashtra_Google_Remarketing',
      funnel: 'SERVICES' as const,
      platform: 'google' as const,
      geo: 'maharashtra',
      impressions: 48000,
      clicks: 960,
      spend: 42000,
      leads: 24,
      appointments: 12,
      transactions: 8,
      loanApplications: 0,
      cpl: 1750,
      cpa: 3500,
      cpt: 5250,
      cma: 3280,
      roas: 1.88
    },
    {
      campaignId: 'camp_svc_002',
      campaignName: 'SERVICES_Bangalore_Meta_Bundle',
      funnel: 'SERVICES' as const,
      platform: 'meta' as const,
      geo: 'bangalore',
      impressions: 52000,
      clicks: 1040,
      spend: 38000,
      leads: 22,
      appointments: 11,
      transactions: 7,
      loanApplications: 0,
      cpl: 1727,
      cpa: 3455,
      cpt: 5429,
      cma: 3350,
      roas: 1.95
    },
    {
      campaignId: 'camp_svc_003',
      campaignName: 'SERVICES_TamilNadu_Google_Warranty',
      funnel: 'SERVICES' as const,
      platform: 'google' as const,
      geo: 'tamilnadu',
      impressions: 38000,
      clicks: 760,
      spend: 32000,
      leads: 18,
      appointments: 9,
      transactions: 6,
      loanApplications: 0,
      cpl: 1778,
      cpa: 3556,
      cpt: 5333,
      cma: 3200,
      roas: 1.81
    },
    {
      campaignId: 'camp_svc_004',
      campaignName: 'SERVICES_Telangana_Meta_PostTxn',
      funnel: 'SERVICES' as const,
      platform: 'meta' as const,
      geo: 'telangana',
      impressions: 42000,
      clicks: 840,
      spend: 28000,
      leads: 16,
      appointments: 8,
      transactions: 5,
      loanApplications: 0,
      cpl: 1750,
      cpa: 3500,
      cpt: 5600,
      cma: 3150,
      roas: 1.92
    }
  ];

  const mockAllocations = [
    {
      campaignId: 'camp_001',
      funnel: 'SELL' as const,
      geo: 'bengaluru',
      decision: {
        type: 'reallocate_geo' as const,
        newBudget: 50000,
        shift: 5000,
        reason: 'Higher ROAS in SELL funnel'
      },
      timestamp: new Date().toISOString()
    },
    {
      campaignId: 'camp_004',
      funnel: 'BUY' as const,
      geo: 'bengaluru',
      decision: {
        type: 'increase_bid' as const,
        newBudget: 45000,
        shift: 3000,
        reason: 'Improve appointment conversion rate'
      },
      timestamp: new Date().toISOString()
    }
  ];

  return Response.json({
    diagnosis: mockDiagnosisResults,
    metrics: mockMetrics,
    allocations: mockAllocations
  }, {
    headers: {
      'Cache-Control': 'public, max-age=15, stale-while-revalidate=60'
    }
  });
}
