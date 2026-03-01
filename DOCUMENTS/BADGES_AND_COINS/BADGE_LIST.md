# Complete Badge List — Design Reference

This document is the full design reference for the long-term badge system.

Current MVP design scope is smaller and excludes:

- per-dimension specialist quality badges
- efficiency badges
- special / rare badges
- game performance badges
- team / studio goal badges
- head picks

Total badge variants in the full reference: **94**

This breaks down as: 36 velocity streak + 4 velocity milestone + 13 quality + 4 efficiency + 6 reviewer + 7 login streak + 5 login milestone + 6 game performance + 4 team/studio goal + 7 special + 2 head picks = **94**

Note: Velocity streak badges share the same base icon per tier, with 6 visual ring/level treatments applied. So you're really designing **6 base icons × 6 level treatments** rather than 36 fully unique illustrations.

---

## 1. Velocity Streak Badges (36 badges)

6 tiers × 6 streak levels. Each tier has one base icon; the level adds a ring/frame treatment.

### Base icons needed: 6

| # | Tier Name | Description | Threshold (varies by seniority) |
|---|-----------|-------------|-------------------------------|
| 1 | Warm-Up | Participation — just showing up | 1+ pts/week (flat) |
| 2 | Steady Hand | Below expected but consistent | ~50% of expected |
| 3 | In the Flow | Meeting expected output | 100% of expected |
| 4 | On a Roll | Above expected | ~150% of expected |
| 5 | Powerhouse | High output | ~200% of expected |
| 6 | Force of Nature | Exceptional sustained output | ~250% of expected |

### Level treatments needed: 6

| # | Level | Consecutive Weeks | Visual Treatment |
|---|-------|-------------------|-----------------|
| 1 | Bronze | 2 weeks | Bronze ring |
| 2 | Silver | 4 weeks | Silver ring |
| 3 | Gold | 8 weeks | Gold ring |
| 4 | Platinum | 13 weeks (~quarter) | Platinum ring + glow |
| 5 | Diamond | 26 weeks (~half year) | Diamond ring + particle effect |
| 6 | Legendary | 52 weeks (full year) | Unique frame + animation |

### Full matrix (36 badges):

| | Bronze | Silver | Gold | Platinum | Diamond | Legendary |
|---|--------|--------|------|----------|---------|-----------|
| Warm-Up | ✦ | ✦ | ✦ | ✦ | ✦ | ✦ |
| Steady Hand | ✦ | ✦ | ✦ | ✦ | ✦ | ✦ |
| In the Flow | ✦ | ✦ | ✦ | ✦ | ✦ | ✦ |
| On a Roll | ✦ | ✦ | ✦ | ✦ | ✦ | ✦ |
| Powerhouse | ✦ | ✦ | ✦ | ✦ | ✦ | ✦ |
| Force of Nature | ✦ | ✦ | ✦ | ✦ | ✦ | ✦ |

**Design approach:** 6 unique base illustrations + 6 ring/frame overlays = 12 design assets that combine into 36 badges.

---

## 2. Velocity Milestone Badges (4 badges)

One-time peak performance in a single week. Each needs a unique, progressively impressive design.

| # | Badge Name | Description | Threshold (varies by seniority) |
|---|------------|-------------|-------------------------------|
| 7 | Big Week | Strong sprint | 2.5× expected |
| 8 | Monster Week | Rare output | 5× expected |
| 9 | Studio Legend | Exceptional | 7.5× expected |
| 10 | Centurion | Once-in-a-career week | 10× expected |

---

## 3. Quality Consistency Badges (13 badges)

### Overall Quality Streaks (5 badges)

| # | Badge Name | Description | Condition |
|---|------------|-------------|-----------|
| 11 | Craft Conscious | Consistently meeting the bar | At expected quality, 2+ weeks |
| 12 | Quality Standard | Reliable craftsmanship | At expected quality, 8+ weeks |
| 13 | Master Craftsperson | Half a year of quality | At expected quality, 26+ weeks |
| 14 | Sharp Eye | Exceeding expectations | 0.5 above expected, 4+ weeks |
| 15 | Studio Benchmark | Setting the quality bar | 0.5 above expected, 13+ weeks |

### Per-Dimension Specialist Badges (4 badges)

Deferred from MVP. Included here for the full design reference only.

| # | Badge Name | Description | Condition |
|---|------------|-------------|-----------|
| 16 | Technical Virtuoso | Craft mastery | 0.5+ above expected on Technical Quality, 8+ weeks |
| 17 | Vision Keeper | Consistently on-brand | 0.5+ above expected on Art Direction, 8+ weeks |
| 18 | Big Picture Thinker | Understands the whole | 0.5+ above expected on Context Fit, 8+ weeks |
| 19 | Dependable | Notes addressed, on time | 0.5+ above expected on Delivery, 8+ weeks |

### Combined Quality + Velocity Badges (4 badges)

The prestige tier — the hardest to earn.

| # | Badge Name | Description | Condition |
|---|------------|-------------|-----------|
| 20 | Balanced Act | Speed and quality | Expected velocity + quality, 4+ weeks |
| 21 | The Complete Package | Rare combination | Expected velocity + quality, 8+ weeks |
| 22 | Studio MVP | Top of the game | Expected velocity + 0.5 above quality, 8+ weeks |
| 23 | Untouchable | Peak performance | 1.5× velocity + 0.5 above quality, 4+ weeks |

---

## 4. Efficiency Badges (4 badges)

| # | Badge Name | Description | Condition |
|---|------------|-------------|-----------|
| 24 | Clean Sweep | No rework needed | 5 consecutive first-pass approvals |
| 25 | Precision Worker | Nailing it consistently | 10 consecutive first-pass approvals |
| 26 | Zero Rework | Exceptional brief attention | 25 consecutive first-pass approvals |
| 27 | Efficient Machine | Gets it right early | Avg < 1.5 review cycles across 20+ cards |

---

## 5. Reviewer Badges (6 badges)

For Leads, POs, Head of Art, Head of Animation.

| # | Badge Name | Description | Condition |
|---|------------|-------------|-----------|
| 28 | First Reviews | Getting started | 10 evaluations submitted |
| 29 | Dedicated Reviewer | Consistent evaluator | 50 evaluations submitted |
| 30 | Review Veteran | Pillar of the quality system | 200 evaluations submitted |
| 31 | Always Watching | Never misses a review | 90%+ eval rate, 4+ weeks |
| 32 | Quality Guardian | The review backbone | 90%+ eval rate, 13+ weeks |
| 33 | Calibrated Eye | Fair and consistent scorer | ±0.5 of consensus on 80%+ over 50+ reviews |

---

## 6. Login Streak Badges (7 badges)

| # | Badge Name | Description | Condition |
|---|------------|-------------|-----------|
| 34 | First Week | Building the habit | 7 consecutive days |
| 35 | Two-Weeker | Getting comfortable | 14 consecutive days |
| 36 | Month Strong | Part of your routine | 30 consecutive days |
| 37 | Dedicated | The platform is home | 60 consecutive days |
| 38 | Quarterly Regular | Three months straight | 90 consecutive days |
| 39 | Half-Year Hero | Seriously committed | 180 consecutive days |
| 40 | Year One | A full year, every day | 365 consecutive days |

---

## 7. Login Milestone Badges (5 badges)

Cumulative total days, not consecutive.

| # | Badge Name | Description | Condition |
|---|------------|-------------|-----------|
| 41 | Getting Started | Welcome aboard | 10 total login days |
| 42 | Regular | You're a regular now | 50 total login days |
| 43 | Centurion Login | 100 days in the app | 100 total login days |
| 44 | Power User | A fixture of the studio | 250 total login days |
| 45 | Institution | You've been here a while | 500 total login days |

---

## 8. Game Performance Badges (6 badges)

Awarded to all team members when their game hits a performance level.

| # | Badge Name | Description | Condition |
|---|------------|-------------|-----------|
| 46 | Player Magnet | Players keep spinning | Rounds/session ≥ 100 (Good) |
| 47 | Crowd Favorite | High engagement hit | Rounds/session ≥ 150 (Very Good) |
| 48 | Revenue Driver | The business loves this one | GGR/session ≥ 5 (Good) |
| 49 | Gold Standard | Top-tier performer | GGR/session ≥ 8 (Great) |
| 50 | Jackpot Maker | Elite game performance | GGR/session ≥ 11 (Fantastic) |
| 51 | Studio Blockbuster | Loved by players and the business | Rounds ≥ 150 AND GGR ≥ 8 |

---

## 9. Team & Studio Goal Badges (4 badges)

Awarded when collective production targets are met.

| # | Badge Name | Description | Condition |
|---|------------|-------------|-----------|
| 52 | Team Machine | Team hit velocity target | Team avg velocity goal achieved |
| 53 | Quality Culture | Team hit quality target | Team avg quality goal achieved |
| 54 | Studio Momentum | Studio-wide velocity target | Studio avg velocity goal achieved |
| 55 | Hit Factory | Multiple successful games | 3+ games reach Good GGR in a quarter |

---

## 10. Special / Rare Badges (7 badges)

| # | Badge Name | Description | Condition |
|---|------------|-------------|-----------|
| 56 | First Pixel | Welcome to the studio | First card ever completed |
| 57 | Century Card | 100 cards shipped | 100th card completed (lifetime) |
| 58 | Half Thousand | Serious volume | 500th card completed |
| 59 | The Thousand | Studio legend status | 1000th card completed |
| 60 | Renaissance Artist | Can do it all | Completed cards on every block type |
| 61 | Winter Warrior | Shipped through the holidays | Velocity streak through December |
| 62 | Studio Veteran | One year in | Active on platform for 1 year |

---

## 11. Head Picks (2 badge types)

Monthly recognition from leadership. Same badge design with different variants per awarding role.

| # | Badge Name | Description | Awarded By |
|---|------------|-------------|-----------|
| 63 | Head of Art Pick | Monthly recognition with citation | Head of Art |
| 64 | Head of Animation Pick | Monthly recognition with citation | Head of Animation |

---

## Summary for the Design Team

| Category | Badge Count | Design Approach |
|----------|------------|-----------------|
| Velocity Streaks | 36 | 6 base icons × 6 level ring overlays (12 assets) |
| Velocity Milestones | 4 | 4 unique illustrations, increasingly epic |
| Quality — Overall | 5 | 5 unique, quality/craft themed |
| Quality — Specialist | 4 | 4 unique, one per dimension |
| Quality + Velocity | 4 | 4 unique, prestige/premium feel |
| Efficiency | 4 | 4 unique, precision/clean themed |
| Reviewer | 6 | 6 unique, evaluation/review themed |
| Login Streaks | 7 | 7 leveled (same base, increasing intensity) |
| Login Milestones | 5 | 5 leveled (same base, increasing intensity) |
| Game Performance | 6 | 6 unique, game/player/revenue themed |
| Team & Studio Goals | 4 | 4 unique, collective/team themed |
| Special / Rare | 7 | 7 fully unique, memorable designs |
| Head Picks | 2 | 2 variants of a premium recognition badge |
| **Total** | **94** | **~54 unique designs** (rest are level variants) |

### Actual unique illustrations needed: ~54

The 36 velocity streak badges are built from 12 design assets (6 icons + 6 rings), and the login badges can share a similar level-up treatment. So the actual creative workload is roughly **54 unique badge designs** plus **6 ring/frame overlay treatments**.
