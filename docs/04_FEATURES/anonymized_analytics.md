# Anonymized Data Analytics Guide

**Purpose:** Query patterns from anonymized user data (the MOAT) for ML training and product insights.  
**Created:** January 12, 2026

---

## Overview

When users delete their accounts, their personal data is removed but their trading patterns are anonymized (user_id set to NULL). This anonymized data is valuable for:

1. **Training ML models** for tilt detection
2. **Understanding behavioral patterns** across all users
3. **Improving strategy validation** rules
4. **Product analytics** and feature development

---

## Quick Stats View

```sql
-- Check current anonymization stats
SELECT * FROM public.data_anonymization_stats;
```

This returns counts of active vs anonymized records for each MOAT table.

---

## Common Queries

### 1. Behavioral Pattern Analysis

```sql
-- Analyze tilt signals from anonymized data
SELECT 
  event_type,
  COUNT(*) as occurrences,
  AVG((event_data->>'tiltScore')::numeric) as avg_tilt_score,
  MIN((event_data->>'tiltScore')::numeric) as min_tilt,
  MAX((event_data->>'tiltScore')::numeric) as max_tilt
FROM behavioral_data
WHERE user_id IS NULL  -- Anonymized data only
  AND event_type = 'tilt_signal_detected'
GROUP BY event_type;
```

```sql
-- Compare active users vs anonymized patterns
SELECT 
  CASE WHEN user_id IS NULL THEN 'Anonymized' ELSE 'Active' END as cohort,
  COUNT(*) as event_count,
  AVG((event_data->>'tiltScore')::numeric) as avg_tilt
FROM behavioral_data
WHERE event_type = 'tilt_signal_detected'
GROUP BY CASE WHEN user_id IS NULL THEN 'Anonymized' ELSE 'Active' END;
```

### 2. Revenge Trade Patterns

```sql
-- Analyze revenge trading patterns from anonymized data
SELECT 
  DATE_TRUNC('hour', timestamp) as hour_of_day,
  COUNT(*) as revenge_trades,
  AVG((event_data->>'timeSinceLastLoss')::numeric) as avg_time_since_loss_min,
  AVG((event_data->>'sizeIncrease')::numeric) as avg_size_increase_pct
FROM behavioral_data
WHERE user_id IS NULL
  AND event_type = 'revenge_trade_detected'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY revenge_trades DESC
LIMIT 10;
```

### 3. Session Timing Analysis

```sql
-- When do traders experience most tilt?
SELECT 
  EXTRACT(HOUR FROM timestamp) as hour,
  EXTRACT(DOW FROM timestamp) as day_of_week,
  COUNT(*) as tilt_events,
  AVG((event_data->>'tiltScore')::numeric) as avg_tilt
FROM behavioral_data
WHERE user_id IS NULL
  AND event_type IN ('tilt_signal_detected', 'near_violation')
GROUP BY EXTRACT(HOUR FROM timestamp), EXTRACT(DOW FROM timestamp)
ORDER BY tilt_events DESC;
```

### 4. Trade Pattern Analysis

```sql
-- Analyze trading patterns from anonymized trades
SELECT 
  symbol,
  side,
  COUNT(*) as trade_count,
  AVG(pnl) as avg_pnl,
  SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::float / COUNT(*) as win_rate,
  AVG(quantity) as avg_size
FROM trades
WHERE user_id IS NULL  -- Anonymized only
  AND status = 'closed'
  AND pnl IS NOT NULL
GROUP BY symbol, side
ORDER BY trade_count DESC;
```

### 5. Strategy Effectiveness (Parsed Rules Only)

```sql
-- Analyze which parsed rule patterns correlate with success
SELECT 
  parsed_rules->'entry_conditions'->0->>'indicator' as primary_indicator,
  parsed_rules->'position_sizing'->>'method' as sizing_method,
  COUNT(*) as strategy_count
FROM strategies
WHERE user_id IS NULL  -- Anonymized only
  AND parsed_rules IS NOT NULL
  AND parsed_rules != '{}'::jsonb
GROUP BY 
  parsed_rules->'entry_conditions'->0->>'indicator',
  parsed_rules->'position_sizing'->>'method'
ORDER BY strategy_count DESC;
```

### 6. Challenge Outcome Analysis

```sql
-- What patterns lead to challenge failure?
SELECT 
  status,
  COUNT(*) as challenge_count,
  AVG(current_pnl) as avg_final_pnl,
  AVG(EXTRACT(DAY FROM (end_date - start_date))) as avg_duration_days
FROM challenges
WHERE user_id IS NULL  -- Anonymized only
  AND status IN ('passed', 'failed')
GROUP BY status;
```

---

## ML Training Data Exports

### Export Behavioral Data for ML

```sql
-- Export for tilt detection model training
COPY (
  SELECT 
    event_type,
    event_data,
    session_context,
    timestamp,
    EXTRACT(HOUR FROM timestamp) as hour,
    EXTRACT(DOW FROM timestamp) as day_of_week
  FROM behavioral_data
  WHERE user_id IS NULL
    AND event_type IN (
      'tilt_signal_detected',
      'revenge_trade_detected', 
      'near_violation',
      'violation_prevented'
    )
) TO '/tmp/tilt_training_data.csv' WITH CSV HEADER;
```

### Export Trade Sequences for Pattern Recognition

```sql
-- Get trade sequences (grouped by session)
WITH sessions AS (
  SELECT 
    session_context->>'session_id' as session_id,
    symbol,
    side,
    pnl,
    quantity,
    entry_time,
    ROW_NUMBER() OVER (PARTITION BY session_context->>'session_id' ORDER BY entry_time) as trade_num
  FROM trades
  WHERE user_id IS NULL
    AND session_context->>'session_id' IS NOT NULL
)
SELECT * FROM sessions
ORDER BY session_id, trade_num;
```

---

## Admin Dashboard Queries

### Daily Anonymization Report

```sql
-- How much data was anonymized today?
SELECT 
  'behavioral_data' as table_name,
  COUNT(*) as anonymized_today
FROM behavioral_data
WHERE user_id IS NULL
  AND timestamp >= CURRENT_DATE
UNION ALL
SELECT 
  'trades',
  COUNT(*)
FROM trades  
WHERE user_id IS NULL
  AND updated_at >= CURRENT_DATE
UNION ALL
SELECT
  'strategies',
  COUNT(*)
FROM strategies
WHERE user_id IS NULL
  AND updated_at >= CURRENT_DATE;
```

### Data Quality Checks

```sql
-- Check for any orphaned data (shouldn't exist)
SELECT 
  'trades_with_invalid_user' as issue,
  COUNT(*) as count
FROM trades t
LEFT JOIN profiles p ON t.user_id = p.id
WHERE t.user_id IS NOT NULL
  AND p.id IS NULL
UNION ALL
SELECT 
  'strategies_with_invalid_user',
  COUNT(*)
FROM strategies s
LEFT JOIN profiles p ON s.user_id = p.id
WHERE s.user_id IS NOT NULL
  AND p.id IS NULL;
```

---

## Best Practices

### 1. Never Re-identify Users

Anonymized data should NEVER be linked back to users. The whole point is privacy.

### 2. Use Aggregations

For reports and dashboards, always use aggregations (COUNT, AVG, SUM) rather than individual records.

### 3. Filter by NULL User ID

Always include `WHERE user_id IS NULL` to query only anonymized data, unless comparing cohorts.

### 4. Time-based Partitioning

For large datasets, consider partitioning queries by time:

```sql
-- Last 30 days of anonymized data
WHERE user_id IS NULL
  AND timestamp >= NOW() - INTERVAL '30 days'
```

### 5. Regular Audits

Run monthly audits to ensure:
- No PII exists in anonymized records
- Data quality is maintained
- No re-identification is possible

---

## Security Notes

- Anonymized data is **not accessible** via RLS to regular users
- Only service role or admin access can query NULL user_id records
- Never expose raw anonymized data in user-facing features
- Use aggregations for any user-visible analytics
