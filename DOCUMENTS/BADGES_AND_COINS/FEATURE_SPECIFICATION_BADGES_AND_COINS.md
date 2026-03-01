# Feature Specification: Badges, Coins & Rewards System

## Current Implementation Status

This document describes the full long-term rewards vision.

The currently agreed implementation target is a smaller MVP, documented in `MVP_IMPLEMENTATION_PLAN.md`.

Operational rollout and validation steps for the MVP are documented in `REWARDS_ROLLOUT_CHECKLIST.md`.

The MVP includes:

- Seniority
- Daily login tracking
- Weekly per-user snapshots
- Core badges
- Trophy case / current streak UI
- Admin rewards settings and debug overview

The MVP defers:

- Coins
- Cosmetics / perks
- Team and studio goals
- Game metrics
- Leaderboard
- Head Pick
- Specialist per-dimension quality badges

Locked implementation decisions for MVP:

- Logging in to the app is itself a meaningful daily activity and is only tracked once per calendar day.
- Login streaks use true consecutive calendar days in the current MVP implementation.
- Streak badges are re-earnable after resets; historical awards and current live streak state are separate.
- Trophy cases follow the same access rules as the underlying user profiles.
- `TASK` cards are expected to have exactly one assignee for reward attribution.

## 1. Overview

A gamification layer that sits on top of existing velocity and quality data to recognize achievement, encourage healthy habits, and make the platform itself more engaging to use. Designed primarily for artists and animators, with meaningful participation paths for Leads, POs, Head of Art, and Head of Animation.

The system draws on four data sources: story points completed (velocity), review cycle behavior (efficiency), quality dimension scores (craftsmanship), and game performance data (rounds/session, GGR/session). No additional manual input is required from anyone — everything is derived automatically.

**Design theme:** Light creative studio — warm, encouraging, craft-oriented language. Not corporate motivational posters, not full casino theming. Think "studio achievements" rather than "gamification KPIs."

---

## 2. Seniority System

### 2.1 Role Seniority Tiers

Every artist-track role now has a seniority level that determines expected performance baselines.

| Role | Seniority | Expected Points/Week | Expected Quality Avg |
|------|-----------|---------------------|---------------------|
| Artist - Junior | Junior | 10 | 1.5 |
| Artist - Mid Level | Mid | 15 | 2.0 |
| Artist - Senior | Senior | 20 | 2.5 |
| Animator - Junior | Junior | 10 | 1.5 |
| Animator - Mid Level | Mid | 15 | 2.0 |
| Animator - Senior | Senior | 20 | 2.5 |
| Lead Artist | Senior* | 20 | 2.5 |
| Head of Art | Senior* | 20 | 2.5 |
| Head of Animation | Senior* | 20 | 2.5 |

*Lead Artists, Head of Art, and Head of Animation are treated as Senior for scoring purposes when they produce creative work.

**All threshold values are Admin-configurable per seniority level.** These are starting guesses. A `SeniorityConfig` table stores current thresholds and can be adjusted without code changes.

### 2.2 How Seniority Affects the System

Seniority baselines influence three things:

**1. Velocity streak tier naming.** Instead of a flat point threshold for everyone, streaks are evaluated relative to role expectations:

| Performance Level | Tier Name | Junior (10 baseline) | Mid (15 baseline) | Senior (20 baseline) |
|-------------------|-----------|---------------------|-------------------|---------------------|
| Participation | Warm-Up | 1+ pts | 1+ pts | 1+ pts |
| Below expected | Steady Hand | 5+ pts | 8+ pts | 10+ pts |
| At expected | In the Flow | 10+ pts | 15+ pts | 20+ pts |
| Above expected | On a Roll | 15+ pts | 20+ pts | 25+ pts |
| High output | Powerhouse | 20+ pts | 25+ pts | 30+ pts |
| Exceptional | Force of Nature | 25+ pts | 30+ pts | 35+ pts |

These multipliers relative to the baseline are also Admin-configurable. The default ratios are: Participation = 1pt (flat), Below = 50%, At = 100%, Above = 150%, High = 200%, Exceptional = 250% — but rounded to clean numbers per tier.

**2. Quality badge thresholds.** Quality consistency badges reference the seniority-appropriate quality expectation rather than a global number. A Junior maintaining 1.5+ avg for 8 weeks earns the same "Quality Standard" badge as a Senior maintaining 2.5+ — both are meeting their expected bar consistently.

**3. Combined badges.** The prestige-tier "quality + velocity" badges evaluate against the user's seniority expectations. "The Complete Package" means meeting your expected velocity AND quality bar for 8+ weeks, regardless of seniority level.

### 2.3 Data Model Addition

```prisma
enum Seniority {
  JUNIOR
  MID
  SENIOR
}

model SeniorityConfig {
  id                    String    @id @default(cuid())
  seniority             Seniority @unique
  expectedPointsPerWeek Float     @default(10)
  expectedQualityAvg    Float     @default(1.5)

  // Velocity tier multipliers (relative to expectedPointsPerWeek)
  warmUpPoints          Float     @default(1)      // Flat minimum
  steadyHandRatio       Float     @default(0.5)    // 50% of expected
  inTheFlowRatio        Float     @default(1.0)    // 100% of expected
  onARollRatio          Float     @default(1.5)    // 150% of expected
  powerhouseRatio       Float     @default(2.0)    // 200% of expected
  forceOfNatureRatio    Float     @default(2.5)    // 250% of expected (but use sensible rounding)

  updatedAt             DateTime  @updatedAt
}
```

The `User` model gains a `seniority` field:

```prisma
model User {
  // ... existing fields ...
  seniority   Seniority?  // Null for non-artist roles (POs without seniority, Admins, etc.)
}
```

When the badge engine evaluates a user, it looks up their seniority config and calculates the actual thresholds. Users without a seniority level (pure Admins, Viewers) don't participate in velocity/quality badges.

---

## 3. System Architecture

### 3.1 Data Flow

```
Existing Systems                    Rewards Engine                    User-Facing
─────────────────                   ──────────────                    ───────────
Card completions ──┐
                   │
Story points ──────┤
                   ├──→ Weekly Snapshot Job ──→ Badge Evaluator ──→ Badge Awards
Review cycles ─────┤         (Sun night)           │                    │
                   │                                │                    ├──→ Profile / Trophy Case
Quality scores ────┤                                ▼                    ├──→ Leaderboard (opt-in)
                   │                          Coin Calculator ──→ Coin Ledger
Evaluations ───────┘                                                     │
                                                                         ├──→ Cosmetics Shop
Login events ──────→ Daily Login Tracker ──→ Login Streak Engine         └──→ Perks Catalog
                                                    │
                                                    ├──→ Daily Coin Bonus
                                                    └──→ Login Badges

Game Performance ──→ Game Metrics Import ──→ Team/Studio Goal Engine ──→ Team/Studio Badges
(rounds/session,        (periodic)                  │                      & Coins
 GGR/session)                                       └──→ Goal Progress Dashboard
```

### 3.2 Weekly Snapshot

A background job runs every Sunday at midnight (configurable) and creates an immutable `WeeklySnapshot` record per user containing:

- Total story points completed that week (cards moved to Done)
- Number of cards completed
- Average quality score across completed cards (final cycle only)
- Per-dimension quality averages
- Number of review cycles (total bounces across all their cards)
- First-pass rate (% of cards that went Review → Done without bouncing)
- For reviewers: number of evaluations submitted
- User's seniority at time of snapshot (immutable — reflects what they were that week)

This snapshot is the single source of truth for all badge and coin calculations. Historical snapshots are never recalculated.

---

## 4. Login & Engagement Rewards

Getting people to actually open a new platform daily is a real challenge. These rewards specifically target habitual usage.

### 4.1 Daily Login Bonus

Every day a user logs in to the app, they receive a small daily engagement reward. In the agreed MVP, the first authenticated app visit of the day is itself considered meaningful activity and is only tracked once per calendar day.

| Condition | Coins |
|-----------|-------|
| Daily login (first meaningful action) | 5 coins |
| Login on 5 consecutive days in a week | 15 bonus coins (on the 5th day) |
| Login every day of the week (7/7) | 30 bonus coins (on the 7th day) |

The daily login is tracked by a `DailyLoginRecord` — one per user per calendar day.

### 4.2 Login Streak Badges

| Consecutive Days | Badge Name | Flavor |
|------------------|------------|--------|
| 7 days | First Week | Building the habit |
| 14 days | Two-Weeker | Getting comfortable |
| 30 days | Month Strong | It's part of your routine now |
| 60 days | Dedicated | The platform is home |
| 90 days | Quarterly Regular | Three months straight |
| 180 days | Half-Year Hero | Seriously committed |
| 365 days | Year One | A full year, every day |

**Current MVP behavior:** Login streaks use true consecutive calendar days. The older weekday-only continuity idea is not part of the current implementation.

### 4.3 Login Milestones (Cumulative, Not Consecutive)

| Total Login Days | Badge Name | Flavor |
|------------------|------------|--------|
| 10 days | Getting Started | Welcome aboard |
| 50 days | Regular | You're a regular now |
| 100 days | Centurion Login | 100 days in the app |
| 250 days | Power User | A fixture of the studio |
| 500 days | Institution | You've been here a while |

### 4.4 Data Model

```prisma
model DailyLoginRecord {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date      DateTime @db.Date // Calendar date, no time component
  createdAt DateTime @default(now())

  @@unique([userId, date])
  @@index([userId])
}

model LoginStreak {
  id                String    @id @default(cuid())
  userId            String    @unique
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  currentStreak     Int       @default(0)  // Consecutive weekdays (or days if weekends enabled)
  longestStreak     Int       @default(0)
  totalLoginDays    Int       @default(0)  // Lifetime cumulative
  lastLoginDate     DateTime? @db.Date
  weekendsCounted   Boolean   @default(false)
  updatedAt         DateTime  @updatedAt
}
```

---

## 5. Badges

Badges are visible achievements displayed on a user's profile. Most badge types are permanent one-time unlocks. Streak badges are different: they are milestone awards tied to a streak run, can be earned again after a reset, and should be modeled separately from the user's current active streak state.

### 5.1 Velocity Streak Badges (Weekly Sustained Output)

These reward consistent weekly delivery relative to the user's seniority expectations. A streak is maintained by hitting the threshold every consecutive week. Missing one week resets the streak counter to zero.

**Thresholds per seniority** are derived from `SeniorityConfig` (see Section 2). The tier names are universal:

| Tier Name | Meaning |
|-----------|---------|
| Warm-Up | Participation — just showing up |
| Steady Hand | Below expected but consistent |
| In the Flow | Meeting expected output |
| On a Roll | Above expected |
| Powerhouse | High output |
| Force of Nature | Exceptional sustained output |

**Streak milestones** — each threshold has leveled versions based on consecutive weeks:

| Consecutive Weeks | Badge Level | Visual |
|-------------------|-------------|--------|
| 2 weeks | Bronze | Bronze ring |
| 4 weeks | Silver | Silver ring |
| 8 weeks | Gold | Gold ring |
| 13 weeks (~1 quarter) | Platinum | Platinum ring + glow |
| 26 weeks (~half year) | Diamond | Diamond ring + particle effect |
| 52 weeks (full year) | Legendary | Unique frame + animation |

So "In the Flow — Gold" means 8 consecutive weeks at or above expected output for your seniority level.

**Only the highest active streak badge per tier is shown in the live streak UI.** "In the Flow — Gold" supersedes "In the Flow — Silver" for the current run, but previously earned streak milestone awards remain part of the user's badge history.

If a streak resets and later starts again, the user can earn streak milestone awards again from the beginning.

**Grace week (optional, Admin-configurable):** One missed week per streak doesn't reset it — the streak pauses but doesn't break. The grace week doesn't count toward streak length. Default: off.

### 5.2 Velocity Milestone Badges (One-Time Peak Performance)

Single extraordinary weeks. Earned once, kept forever. These are evaluated against the user's seniority-expected points, expressed as multipliers:

| Multiplier of Expected | Badge Name | Junior (10 base) | Mid (15 base) | Senior (20 base) |
|------------------------|------------|-------------------|----------------|-------------------|
| 2.5× | Big Week | 25 pts | 38 pts | 50 pts |
| 5× | Monster Week | 50 pts | 75 pts | 100 pts |
| 7.5× | Studio Legend | 75 pts | 113 pts | 150 pts |
| 10× | Centurion | 100 pts | 150 pts | 200 pts |

These are intentionally aspirational. The higher tiers may never be earned.

### 5.3 Quality Consistency Badges (Sustained Craftsmanship)

These reward maintaining quality scores at or above the user's seniority-expected level over consecutive weeks.

**Overall Quality Streak:**

| Condition (relative to seniority) | Badge Name | Flavor |
|-----------------------------------|------------|--------|
| At expected quality for 2+ consecutive weeks | Craft Conscious | Consistently meeting the bar |
| At expected quality for 8+ consecutive weeks | Quality Standard | Reliable craftsmanship |
| At expected quality for 26+ consecutive weeks | Master Craftsperson | Half a year of quality |
| 0.5 above expected quality for 4+ consecutive weeks | Sharp Eye | Exceeding expectations |
| 0.5 above expected quality for 13+ consecutive weeks | Studio Benchmark | Setting the quality bar |

So for a Junior (expected 1.5), "Craft Conscious" means avg ≥ 1.5 for 2+ weeks. For a Senior (expected 2.5), it means avg ≥ 2.5 for 2+ weeks.

**Per-Dimension Specialist Badges:**

Implementation note: these badges are part of the long-term design, but are deferred from the current MVP until review dimensions have stable system-level identifiers suitable for durable badge mapping.

| Condition | Badge Name | Flavor |
|-----------|------------|--------|
| 0.5+ above expected on Technical Quality for 8+ weeks | Technical Virtuoso | Craft mastery |
| 0.5+ above expected on Art Direction for 8+ weeks | Vision Keeper | Consistently on-brand |
| 0.5+ above expected on Context Fit for 8+ weeks | Big Picture Thinker | Understands the whole |
| 0.5+ above expected on Delivery for 8+ weeks | Dependable | Notes addressed, on time |

**Quality + Velocity Combined Badges (the prestige tier):**

The most meaningful badges — requiring both output AND quality at seniority-appropriate levels.

| Condition | Badge Name | Flavor |
|-----------|------------|--------|
| At expected velocity AND quality for 4+ weeks | Balanced Act | Speed and quality |
| At expected velocity AND quality for 8+ weeks | The Complete Package | Rare combination |
| At expected velocity AND 0.5 above expected quality for 8+ weeks | Studio MVP | Top of the game |
| 1.5× expected velocity AND 0.5 above expected quality for 4+ weeks | Untouchable | Peak performance |

### 5.4 Efficiency Badges (Smart Work)

Clean execution — fewer bounces, good first-pass rates.

| Condition | Badge Name | Flavor |
|-----------|------------|--------|
| 5 cards in a row first-pass approval | Clean Sweep | No rework needed |
| 10 cards in a row first-pass | Precision Worker | Nailing it consistently |
| 25 cards in a row first-pass | Zero Rework | Exceptional attention to briefs |
| Average < 1.5 review cycles across 20+ completed cards | Efficient Machine | Gets it right early |

### 5.5 Reviewer Badges (For Leads, POs, Head of Art, Head of Animation)

| Condition | Badge Name | Flavor |
|-----------|------------|--------|
| 10 evaluations submitted | First Reviews | Getting started |
| 50 evaluations submitted | Dedicated Reviewer | Consistent evaluator |
| 200 evaluations submitted | Review Veteran | Pillar of the quality system |
| 90%+ evaluation rate for 4+ consecutive weeks | Always Watching | Never misses a review |
| 90%+ evaluation rate for 13+ consecutive weeks | Quality Guardian | The review backbone |
| Scores within ±0.5 of team consensus on 80%+ of evaluations over 50+ reviews | Calibrated Eye | Fair and consistent scorer |

### 5.6 Login & Engagement Badges

See Section 4.2 and 4.3 above — login streaks and cumulative milestones.

### 5.7 Special / Rare Badges

| Condition | Badge Name | Flavor |
|-----------|------------|--------|
| First card ever completed | First Pixel | Welcome to the studio |
| 100th card completed (lifetime) | Century Card | 100 cards shipped |
| 500th card completed | Half Thousand | Serious volume |
| 1000th card completed | The Thousand | Studio legend status |
| Completed cards on every block type | Renaissance Artist | Can do it all |
| Maintained any velocity streak through December | Winter Warrior | Shipped through the holidays |
| Active on the platform for 1 year | Studio Veteran | One year in |

---

## 6. Team & Studio Goals

Instead of a voluntary contribution vault, the system tracks collective performance against configured targets. When teams or the studio hit their goals, everyone involved earns coins and badges automatically. No individual pressure to contribute — it's purely about collective output.

### 6.1 Goal Types

Goals can be set at two scopes and across multiple metric types:

**Scopes:**
- **Team** — a single team's performance
- **Studio** — all teams combined

**Metric categories:**

| Category | Metrics | Source |
|----------|---------|--------|
| Production velocity | Avg story points per person per week | Weekly snapshots |
| Production quality | Avg quality score across completed cards | Weekly snapshots |
| Game performance | Rounds per session, GGR per session | External import (see 6.3) |

### 6.2 Production Goals

These are based on aggregated weekly snapshot data.

**Example Team goals:**

| Goal | Condition | Period | Reward |
|------|-----------|--------|--------|
| Team Velocity Target | Team avg ≥ 12 pts/person/week for the quarter | Quarterly | 200 coins per team member + "Team Machine" badge |
| Team Quality Target | Team avg quality ≥ 2.0 for the quarter | Quarterly | 200 coins per team member + "Quality Culture" badge |
| Studio Velocity Target | Studio avg ≥ 10 pts/person/week for the year | Yearly | 300 coins per studio member + "Studio Momentum" badge |

Goals are fully Admin-configurable: metric, threshold, period, scope, coin reward, and associated badge.

### 6.3 Game Performance Goals

This is where the slots production work connects to real business outcomes. Game performance data (rounds/session and GGR/session) is imported from an external system — either via API integration or manual CSV import by an Admin.

**Rounds/Session scale:**

| Level | Threshold | Interpretation |
|-------|-----------|---------------|
| Poor | < 70 | Below expectations |
| Acceptable | 70–99 | Minimum viable |
| Good | 100–149 | Solid performance |
| Very Good | 150+ | High engagement |

**GGR/Session scale:**

| Level | Threshold | Interpretation |
|-------|-----------|---------------|
| Poor | < 3 | Below expectations |
| Acceptable | 3–4.99 | Meeting minimum |
| Good | 5–7.99 | Strong performance |
| Great | 8–10.99 | Excellent |
| Fantastic | 11+ | Outstanding |

**How it works:**

1. An Admin or system integration links a game release to a Team (the team that produced it).
2. After launch, performance data is imported periodically (weekly, monthly, or at key milestones like 30/60/90 days post-launch).
3. The system evaluates the game's metrics against the configured thresholds.
4. When a game crosses a threshold level, the associated Team earns coins and badges.

**Game Performance Badges (awarded to all team members):**

| Condition | Badge Name | Flavor |
|-----------|------------|--------|
| Game reaches "Good" rounds/session (100+) | Player Magnet | Players keep spinning |
| Game reaches "Very Good" rounds/session (150+) | Crowd Favorite | High engagement hit |
| Game reaches "Good" GGR/session (5+) | Revenue Driver | The business loves this one |
| Game reaches "Great" GGR/session (8+) | Gold Standard | Top-tier performer |
| Game reaches "Fantastic" GGR/session (11+) | Jackpot Maker | Elite game performance |
| Game reaches both "Very Good" rounds AND "Great" GGR | Studio Blockbuster | The complete package — loved by players and the business |

**Coin rewards for game performance (per team member):**

| Level Reached | Coins per Person |
|---------------|-----------------|
| Acceptable (either metric) | 100 |
| Good (either metric) | 250 |
| Very Good / Great | 500 |
| Fantastic (GGR 11+) | 1,000 |
| Studio Blockbuster (combined) | 1,500 |

These are awarded once per game per threshold crossing — a game that goes from Good to Very Good triggers the Very Good reward, not both.

**Studio-level game performance:**

The studio can also have aggregate goals like "X games reaching Good+ GGR this year" or "average rounds/session across all games launched this quarter."

| Goal | Condition | Period | Reward |
|------|-----------|--------|--------|
| Hit Factory | 3+ games reach "Good" GGR in a quarter | Quarterly | 300 coins per studio member + "Hit Factory" badge |
| Engagement Kings | Studio avg rounds/session ≥ 100 across all active games | Yearly | 500 coins per studio member |

### 6.4 Data Model

```prisma
enum GoalScope {
  TEAM
  STUDIO
}

enum GoalMetric {
  AVG_VELOCITY          // Avg story points per person per week
  AVG_QUALITY           // Avg quality score
  ROUNDS_PER_SESSION    // Game metric
  GGR_PER_SESSION       // Game metric
  GAMES_AT_LEVEL        // Count of games reaching a threshold
}

enum GoalPeriod {
  MONTHLY
  QUARTERLY
  YEARLY
}

enum GoalStatus {
  ACTIVE
  ACHIEVED
  MISSED
  EXPIRED
}

// Admin-configured goals
model TeamStudioGoal {
  id              String      @id @default(cuid())
  name            String      // e.g., "Q1 Team Velocity Target"
  description     String?
  scope           GoalScope
  teamId          String?     // Null for STUDIO scope
  team            Team?       @relation(fields: [teamId], references: [id])
  metric          GoalMetric
  threshold       Float       // The target value
  period          GoalPeriod
  periodStart     DateTime    // When this goal period begins
  periodEnd       DateTime    // When it ends
  status          GoalStatus  @default(ACTIVE)
  currentValue    Float?      // Periodically updated progress
  coinReward      Int         @default(0)  // Per person
  badgeSlug       String?     // Badge to award on achievement
  achievedAt      DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([scope, status])
  @@index([teamId])
}

// Game releases linked to teams
model GameRelease {
  id              String   @id @default(cuid())
  name            String   // e.g., "Thunder Hydra Slots"
  teamId          String
  team            Team     @relation(fields: [teamId], references: [id])
  releaseDate     DateTime
  createdAt       DateTime @default(now())

  metrics         GameMetricSnapshot[]

  @@index([teamId])
}

// Periodic game performance snapshots
model GameMetricSnapshot {
  id                String      @id @default(cuid())
  gameReleaseId     String
  gameRelease       GameRelease @relation(fields: [gameReleaseId], references: [id], onDelete: Cascade)
  snapshotDate      DateTime
  roundsPerSession  Float?
  ggrPerSession     Float?
  source            String?     // "api_import", "manual_csv", etc.
  createdAt         DateTime    @default(now())

  @@index([gameReleaseId])
  @@unique([gameReleaseId, snapshotDate])
}

// Track which game performance levels have been awarded (prevent double-awarding)
model GamePerformanceAward {
  id              String   @id @default(cuid())
  gameReleaseId   String
  metricType      String   // "rounds_per_session" or "ggr_per_session" or "combined"
  levelReached    String   // "good", "very_good", "great", "fantastic", "blockbuster"
  coinReward      Int
  awardedAt       DateTime @default(now())

  @@unique([gameReleaseId, metricType, levelReached])
}
```

### 6.5 Goal Progress UI

**Team Dashboard Widget:**

```
┌──────────────────────────────────────────────┐
│  🎯 Team Goals — Q1 2026                    │
│                                              │
│  Velocity: 13.2 / 12.0 pts/person/week  ✅  │
│  ████████████████████░░░░  110%              │
│                                              │
│  Quality: 1.8 / 2.0 avg                  🔶  │
│  ██████████████░░░░░░░░░░  90%               │
│                                              │
│  Thunder Hydra (launched Jan 15):            │
│  Rounds/Session: 134  — Good ✅             │
│  GGR/Session: 7.2  — Good ✅               │
│  Next milestone: Great (8.0 GGR)            │
└──────────────────────────────────────────────┘
```

---

## 7. Coins

Coins are the currency earned through productive work, engagement, and collective achievement.

### 7.1 Earning Coins — Individual

**Story point base earning:**

```
Base coins = Story points completed × 10
```

**Quality multiplier (applied to base):**

Quality is evaluated relative to the user's seniority-expected quality level. "At expected" is the neutral point.

| Quality Score vs. Expected | Multiplier |
|---------------------------|------------|
| 0.5+ above expected | 1.5× |
| At or above expected | 1.2× |
| Slightly below (within 0.5) | 1.0× (no bonus) |
| Well below (> 0.5 under) | 0.8× (penalty) |
| Unscored | 1.0× (neutral) |

**Streak multiplier (applied after quality):**

| Active Velocity Streak Level | Multiplier |
|------------------------------|------------|
| Bronze (2+ weeks) | 1.1× |
| Silver (4+ weeks) | 1.15× |
| Gold (8+ weeks) | 1.2× |
| Platinum (13+ weeks) | 1.3× |
| Diamond (26+ weeks) | 1.4× |
| Legendary (52+ weeks) | 1.5× |

**Login bonuses:** See Section 4.1 (5 coins/day + weekly streak bonuses).

**Badge unlock bonuses:**

| Badge Type | Bonus Coins |
|------------|-------------|
| Velocity Streak (any new level) | 50 |
| Velocity Milestone | 100–500 (scales with tier) |
| Quality Consistency (any) | 75 |
| Combined Quality+Velocity | 150 |
| Efficiency badge | 75 |
| Reviewer badge | 50 |
| Login streak/milestone | 25 |
| Special/Rare badge | 100 |

**Reviewer coin earning (for Leads, POs, Head of Art, Head of Animation):**

```
Per evaluation submitted: 5 coins
Weekly bonus for 90%+ completion rate: 50 coins
```

### 7.2 Earning Coins — Team & Studio

When team/studio goals are achieved or game performance milestones are hit, every member of the relevant group receives coins automatically. See Section 6 for specific amounts.

### 7.3 Coin Ledger

Every coin transaction is recorded in an append-only ledger. Transaction types:

`WEEKLY_VELOCITY`, `QUALITY_MULTIPLIER`, `STREAK_MULTIPLIER`, `BADGE_UNLOCK`, `REVIEWER_EVALUATION`, `REVIEWER_WEEKLY_BONUS`, `DAILY_LOGIN`, `LOGIN_STREAK_BONUS`, `TEAM_GOAL_ACHIEVED`, `STUDIO_GOAL_ACHIEVED`, `GAME_PERFORMANCE`, `PURCHASE_COSMETIC`, `PERK_REDEMPTION`, `ADMIN_ADJUSTMENT`.

The `ADMIN_ADJUSTMENT` type allows Admins to manually credit or debit coins with a reason note.

### 7.4 Spending Coins

#### Tier 1: Cosmetics Shop (Individual, In-App)

| Item | Cost | Description |
|------|------|-------------|
| Profile frame | 50–200 | Decorative border around avatar |
| Card skin | 100–300 | Custom visual style for cards they own |
| Profile title | 75–150 | Custom subtitle (e.g., "Pixel Wizard") |
| Avatar accessory | 50–100 | Small icon/flair added to avatar |
| Reaction pack | 100 | Custom reaction emojis for card comments |
| Profile background | 150–250 | Background pattern/color for profile page |

New cosmetics can be added over time. Seasonal or limited-edition items create freshness.

#### Tier 2: Perks Catalog (Individual, Real-World)

High-cost items that require sustained performance. Configured by Admin.

**See Section 8 (Legal Compliance) for which perks are safe under Swedish law.**

| Perk | Suggested Cost | Tax Status |
|------|---------------|------------|
| Extra half-day off | 3,000–5,000 | ⚠️ Taxable benefit — requires payroll handling |
| Company-branded merch (with logo) | 500–1,500 | ✅ Tax-free as promotional items (reasonable value) |
| Wellness activity voucher | 1,000–2,500 | ✅ Tax-free under friskvårdsbidrag (up to SEK 5,000/year total) |
| Team lunch/fika outing | 1,500–3,000 | ✅ Tax-free as internal representation |
| Conference/workshop ticket | 5,000–10,000 | ✅ Tax-free as professional development |
| Priority equipment upgrade request | 3,000–5,000 | ✅ Tax-free as work tools |

**Perk mechanics:**

- Admins configure available perks with costs and any conditions.
- Redemption creates a `PerkRedemption` record: `PENDING` → `APPROVED` / `DENIED`.
- A Lead or Admin approves or denies with an optional note.
- If denied, coins are refunded.
- Admins can set per-person monthly/quarterly redemption limits.

---

## 8. Legal Compliance — Swedish Employment & Tax Law

This section summarizes the key Swedish tax rules that affect the rewards system. **This is not legal advice — consult with your company's payroll/HR department or a tax advisor before going live with real-world perks.**

### 8.1 Core Principle

Under Swedish law, the main rule is that any non-cash benefit an employer gives an employee is treated as taxable income (förmån), requiring the employer to pay employer contributions (31.42%) and deduct income tax. However, there are several important exceptions.

### 8.2 What's Safe (Tax-Free)

| Reward Type | Why It's Safe | Conditions |
|-------------|---------------|------------|
| **In-app cosmetics** | Not a benefit — just app features | No conditions; these have no market value outside the app |
| **Company merch with logo** | Counts as promotional/advertising items | Must bear company logo/branding; keep value reasonable (within SEK 300 excl. VAT per item as a guideline) |
| **Wellness activities** (gym, yoga, massage, fitness apps) | Tax-free under friskvårdsbidrag | Up to SEK 5,000/year per employee total; must be available to all employees; receipts required |
| **Team events / team lunch** | Tax-free as internal representation (personalvårdsförmån) | ~2 events per year is the rule-of-thumb for full deductibility; simple food/drink; no extravagance |
| **Professional development** (conferences, workshops, courses) | Tax-free as work-related education | Must be relevant to the employee's work duties |
| **Work equipment** (monitors, tablets, keyboards) | Tax-free as work tools | Must be essential for work; limited private-use value; employer retains ownership |
| **Simple flowers/small gifts on occasions** | Tax-free as personalvård | Must be of minor value; given equally on similar occasions |

### 8.3 What Requires Caution

| Reward Type | Issue | Recommendation |
|-------------|-------|----------------|
| **Half-day off** | Extra paid leave beyond contract is equivalent to salary — it's taxable as income | Still a great perk, but the company must handle it through payroll (report as taxable benefit). Budget for the 31.42% employer contribution on top. |
| **Gift cards** | Tax-free ONLY if not exchangeable for cash AND value ≤ SEK 550 incl. VAT (Christmas gift rules) | Risky outside the specific Christmas/anniversary gift occasions. Avoid as a general perk. |
| **Cash bonuses** | Always taxable as salary | Never offer through the coin system. |
| **High-value physical items** (electronics, headphones, etc.) without work justification | Taxable as a benefit | Only offer as work equipment that the company owns. |

### 8.4 Recommendations for the Perks Catalog

1. **Lead with tax-free perks.** Cosmetics (no cost), branded merch, wellness vouchers, team events, and professional development cover a wide range of appealing rewards without any tax overhead.

2. **Offer the half-day off but flag it.** It's a powerful motivator and perfectly legal — it just needs to be handled through payroll. The Admin UI should clearly mark it as "requires payroll processing" so HR is in the loop.

3. **Avoid gift cards as perks.** The rules around when gift cards are and aren't taxable in Sweden are nuanced and easy to get wrong. Not worth the risk.

4. **Keep real-world perk values modest.** The most expensive tax-free perks (conference tickets, equipment) are already work-related and benefit the company too. This is the sweet spot.

5. **Document everything.** Swedish tax law requires records of employee benefits. The coin ledger and perk redemption log provide a built-in audit trail, which is actually a compliance advantage.

### 8.5 Admin Configuration

The Perks admin interface should include:

- A `taxStatus` field on each perk definition: `TAX_FREE`, `TAXABLE_BENEFIT`, or `REQUIRES_REVIEW`.
- A `payrollNote` text field for HR instructions (e.g., "Report as taxable benefit in next payroll run").
- The ability to restrict perks by country/office if the studio has international employees (tax rules differ by country).

```prisma
enum PerkTaxStatus {
  TAX_FREE
  TAXABLE_BENEFIT
  REQUIRES_REVIEW
}

model PerkDefinition {
  // ... existing fields ...
  taxStatus       PerkTaxStatus @default(REQUIRES_REVIEW)
  payrollNote     String?       // Instructions for HR/payroll
  countryScope    String?       // ISO country code, null = all
}
```

---

## 9. Leaderboard (Opt-In)

Outside the leaderboard itself, trophy-case visibility should follow the same access rules as the underlying user profiles.

### 9.1 Opt-In Mechanics

- By default, users are NOT on the leaderboard.
- A toggle in profile settings: "Show me on the studio leaderboard."
- Users can opt out at any time; data is immediately removed from leaderboard view.
- The leaderboard shows: "X team members are participating."

### 9.2 Leaderboard Views

**Weekly Velocity:** Top performers by story points this week. Resets every Monday. Displayed relative to seniority expectations (a Junior at 150% of expected ranks the same as a Senior at 150%).

**Monthly Coins Earned:** Top earners for the month.

**Streak Champions:** Longest active streaks across all tiers.

**Quality Leaders:** Highest average quality scores over the past 4 weeks (minimum 3 cards completed to qualify).

**Reviewer Leaderboard:** For Leads/POs — evaluation completion rate and consistency.

**Game Performance:** Teams ranked by their games' rounds/session and GGR/session averages.

### 9.3 Anti-Gaming Measures

- Quality Leaders require a minimum card count.
- Velocity leaderboard is weekly to prevent burnout spirals.
- Velocity rankings are seniority-relative (% of expected), so Juniors and Seniors compete fairly.
- No all-time cumulative leaderboard (disadvantages newer members).
- Leaderboard position itself grants no coins or badges.

---

## 10. Non-Artist Role Paths

### 10.1 Leads (Lead Artist)

- Treated as Senior for velocity/quality badges when they produce creative work.
- Earn reviewer badges and coins through evaluations.
- "My Team" view showing team badges, streaks, and goal progress.
- Participate in team goal rewards.

### 10.2 POs

- Earn reviewer badges and coins through evaluations.
- PO seniority (Junior/Mid/Senior) can optionally be tracked for evaluation-related metrics.
- See project-level achievement summaries.
- Participate in team goal rewards.

### 10.3 Head of Art / Head of Animation

- Treated as Senior for velocity/quality badges when producing creative work.
- Reviewer badges (with access to all dimensions, so they accumulate faster).
- Studio-wide achievement dashboard.
- Can award a monthly "Head Pick" — a special badge given to one artist, with a brief written citation. Costs no coins, is purely recognition.

### 10.4 Admins

- Configure all thresholds, costs, perks, and cosmetics.
- Configure team/studio goals and game performance targets.
- Access coin economy health dashboard.
- Manual coin adjustments with audit trail.
- Import game performance data.

---

## 11. Data Model — Core Reward Models

(Login and Goal models defined in their respective sections above.)

### 11.1 Enums

```prisma
enum BadgeCategory {
  VELOCITY_STREAK
  VELOCITY_MILESTONE
  QUALITY_CONSISTENCY
  QUALITY_VELOCITY_COMBINED
  EFFICIENCY
  REVIEWER
  LOGIN
  TEAM_GOAL
  STUDIO_GOAL
  GAME_PERFORMANCE
  SPECIAL
}

enum CoinTransactionType {
  WEEKLY_VELOCITY
  QUALITY_MULTIPLIER
  STREAK_MULTIPLIER
  BADGE_UNLOCK
  REVIEWER_EVALUATION
  REVIEWER_WEEKLY_BONUS
  DAILY_LOGIN
  LOGIN_STREAK_BONUS
  TEAM_GOAL_ACHIEVED
  STUDIO_GOAL_ACHIEVED
  GAME_PERFORMANCE
  PURCHASE_COSMETIC
  PERK_REDEMPTION
  ADMIN_ADJUSTMENT
}

enum PerkRedemptionStatus {
  PENDING
  APPROVED
  DENIED
  REFUNDED
}

enum CosmeticType {
  PROFILE_FRAME
  CARD_SKIN
  PROFILE_TITLE
  AVATAR_ACCESSORY
  REACTION_PACK
  PROFILE_BACKGROUND
}

enum PerkTaxStatus {
  TAX_FREE
  TAXABLE_BENEFIT
  REQUIRES_REVIEW
}
```

### 11.2 Core Models

```prisma
// ──────────────────────────────────────────────
// Weekly Snapshot — immutable record of a user's week
// ──────────────────────────────────────────────
model WeeklySnapshot {
  id                    String    @id @default(cuid())
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  weekStartDate         DateTime  // Monday 00:00 UTC
  weekEndDate           DateTime  // Sunday 23:59 UTC

  // User context at time of snapshot (immutable)
  seniorityAtSnapshot   Seniority?

  // Velocity
  storyPointsCompleted  Float     @default(0)
  cardsCompleted        Int       @default(0)

  // Quality (from final review cycles of completed cards)
  avgQualityScore       Float?
  avgTechnicalQuality   Float?
  avgArtDirection       Float?
  avgContextFit         Float?
  avgDelivery           Float?
  scoredCardCount       Int       @default(0)

  // Efficiency
  firstPassCount        Int       @default(0)
  firstPassRate         Float?
  avgReviewCycles       Float?

  // Reviewer metrics
  evaluationsSubmitted  Int       @default(0)
  evaluationEligible    Int       @default(0)
  evaluationRate        Float?

  createdAt             DateTime  @default(now())

  badgeAwards           BadgeAward[]

  @@unique([userId, weekStartDate])
  @@index([userId])
  @@index([weekStartDate])
}

// ──────────────────────────────────────────────
// Badge Definitions
// ──────────────────────────────────────────────
model BadgeDefinition {
  id              String        @id @default(cuid())
  slug            String        @unique
  name            String
  description     String
  category        BadgeCategory
  tier            String?       // e.g., "gold", "silver"
  iconUrl         String?
  isActive        Boolean       @default(true)
  conditions      Json          // See badge condition schema in v1
  coinBonus       Int           @default(0)

  awards          BadgeAward[]
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

// ──────────────────────────────────────────────
// Badge Awards
// ──────────────────────────────────────────────
model BadgeAward {
  id                String          @id @default(cuid())
  userId            String
  user              User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  badgeDefinitionId String
  badgeDefinition   BadgeDefinition @relation(fields: [badgeDefinitionId], references: [id])
  awardedAt         DateTime        @default(now())
  triggerSnapshotId String?
  triggerSnapshot   WeeklySnapshot? @relation(fields: [triggerSnapshotId], references: [id])
  metadata          Json?

  @@unique([userId, badgeDefinitionId])
  @@index([userId])
}

// ──────────────────────────────────────────────
// Streaks
// ──────────────────────────────────────────────
model UserStreak {
  id                String    @id @default(cuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  streakType        String    // e.g., "velocity_in_the_flow", "quality_expected"
  currentCount      Int       @default(0)
  longestCount      Int       @default(0)
  lastQualifiedWeek DateTime?
  graceUsed         Boolean   @default(false)
  isActive          Boolean   @default(true)

  @@unique([userId, streakType])
  @@index([userId])
}

// ──────────────────────────────────────────────
// Coin Ledger
// ──────────────────────────────────────────────
model CoinTransaction {
  id            String              @id @default(cuid())
  userId        String
  user          User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  amount        Int
  type          CoinTransactionType
  description   String?
  referenceId   String?
  createdAt     DateTime            @default(now())

  @@index([userId])
  @@index([userId, createdAt])
}

// ──────────────────────────────────────────────
// Coin Balance (denormalized)
// ──────────────────────────────────────────────
model CoinBalance {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  balance     Int      @default(0)
  totalEarned Int      @default(0)
  totalSpent  Int      @default(0)
  updatedAt   DateTime @updatedAt
}

// ──────────────────────────────────────────────
// Cosmetics
// ──────────────────────────────────────────────
model CosmeticItem {
  id               String       @id @default(cuid())
  name             String
  description      String?
  type             CosmeticType
  cost             Int
  iconUrl          String?
  previewUrl       String?
  isActive         Boolean      @default(true)
  isLimitedEdition Boolean      @default(false)
  availableUntil   DateTime?
  createdAt        DateTime     @default(now())

  purchases        CosmeticPurchase[]
}

model CosmeticPurchase {
  id             String       @id @default(cuid())
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  cosmeticItemId String
  cosmeticItem   CosmeticItem @relation(fields: [cosmeticItemId], references: [id])
  purchasedAt    DateTime     @default(now())
  isEquipped     Boolean      @default(false)

  @@unique([userId, cosmeticItemId])
  @@index([userId])
}

// ──────────────────────────────────────────────
// Perks
// ──────────────────────────────────────────────
model PerkDefinition {
  id               String               @id @default(cuid())
  name             String
  description      String?
  cost             Int
  isActive         Boolean              @default(true)
  requiresApproval Boolean              @default(true)
  maxPerQuarter    Int?
  taxStatus        PerkTaxStatus        @default(REQUIRES_REVIEW)
  payrollNote      String?
  countryScope     String?
  createdAt        DateTime             @default(now())

  redemptions      PerkRedemption[]
}

model PerkRedemption {
  id               String               @id @default(cuid())
  userId           String
  user             User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  perkDefinitionId String
  perkDefinition   PerkDefinition       @relation(fields: [perkDefinitionId], references: [id])
  status           PerkRedemptionStatus @default(PENDING)
  requestedAt      DateTime             @default(now())
  resolvedAt       DateTime?
  resolvedByUserId String?
  note             String?

  @@index([userId])
}

// ──────────────────────────────────────────────
// Leaderboard
// ──────────────────────────────────────────────
model LeaderboardOptIn {
  id        String    @id @default(cuid())
  userId    String    @unique
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  isOptedIn Boolean   @default(false)
  optedInAt DateTime?
  optedOutAt DateTime?
}

// ──────────────────────────────────────────────
// Head Pick (Head of Art / Head of Animation)
// ──────────────────────────────────────────────
model HeadPick {
  id              String   @id @default(cuid())
  awardedToUserId String
  awardedToUser   User     @relation("PickRecipient", fields: [awardedToUserId], references: [id])
  awardedByUserId String
  awardedByUser   User     @relation("PickGiver", fields: [awardedByUserId], references: [id])
  citation        String
  month           Int
  year            Int
  createdAt       DateTime @default(now())

  @@unique([awardedToUserId, month, year])
  @@unique([awardedByUserId, month, year])
}
```

---

## 12. API Endpoints

### 12.1 Badges & Streaks

| Method | Path | Description | Access |
|--------|------|-------------|--------|
| GET | `/api/badges` | All badge definitions | Authenticated |
| GET | `/api/badges/my` | Current user's earned badges | Authenticated |
| GET | `/api/badges/user/:userId` | A user's badges | Lead+ or own |
| GET | `/api/streaks/my` | Current user's active streaks | Authenticated |
| GET | `/api/streaks/user/:userId` | A user's active streaks | Same access as profile |

### 12.2 Coins

| Method | Path | Description | Access |
|--------|------|-------------|--------|
| GET | `/api/coins/balance` | Current balance | Authenticated (own) |
| GET | `/api/coins/history` | Transaction ledger (paginated) | Authenticated (own) |
| POST | `/api/coins/adjust` | Manual adjustment | Admin |

### 12.3 Login

| Method | Path | Description | Access |
|--------|------|-------------|--------|
| POST | `/api/login/record` | Record daily login (called on first authenticated app visit of the day) | Authenticated |
| GET | `/api/login/streak` | Current login streak | Authenticated (own) |

### 12.4 Cosmetics

| Method | Path | Description | Access |
|--------|------|-------------|--------|
| GET | `/api/shop/cosmetics` | Available cosmetics | Authenticated |
| POST | `/api/shop/cosmetics/:id/purchase` | Purchase | Authenticated |
| PATCH | `/api/shop/cosmetics/:id/equip` | Equip/unequip | Authenticated (own) |
| GET | `/api/shop/my-cosmetics` | Purchased cosmetics | Authenticated (own) |

### 12.5 Perks

| Method | Path | Description | Access |
|--------|------|-------------|--------|
| GET | `/api/perks` | Available perks | Authenticated |
| POST | `/api/perks/:id/redeem` | Redeem | Authenticated |
| PATCH | `/api/perks/redemptions/:id` | Approve/deny | Lead+ or Admin |
| GET | `/api/perks/my-redemptions` | Redemption history | Authenticated (own) |

### 12.6 Goals

| Method | Path | Description | Access |
|--------|------|-------------|--------|
| GET | `/api/goals` | Active goals (team + studio) | Authenticated |
| GET | `/api/goals/team/:teamId` | Team's goals + progress | Team member |
| POST | `/api/goals` | Create goal | Admin |
| PATCH | `/api/goals/:id` | Update goal | Admin |

### 12.7 Game Performance

| Method | Path | Description | Access |
|--------|------|-------------|--------|
| GET | `/api/games` | All game releases | Authenticated |
| POST | `/api/games` | Register a game release | Admin |
| POST | `/api/games/:id/metrics` | Import metric snapshot | Admin |
| POST | `/api/games/:id/metrics/csv` | Bulk import from CSV | Admin |
| GET | `/api/games/:id/metrics` | Metric history | Authenticated |

### 12.8 Leaderboard

| Method | Path | Description | Access |
|--------|------|-------------|--------|
| GET | `/api/leaderboard/:type` | Leaderboard data | Authenticated |
| PATCH | `/api/leaderboard/opt-in` | Toggle opt-in | Authenticated (own) |

### 12.9 Admin

| Method | Path | Description | Access |
|--------|------|-------------|--------|
| GET | `/api/admin/economy` | Coin economy dashboard | Admin |
| GET | `/api/admin/seniority-config` | Current seniority thresholds | Admin |
| PATCH | `/api/admin/seniority-config/:seniority` | Update thresholds | Admin |
| GET | `/api/admin/rewards/overview` | Rewards system debug overview | Admin |
| GET | `/api/admin/rewards/users/:userId/history` | Selected user's weekly rewards history | Admin |
| POST | `/api/admin/badges` | Create badge definition | Admin |
| PATCH | `/api/admin/badges/:id` | Update badge definition | Admin |
| POST | `/api/admin/cosmetics` | Create cosmetic | Admin |
| PATCH | `/api/admin/cosmetics/:id` | Update cosmetic | Admin |
| POST | `/api/admin/perks` | Create perk | Admin |
| PATCH | `/api/admin/perks/:id` | Update perk | Admin |

### 12.10 Head Pick

| Method | Path | Description | Access |
|--------|------|-------------|--------|
| POST | `/api/picks` | Award monthly pick | Head of Art / Head of Animation |
| GET | `/api/picks` | All picks (paginated) | Authenticated |

---

## 13. Implementation Notes

### 13.1 Rollout Strategy

1. **Phase 1 — Login tracking + Seniority setup.** Deploy daily login recording and configure seniority levels. This starts generating engagement data immediately and is the lowest-risk feature.
2. **Phase 2 — Weekly snapshots.** Deploy the snapshot job silently for 2–3 weeks. Verify data accuracy against known work output.
3. **Phase 3 — Badges.** Launch badges with accumulated data. Users immediately earn badges on day one — creates excitement.
4. **Phase 4 — Coins & Cosmetics.** Introduce coin economy. Backfill balances from historical snapshots and login data.
5. **Phase 5 — Team/Studio Goals.** Configure first set of quarterly goals. Connect game performance data.
6. **Phase 6 — Perks.** Add real-world perks once coin economy is stable and HR has approved the catalog.
7. **Phase 7 — Leaderboard.** Launch opt-in leaderboard last, once there's enough activity to make it interesting.

### 13.1.1 Current MVP Admin Tooling

The current MVP implementation already includes lightweight admin tooling:

- `/settings/rewards` for seniority threshold editing
- an admin rewards overview with recent snapshots, badge awards, and active streak rows
- overview filters for user, week range, badge category, and streak type
- a selected-user history drill-down with weekly snapshots, active streaks, and snapshot-triggered badge awards
- `POST /api/cron/rewards/backfill-snapshots` for chronological historical recovery
- `npm run cron:rewards:backfill` as a local trigger script for the backfill cron

### 13.2 Coin Economy Balancing

Key metrics to monitor:

- **Coin velocity**: Target 150–300 coins/week for someone meeting seniority expectations.
- **Time to first cosmetic**: ~1–2 weeks for the cheapest item.
- **Time to first real perk**: ~4–8 weeks of strong performance.
- **Login bonus share**: Login coins should be ~10–15% of total income — enough to incentivize but not dominant.
- **Team/game rewards share**: ~15–25% of total coins should come from collective achievements.

### 13.3 Seniority Edge Cases

- **Role changes**: When someone is promoted from Mid to Senior, their active streaks continue but future weeks are evaluated against the new thresholds. Historical snapshots retain the seniority at the time they were created.
- **Lead/Head roles with no creative cards**: In weeks where a Lead/Head doesn't complete any cards (purely management work), they earn reviewer coins only and maintain no velocity streak. This is expected and fine.
- **PO seniority**: POs don't have velocity expectations by default. Their engagement is through reviewer badges, login streaks, and team/studio goal rewards.

### 13.4 Game Metrics Import

Game performance data comes from outside the app. The import system should support:

- **Manual CSV upload**: Admin uploads a spreadsheet with columns for game name, date, rounds/session, GGR/session.
- **API endpoint**: For future automation from the game analytics platform.
- **Validation**: Reject negative values, flag outliers (e.g., GGR > 50 is probably an error).
- **Idempotency**: Re-importing the same date for the same game overwrites rather than duplicates.

### 13.5 Permissions Summary

| Action | Artist | Lead | PO | Head of Art/Anim | Admin |
|--------|--------|------|----|-------------------|-------|
| View own badges/coins/streaks | ✅ | ✅ | ✅ | ✅ | ✅ |
| View others' trophy case | ✅ | ✅ | ✅ | ✅ | ✅ |
| View leaderboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| View team/studio goals | ✅ | ✅ | ✅ | ✅ | ✅ |
| Purchase cosmetics | ✅ | ✅ | ✅ | ✅ | ✅ |
| Redeem perks | ✅ | ✅ | ✅ | ✅ | ✅ |
| Approve perks | — | ✅ | — | ✅ | ✅ |
| Award Head Pick | — | — | — | ✅ | — |
| Configure goals/badges/shop | — | — | — | — | ✅ |
| Import game metrics | — | — | — | — | ✅ |
| Manual coin adjustment | — | — | — | — | ✅ |
| Configure seniority thresholds | — | — | — | — | ✅ |
| View economy dashboard | — | — | — | — | ✅ |
### 13.6 Backfill Workflow

Historical rewards recovery should run oldest week to newest week.

Current implementation supports:

- `POST /api/cron/rewards/backfill-snapshots`
- optional `startWeekDate`
- optional `endWeekDate`
- optional `userIds`

This is intended for:

- filling missing weekly snapshots
- reconstructing streak progression in chronological order
- awarding missed historical badge rows without destructive resets
