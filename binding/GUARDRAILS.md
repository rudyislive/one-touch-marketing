# Guardrails

<!-- Machine-checked ceilings. Breaching one HALTS that lane until you unlock it
     (failure table, contract). These exist to keep your accounts alive and your
     costs boring. Defaults are deliberately conservative; raise them when your
     scale earns it. -->

## Publishing velocity
- posts_per_platform_per_day: 3
- pieces_published_per_day: 2          # site content; velocity spikes read as spam to crawlers

## The gate
- rework_cycles_per_item_per_day: 5    # a reject->redraft loop that will not converge parks the item
- pending_cards_alert_age_days: 5      # older than this is surfaced weekly as a silted decision

## Attention (yours)
- max_bridge_pings_per_day: 10         # beyond this the bridge batches into a digest; you asked for one touch, not fifty
- quiet_hours: "22:00-07:00"           # cards queue silently; urgent alerts only

## Spend
- generation_jobs_per_day: 20          # image/video generation ceiling
- UNKNOWN: add per-tool spend caps as you bind paid tools
