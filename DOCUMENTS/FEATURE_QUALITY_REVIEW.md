# Feature Specification: Quality Review & Velocity Metrics

## 1. Overview

This feature introduces a structured quality evaluation system tied to review cycles, combined with velocity tracking (burn-up/burn-down) that connects throughput to quality. The goal is to answer not just "how much did we ship?" but "how good was what we shipped?"

### Related Operational Docs

- Performance and deployment/runtime guidance is tracked separately in `DOCUMENTS/PERFORMANCE_RUNBOOK.md`.
- Cross-cutting performance debt tracking is in `DOCUMENTS/TECH_DEBT.md` under "2026-02-19 Performance Stabilization Follow-Up".
- Current performance conventions include scoped payload APIs (`scope=project`, `scope=picker`) and predictive prefetch for high-traffic views.

---

## 2. Core Concepts

### 2.1 Review Cycles

A **review cycle** is created automatically each time a card enters the `Review` column. It represents one iteration of work being presented for evaluation.

**Lifecycle:**

```
Card moves to "Review"  →  Review Cycle opens (cycle N)
                              ↓
                 Card is discussed in review meeting
                              ↓
Card moves out of "Review"  →  Cycle's review period ends
(To Do / To Do Animation / Doing)
                              ↓
         Evaluators can STILL submit scores after this point
         (evaluation window remains open until they submit)
                              ↓
Card moves to "Review" again  →  New Review Cycle opens (cycle N+1)
                              ↓
              ...repeats until card reaches "Done"
```

**Key principle: the evaluation window extends beyond the card's time in Review.** In practice, tasks move out of the Review column during every review meeting. But not every Lead or PO may have attended that meeting, or they may need more time to assess. The system accommodates this by allowing evaluations to be submitted at any point after a cycle is created — even after the card has moved back to Doing or into a new cycle.

**Rules:**

- A new cycle is created each time a card transitions INTO `Review` from a non-review column.
- The cycle records when the card entered Review (`openedAt`) and when it left (`closedAt`), but `closedAt` does **not** prevent evaluation submissions.
- Each reviewer can submit one evaluation per cycle. Once submitted, their evaluation for that cycle is complete. They can edit it until the card reaches `Done`.
- The **final cycle** (the last one before the card moves to `Done`) is flagged as the definitive quality score used in dashboards and velocity metrics.
- Earlier cycles are retained as historical progression data.
- When a card reaches `Done`, all open evaluation windows for that card are locked (no further edits).

### 2.2 Evaluation Questions (Structured Rubric)

Instead of a single overall score, evaluations use a set of **evaluation questions** (dimensions) that are scored independently.

**Default evaluation questions (configurable):**

| Question | Description | Example prompt |
|----------|-------------|----------------|
| Technical Quality | Craft and execution | Is the mesh clean? Are textures properly UV'd? |
| Art Direction Alignment | Matches the visual target | Does it look like it belongs in this project's style? |
| Context Fit | Works in the actual game/product | Does it read well at game camera distance? Does it clip? |
| Delivery | Process and responsiveness | Were notes addressed? Was it delivered on time? |

**Scoring options:**

| Option | Value | Meaning |
|--------|-------|---------|
| Low | 1 | Below expectations, needs significant rework |
| Medium | 2 | Meets expectations |
| High | 3 | Exceeds expectations |
| Not Applicable | N/A | Question does not apply for this task/cycle; excluded from averages |

Only **Super Admin** can manage the evaluation question library (add/edit/delete/reorder) and configure audience (`LEAD`, `PO`, or `BOTH`).

### 2.3 Who Can Evaluate

**Any user with the Lead, PO, or Head of Art role can evaluate any task on any board.** There are no restrictions based on team assignment or project ownership.

Role checks for evaluation are based on evaluator **role**, not permission flags. A user can also have Admin/Super Admin permissions, but evaluation eligibility still comes from `LEAD`, `PO`, or `HEAD_OF_ART`.

**Role-based question access:**

| Question audience | Lead sees | PO sees | Head of Art sees |
|-------------------|----------|---------|------------------|
| LEAD | ✅ | — | ✅ |
| PO | — | ✅ | ✅ |
| BOTH | ✅ | ✅ | ✅ |

**Rules:**

- **Leads** evaluate questions targeted to Lead or Both.
- **POs** evaluate questions targeted to PO or Both.
- **Head of Art** sees all active questions regardless of audience mapping.
- Evaluation is **always optional** - nobody is forced to evaluate. The system tracks who did and did not, but there is no enforcement.
- If multiple people with the same role evaluate the same cycle, their scores are averaged for that role's applicable questions.

### 2.4 Anonymity And Score Visibility

Evaluations are anonymous in product UI. The system stores reviewer identity for internal audit/computation, but **displayed quality data is aggregated and anonymized only**.

| User type | Can see |
|-----------|---------|
| Viewer permission | No quality data |
| Lead / PO / Head of Art | Aggregated/anonymized scores, trends, and counts only |

No free-text notes within the anonymous evaluation. Detailed creative feedback (for example, "the idle animation clips through the belt") stays in the existing card comment/feedback system.

---

## 3. Data Model

### 3.1 New Enums

```prisma
enum EvaluatorRole {
  LEAD
  PO
  HEAD_OF_ART
}

enum ReviewScoreValue {
  LOW
  MEDIUM
  HIGH
  NOT_APPLICABLE
}
```

### 3.2 New Models

```prisma
// A single pass through the Review column
model ReviewCycle {
  id          String    @id @default(cuid())
  cycleNumber Int       // Sequential: 1, 2, 3... per card
  openedAt    DateTime  @default(now())  // When card entered Review
  closedAt    DateTime? // When card left Review (null = currently in Review)
  isFinal     Boolean   @default(false)  // Last cycle before Done
  lockedAt    DateTime? // When card reached Done — no more edits after this

  // Relations
  cardId      String
  card        Card      @relation(fields: [cardId], references: [id], onDelete: Cascade)

  evaluations Evaluation[]

  @@unique([cardId, cycleNumber])
  @@index([cardId])
}

// Configurable evaluation questions (quality dimensions)
model ReviewDimension {
  id          String    @id @default(cuid())
  name        String    // e.g., "Technical Quality"
  description String?   // Tooltip/help text
  position    Int       // Display order
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relations
  evaluationScores  EvaluationScore[]
  dimensionRoles    DimensionRole[]     // Which evaluator audiences can score this

  @@index([position])
}

// Maps question audience to evaluator role. Head of Art is always allowed.
model DimensionRole {
  id            String          @id @default(cuid())
  dimensionId   String
  dimension     ReviewDimension @relation(fields: [dimensionId], references: [id], onDelete: Cascade)
  role          EvaluatorRole   // LEAD or PO (HEAD_OF_ART is implicit)

  @@unique([dimensionId, role])
}

// One evaluation = one reviewer's submission for one cycle
model Evaluation {
  id              String        @id @default(cuid())
  submittedAt     DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relations
  reviewCycleId   String
  reviewCycle     ReviewCycle   @relation(fields: [reviewCycleId], references: [id], onDelete: Cascade)

  reviewerId      String
  reviewer        User          @relation(fields: [reviewerId], references: [id])

  scores          EvaluationScore[]

  @@unique([reviewCycleId, reviewerId])  // One evaluation per reviewer per cycle
  @@index([reviewCycleId])
  @@index([reviewerId])
}

// Individual question score within an evaluation
model EvaluationScore {
  id              String          @id @default(cuid())
  score           ReviewScoreValue

  // Relations
  evaluationId    String
  evaluation      Evaluation      @relation(fields: [evaluationId], references: [id], onDelete: Cascade)

  dimensionId     String
  dimension       ReviewDimension @relation(fields: [dimensionId], references: [id])

  @@unique([evaluationId, dimensionId])  // One score per question per evaluation
}
```

### 3.3 Updated Existing Models

Add to `Card`:

```prisma
model Card {
  // ... existing fields ...
  reviewCycles  ReviewCycle[]
}
```

Add to `User`:

```prisma
model User {
  // ... existing fields ...
  evaluations  Evaluation[]
}
```

---

## 4. Cycle Automation

### 4.1 Triggering Cycle Events

Review cycles are driven by **card column transitions**. The system reacts to status changes, but evaluation submission is decoupled from the cycle's open/closed state.

```typescript
async function onCardStatusChange(
  cardId: string,
  fromColumn: Column,
  toColumn: Column
) {
  const now = new Date();

  // CARD ENTERS REVIEW
  if (toColumn.type === 'REVIEW' && fromColumn.type !== 'REVIEW') {
    // Debounced open: create only if still in REVIEW after 2 seconds.
    await scheduleReviewCycleOpen(cardId, 2000);
  }

  // CARD LEAVES REVIEW
  if (fromColumn.type === 'REVIEW' && toColumn.type !== 'REVIEW') {
    const openCycle = await getOpenCycle(cardId);
    if (openCycle) {
      await prisma.reviewCycle.update({
        where: { id: openCycle.id },
        data: { closedAt: now },
      });
    }
  }

  // CARD MOVES TO DONE
  // isFinal is set only in this transition.
  if (toColumn.type === 'DONE' && fromColumn.type !== 'DONE') {
    await prisma.reviewCycle.updateMany({
      where: { cardId },
      data: { isFinal: false },
    });

    const latestCycle = await getLastCycle(cardId);
    if (latestCycle) {
      await prisma.reviewCycle.update({
        where: { id: latestCycle.id },
        data: { isFinal: true },
      });
    }

    await prisma.reviewCycle.updateMany({
      where: { cardId, lockedAt: null },
      data: { lockedAt: now },
    });
  }

  // CARD MOVES BACK FROM DONE
  if (fromColumn.type === 'DONE' && toColumn.type !== 'DONE') {
    await prisma.reviewCycle.updateMany({
      where: { cardId },
      data: { isFinal: false, lockedAt: null },
    });
  }
}
```

### 4.2 Evaluation Submission Rules

```typescript
async function canSubmitEvaluation(
  reviewCycleId: string,
  reviewerId: string
): Promise<{ allowed: boolean; reason?: string }> {

  const cycle = await prisma.reviewCycle.findUnique({
    where: { id: reviewCycleId },
    include: { card: true }
  });

  // Cycle must exist
  if (!cycle) return { allowed: false, reason: 'Cycle not found' };

  // Card must not be locked (i.e., not in Done)
  if (cycle.lockedAt) return { allowed: false, reason: 'Card is completed — evaluations are locked' };

  // Reviewer must have an eligible evaluator role (role-based, not permission-based)
  const reviewer = await getUserWithRole(reviewerId);
  if (!['LEAD', 'PO', 'HEAD_OF_ART'].includes(reviewer.evaluatorRole)) {
    return { allowed: false, reason: 'Insufficient role' };
  }

  // All checks passed
  return { allowed: true };
}
```

**Key point:** There is no check for `cycle.closedAt`. A closed cycle simply means the card has left the Review column — evaluations can still be submitted or edited until the card reaches Done.

### 4.3 Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Card moved directly to Done (skipping Review) | No review cycle created. Card has no quality score. Appears as "unscored" in dashboards. |
| Card in Done, reviewer wants to submit late | Blocked — `lockedAt` is set. Reviewer should have submitted earlier. |
| Card moved back from Done to Doing | All cycles unlocked, `isFinal` cleared. Evaluation resumes normally. |
| Card moved to Done from a non-Review column | Latest existing cycle (if any) is marked final and all cycles are locked. |
| Card re-enters Review while reviewers are still evaluating a previous cycle | Previous cycle stays open for evaluation. New cycle (N+1) is also created. Reviewers can submit to either. |
| Reviewer evaluates cycle 1 after cycle 2 is already open | Allowed. Each cycle accepts evaluations independently. |
| Multiple rapid column changes (drag accidents) | Use delayed creation: cycle opens only if card remains in Review for 2 seconds. |
| Card is archived/deleted while in Review | Open cycles get `closedAt` and `lockedAt` set. |

---

## 5. Evaluation Flow (UI)

### 5.1 Evaluate Button Visibility

An **"Evaluate" button** (or icon) is visible on any card that has at least one review cycle, to any user with the Lead, PO, or Head of Art role — regardless of which board or team the card belongs to.

**States:**

| Card state | Button state |
|------------|-------------|
| In Review (open cycle, no evaluation from this user) | Active — "Evaluate" |
| Has been in Review (closed cycle, no evaluation from this user) | Active — "Evaluate" (can still submit) |
| User has already evaluated the latest cycle | Shows as "Evaluated ✓" — click to edit |
| Card is Done (locked) | Disabled — "Locked" |
| Card has never been in Review | No button shown |

### 5.2 Evaluation Modal

When a reviewer clicks Evaluate, the modal shows:

1. **Card name and cycle number** at the top.
2. **Only the questions this reviewer's role is eligible to score**.
3. Each question displays its name, description, and four options: **Low / Medium / High / Not Applicable**.
4. Submit button and success confirmation.

If the reviewer has already submitted for this cycle, the modal opens with their previous scores pre-filled for editing.

If multiple cycles are open for evaluation (for example, cycle 2 is open and the reviewer never evaluated cycle 1), the modal defaults to the **most recent cycle** but provides a dropdown to select an earlier cycle.

### 5.3 What the Artist Sees (Card Detail - Quality Tab)

The card detail view includes a **Quality** tab showing:

- **Current/latest cycle scores:** Averaged across all submitted evaluations, per question. Shown as Low/Medium/High badges.
- **Cycle progression chart:** How scores changed across cycles (1 -> 2 -> 3).
- **Overall quality indicator:** Combined score (average of question averages from the final cycle):
  - Green: Average >= 2.5 (High range)
  - Amber: Average 1.5-2.49 (Medium range)
  - Red: Average < 1.5 (Low range)
- **Number of evaluations received** per cycle.
- **Confidence indicator per question** based on submitted score count (`n`):
  - Green confidence: `n >= 20`
  - Amber confidence: `5 <= n < 20`
  - Red confidence: `n < 5`

Missing data is excluded from averages. If a question has no applicable submitted scores, it is not used in aggregate calculations.

### 5.4 Additional Reviewer Insights (Lead, PO, Head of Art)

In addition to the artist-facing aggregate view:

- **Divergence flags:** Compare pairwise averages for `Lead vs PO`, `Lead vs Head of Art`, and `PO vs Head of Art` on shared questions only. Flag when absolute difference is `>= 2`.
- **Evaluation completion rates:** How often each eligible reviewer submits evaluations vs. how many cycles they were eligible to review.
- **Pending evaluations:** Cycles where the current reviewer has not yet submitted, grouped by recency.

No per-reviewer score identity is shown in product UI.

### 5.5 Notification / Reminder (Optional Enhancement)

When a card leaves Review and a reviewer has not evaluated that cycle, a subtle in-app indicator (badge count or sidebar item) reminds them they have pending evaluations. No email and no blocking.

### 5.6 User Page Quality Summary

User pages show aggregated/anonymized quality summaries for tasks **owned by that user**:

- Quality progression over time (final-cycle scores).
- Per-question averages and counts.
- Confidence indicator per question (same thresholds as the card quality tab).
- List of latest finalized tasks with task link, finalized date, and final aggregate score.

### 5.7 Project Statistics Quality Summary

In each board's **Planning -> Project Statistics** section (and mirrored on the corresponding project page), show team-level quality summaries:

- Team quality trend over time.
- Distribution of finalized quality tiers (High/Medium/Low/Unscored).
- Per-question averages with confidence indicators.
- Iteration metrics (average cycles to Done, high-churn rate).

This view is group-focused only (no individual person breakdown).

### 5.8 Super Admin Settings Page

Add a dedicated settings page for evaluation configuration, visible to **Super Admin only**.

The page manages:

- Evaluation question text/description.
- Audience per question (`LEAD`, `PO`, `BOTH`).
- Question order and active/inactive state.

The evaluation modal reads from this configured question list at runtime. Head of Art always sees all active questions regardless of question audience.

Scoring options are standardized across all questions:

- `LOW`
- `MEDIUM`
- `HIGH`
- `NOT_APPLICABLE`

---

## 6. Velocity & Quality Dashboards

### 6.1 Burn-Up with Quality Overlay

The standard cumulative story points chart, enhanced with quality tiers.

**X-axis:** Time (weekly buckets).  
**Y-axis:** Cumulative story points.

**Layers (stacked area):**

- Green layer: Points from cards with final average `>= 2.0` (Medium/High quality).
- Amber layer: Points from cards with final average `1.5-1.99`.
- Red layer: Points from cards with final average `< 1.5` (Low quality).
- Grey layer: Points from unscored cards (never reviewed, or no submitted evaluations).

This lets you see both throughput and quality confidence together.

### 6.2 Quality-Adjusted Velocity

An optional metric that weights story points by quality. It is shown **alongside** raw velocity, not as a replacement.

| Final Quality Score | Multiplier |
|---------------------|------------|
| High (avg >= 2.5) | 1.0x (full credit) |
| Medium (avg 1.5-2.49) | 0.8x |
| Low (avg < 1.5) | 0.5x |
| Unscored | 1.0x (no penalty for missing data) |

**Example:** A 5-point card rated High = 5 adjusted points. A 5-point card rated Low = 2.5 adjusted points.

Multipliers are **Super Admin-configurable**. The Unscored multiplier defaults to `1.0x` during adoption.

### 6.3 Per-Person Quality Trends

A view showing individual quality scores over time using aggregated/anonymized data.

- **Line chart:** Average quality score per week/sprint, per person.
- **Breakdown by dimension:** "Erik consistently trends High on technical quality, Medium on art direction, and Low on context fit."
- **Comparison to team average:** Individual line vs. team average line.
- **Iteration count:** Average number of review cycles per card for this person. Trending down = improvement.

**Access:** Only users with Lead, PO, or Head of Art roles can view aggregated quality summaries.

### 6.4 Iteration Count Distribution

A histogram showing how many review cycles cards typically need before reaching Done.

- **Average cycles to Done:** Overall for finalized tasks.
- **High-churn flag:** Cards with 3+ cycles are flagged — may indicate unclear briefs, scope creep, or skill gaps.
- **Correlation view:** Do cards with more cycles end up with higher or lower final quality scores? (Ideally, more cycles = higher final quality. If not, the feedback loop isn't working.)

### 6.5 Filter Dimensions

All dashboards support filtering by:

- Time period (week, sprint, month, quarter)
- Team
- Person (artist)
- Project

---

## 7. API Endpoints

### 7.1 Review Cycles

| Method | Path | Description | Access |
|--------|------|-------------|--------|
| GET | `/api/cards/:cardId/cycles` | List all review cycles for a card | Member+ |
| GET | `/api/cards/:cardId/cycles/current` | Get the most recent cycle (open or closed) | Member+ |

*Cycles are created/closed automatically by column transitions — no manual endpoints.*

### 7.2 Evaluations

| Method | Path | Description | Access |
|--------|------|-------------|--------|
| POST | `/api/cycles/:cycleId/evaluate` | Submit an evaluation | Lead, PO, Head of Art |
| PATCH | `/api/cycles/:cycleId/evaluate` | Update an existing evaluation | Lead, PO, Head of Art (own only) |
| GET | `/api/cycles/:cycleId/evaluations` | Aggregated/anonymized cycle results | Member+ |
| GET | `/api/cards/:cardId/quality` | Aggregated quality data across all cycles | Member+ |
| GET | `/api/me/pending-evaluations` | List cycles where current user has not yet evaluated | Lead, PO, Head of Art |

### 7.3 Evaluation Question Settings (Super Admin)

| Method | Path | Description | Access |
|--------|------|-------------|--------|
| GET | `/api/review-questions` | List evaluation questions and mappings | Member+ |
| POST | `/api/review-questions` | Create a question | Super Admin |
| PATCH | `/api/review-questions/:id` | Update question text/description/active state | Super Admin |
| DELETE | `/api/review-questions/:id` | Delete or deactivate a question | Super Admin |
| PUT | `/api/review-questions/:id/audience` | Set evaluator audience (`LEAD`, `PO`, `BOTH`) | Super Admin |
| PUT | `/api/review-questions/reorder` | Update display order | Super Admin |

### 7.4 Metrics

| Method | Path | Description | Access |
|--------|------|-------------|--------|
| GET | `/api/metrics/velocity` | Burn-up data with quality overlay | Member+ |
| GET | `/api/metrics/quality-adjusted-velocity` | Weighted velocity | Lead/PO/Head of Art |
| GET | `/api/metrics/users/:userId/quality-summary` | User-page quality summary data | Lead/PO/Head of Art |
| GET | `/api/metrics/projects/:projectId/quality-summary` | Project Statistics quality summary data | Lead/PO/Head of Art |
| GET | `/api/metrics/teams/:teamId/quality-summary` | Team page quality summary by project | Lead/PO/Head of Art |
| GET | `/api/metrics/studios/:studioId/quality-summary` | Studio page quality summary across projects | Lead/PO/Head of Art |
| GET | `/api/metrics/iteration-distribution` | Review cycle count distribution | Lead/PO/Head of Art |

---

## 8. Seed Data

```typescript
// Evaluation questions
const reviewQuestions = [
  { name: 'Technical Quality', description: 'Craft and execution quality - mesh, textures, rigging', position: 1 },
  { name: 'Art Direction Alignment', description: 'Matches the project visual target and style guide', position: 2 },
  { name: 'Context Fit', description: 'Works in the actual game/product - camera distance, clipping, readability', position: 3 },
  { name: 'Delivery', description: 'Notes addressed, delivered on time, professional process', position: 4 },
];

// Scoring options (fixed)
const scoringOptions = ['LOW', 'MEDIUM', 'HIGH', 'NOT_APPLICABLE'];

// Question audience mapping (Head of Art always sees all active questions)
const questionAudience = [
  { question: 'Technical Quality', audience: 'LEAD' },
  { question: 'Art Direction Alignment', audience: 'LEAD' },
  { question: 'Context Fit', audience: 'PO' },
  { question: 'Delivery', audience: 'PO' },
];

```

---

## 9. Implementation Notes

### 9.1 Column Transition Detection

The cycle automation hooks into the existing card move handler. Cycle creation and closing happens **server-side** on confirmed moves — not on optimistic client updates via dnd-kit.

### 9.2 Debouncing

Rapid column changes (accidental drags) should not create spurious cycles. Use delayed creation:

1. Card enters Review -> start a 2-second timer.
2. If the card leaves Review before the timer finishes -> do not create a cycle.
3. If the card is still in Review after 2 seconds -> create the cycle.
4. When it later leaves Review -> close that cycle.

This avoids create-then-delete race conditions and keeps cycle history clean.

### 9.3 Aggregation Strategy

Quality scores for dashboards should be **computed at query time** in the initial implementation. No denormalized summary tables.

Aggregation rules:

- Use only submitted, applicable scores.
- `NOT_APPLICABLE` scores are excluded from averages.
- Missing question scores are excluded from averages.
- If a question has no applicable scores, omit it from aggregate score math.

Confidence rules (per question, based on score count `n`):

- Green confidence: `n >= 20`
- Amber confidence: `5 <= n < 20`
- Red confidence: `n < 5`

If query performance degrades at scale, introduce a `CardQualitySummary` materialized view or periodic aggregation job.

### 9.4 Weighting (Future-Ready)

The current implementation does **not** weight scores by reviewer role. All eligible reviewers' scores are averaged equally within each question.

Future extension example:

```prisma
model DimensionRole {
  // ... existing fields ...
  weight Float @default(1.0)
}
```

This would allow weighting by audience in the future without schema redesign.

### 9.5 Permissions Matrix

| Action | Viewer | Member | Artist | Lead | PO | Head of Art | Admin | Super Admin |
|--------|--------|--------|--------|------|----|-------------|-------|-------------|
| View aggregated quality scores/trends | - | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| View User page quality summaries | - | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| View Project Statistics quality summaries | - | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Submit evaluation (any board) | - | - | - | Yes | Yes | Yes | Role-based only | Role-based only |
| Edit own evaluation | - | - | - | Yes | Yes | Yes | Role-based only | Role-based only |
| View pending evaluations list | - | - | - | Yes | Yes | Yes | Role-based only | Role-based only |
| Configure evaluation questions/settings page | - | - | - | - | - | - | - | Yes |
| Set quality multipliers | - | - | - | - | - | - | - | Yes |

### 9.6 Relationship to Existing Features

- **Story Points:** Quality metrics pair with story points for velocity calculations. Cards without story points can still be evaluated but won't appear in velocity charts.
- **Comments/Feedback:** The existing card comment system handles all detailed, attributed feedback. The evaluation system is purely for structured, anonymous scoring. These are complementary, not overlapping.
- **Timeline/Events:** Quality data can be aggregated per Event (phase block) to show quality trends across project phases on the timeline view.
- **Card Status Columns:** The Review column is the trigger for cycle creation. The system needs to know which column(s) are designated as "Review" type — this should be part of column configuration.









