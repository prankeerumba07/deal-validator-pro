
# CashKaro Flash Deal Validation Platform - Implementation Plan

## Phase 1: Database Schema Enhancement
Add new columns to support the detailed deal data model:
- **deals table**: Add `mrp`, `partner_sale_price`, `coupon_discount`, `prepay_discount`, `expected_payable`, `effective_price_claimed`
- **validation_results table**: Add `confidence_score`, `error_type`, `severity`, `actual_post_coupon`, `actual_final`, `stage_results` (JSONB), `ai_analysis`

## Phase 2: Enhanced Deal Input Form
- Full form with all pricing fields: MRP, partner sale price, coupon code & discount, prepay discount
- Cashback % and effective price claim
- Auto-calculate expected payable
- Notes field for special conditions
- "Run Validation" button that triggers AI validation

## Phase 3: Live Validation Progress
- Stage-by-stage progress indicator (8 stages)
- Spinner/tick/cross per stage
- Real-time log feed during validation
- Screenshot thumbnails per stage (when available)

## Phase 4: Result Dashboard with Price Waterfall
- Overall status badge (VERIFIED/FAILED/PARTIAL/UNVERIFIABLE)
- Confidence score meter
- Price waterfall chart: MRP → Sale → Post-Coupon → Post-Prepay → Payable → Effective
- Error details with severity badges (HIGH/MEDIUM/LOW)
- AI analysis panel (streamed from Lovable AI)
- Full validation log

## Phase 5: Partner Health Dashboard
- Pass rate per partner (7-day trend bar chart using Recharts)
- Top error types per partner
- Alert threshold indicator (below 80% pass rate)
- Summary cards

## Phase 6: Update Edge Functions
- Enhance `validate-deal` to populate new fields (confidence_score, error_type, severity, stage_results)
- Add AI analysis step using Lovable AI after validation
- Update `scrape-flash-deals` to extract richer deal metadata
