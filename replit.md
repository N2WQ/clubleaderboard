# YCCC Contest Award Scoring System

## Overview
Automated scoring system for Yankee Clipper Contest Club ham radio contests. Ingests Cabrillo log files, validates club membership and categories, computes normalized points using a standardized formula, and publishes a live scoreboard.

**Current State**: MVP completed with full end-to-end functionality - file upload, parsing, validation, scoring, and scoreboard display.

**Season**: 2025 (current year is automatically used)

## Recent Changes
- **2025-10-09**: UI refinements and dense ranking (COMPLETE)
  - Fixed ranking to use dense ranking (1,1,1,2) instead of competition ranking (1,1,1,4)
  - Removed large hero text box above stats cards for cleaner layout
  - Tabs now appear directly below stats cards
  - Fixed Submissions count to properly sum numbers instead of concatenating strings

- **2025-10-09**: Branding and perpetual scoring updates (COMPLETE)
  - Rebranded from "YCCC Contest Scoring" to "YCCC Awards Program"
  - Removed subtitle "Automated normalized scoring for Yankee Clipper Contest Club members"
  - Added tabbed leaderboard: "2025 Season" and "All-Time" views
  - Implemented getAllTimeLeaderboard() API that aggregates normalized points across ALL years
  - Backend supports `/api/leaderboard?type=season` and `/api/leaderboard?type=alltime`
  - Frontend uses React Query with 5-minute staleTime to cache both datasets
  - Stats cards and hero title dynamically update based on active tab
  
- **2025-10-09**: Contest naming simplified (COMPLETE)
  - Removed CONTEST_ALIASES dictionary - no more normalization
  - Uses exact CONTEST field from Cabrillo logs (uppercased)
  - Example: "CQ-WW-CW" stored as-is, not mapped to "CQWW"
  - Fixed: Added unique constraint on baselines (season_year, contest_key, mode)
  - Simplified maintenance - logging software controls contest naming
  
- **2025-10-09**: Frontend improvements (COMPLETE)
  - Removed rank icons from leaderboard
  - Made contests and normalized points clickable
  - Added AllSubmissions page (/submissions?callsign=XX) to view operator's submissions
  - Fixed query parameter parsing using window.location.search
  - Leaderboard tie handling: dense ranking (operators with same points get same rank, e.g., 1,1,1,2)

- **2025-10-09**: Inclusive scoring with dues validation (COMPLETE)
  - **NEW**: Inclusive scoring - accepts logs if ANY operator has valid dues
  - Only operators with current dues (>= 12/31/YYYY) receive points
  - Operators with expired/missing dues are excluded from scoring with warning
  - Rejects ONLY if ALL operators have expired/missing dues
  - UI shows success alert + warning about excluded operators
  - Added firstName, lastName, duesExpiration fields to members table
  - Roster scraper using native https module (fetches from https://yccc.org/roster/)
  - API endpoint POST /api/admin/sync-roster (syncs 442+ members automatically)
  - Admin UI: "Sync from Website" button with loading states
  - Database fix: Added unique constraint on baselines (season_year, contest_key, mode)
  - **Security fix**: Removed debug endpoint, transactional roster sync
  
- **2025-01-09**: Complete MVP implementation
  - Database schema with PostgreSQL (members, submissions, raw_logs, baselines, operator_points)
  - Cabrillo parser with contest alias mapping (CQWW, ARRLDX, CQWPX, IARU, SWEEPSTAKES, etc.)
  - Scoring engine with normalization formula: (ClaimedScore/EffectiveOperators/HighestSingleOp) × 1,000,000
  - Validation logic: club affiliation (case-insensitive), multi-op operator count (≥2 members required)
  - Duplicate submission handling (latest wins, deletes old operator_points)
  - Frontend with real-time data: season leaderboard, member details, contest results
  - Admin dashboard: roster CSV upload, submission stats, manual recompute

## Project Architecture

### Stack
- **Frontend**: React + Vite, TailwindCSS, Shadcn UI, Wouter (routing), TanStack Query
- **Backend**: Express.js, PostgreSQL (Neon), Drizzle ORM
- **File Processing**: Multer (uploads), PapaParse (CSV parsing)

### Directory Structure
```
client/
  src/
    components/        # Reusable UI components
    pages/             # Route pages (Home, Upload, Admin, Member, Contest)
    lib/               # Query client, utilities
server/
  cabrillo-parser.ts   # Parses Cabrillo logs
  scoring-engine.ts    # Validates submissions, computes normalized points
  routes.ts            # API endpoints
  storage.ts           # Database interface (Drizzle)
shared/
  schema.ts            # Database schema (single source of truth)
test-data/             # Sample roster.csv and Cabrillo logs for testing
```

### Database Schema
- **members**: callsign (PK), active_yn, aliases (comma-separated), firstName, lastName, duesExpiration
- **submissions**: season_year, contest_key, mode, callsign, claimed_score, operator_list, member_operators, effective_operators, status, is_active
- **raw_logs**: submission_id, filename, content (full Cabrillo text)
- **baselines**: (season_year, contest_key, mode) → highest_single_claimed [UNIQUE constraint enforced]
- **operator_points**: submission_id, member_callsign, individual_claimed, normalized_points

## How It Works

### 1. Submission Flow
1. User uploads Cabrillo .log/.cbr file via `/upload` page
2. Backend parses file → extracts contest, callsign, claimed score, operators, club, mode
3. Validates club = "Yankee Clipper Contest Club" (case-insensitive)
4. Cross-checks operators against roster → separates into valid (current dues) vs expired dues
5. **Inclusive scoring**: Accepts if ≥1 operator has valid dues, rejects only if ALL have expired/missing dues
6. Operators with expired dues are excluded from scoring (with warning message)
7. Deactivates any previous submission for same (callsign, contest, mode, year) and deletes its operator_points
8. Stores submission + raw log
9. Recomputes baseline (highest single-op score for that contest/mode)
10. Calculates normalized points for each valid member operator only
11. Returns success with normalized points + warning about excluded operators (if any)

### 2. Scoring Formula
```
EffectiveOperators = count(YCCC members with VALID DUES in OPERATORS list)
                     (if SINGLE-OP category, always = 1)
                     (operators with expired dues are excluded)

IndividualClaimed = ClaimedScore / EffectiveOperators

HighestSingleOpForContestMode = max(ClaimedScore where EffectiveOperators == 1,
                                    same contest_key, same mode, same season)

NormalizedPoints = (IndividualClaimed / HighestSingleOpForContestMode) × 1,000,000
```

**Edge Cases**:
- **Ties**: Multiple highest single-ops → all get 1,000,000 normalized
- **No single-op yet**: Uses max(IndividualClaimed) as provisional baseline
- **Baseline recalculation**: Triggered on every submission for that contest/mode

### 3. Contest Naming
The system uses the exact `CONTEST:` field from Cabrillo logs (uppercased and trimmed).
- No aliasing or normalization applied
- Contest names controlled by logging software (e.g., N1MM, WriteLog, etc.)
- Example: `CONTEST: CQ-WW-CW` → stored as `CQ-WW-CW`
- Mode (CW/SSB/RTTY/MIXED) extracted separately from CATEGORY-MODE or contest name

### 4. Duplicate Submission Logic
**Rule**: Latest submission wins per (callsign, contest, mode, year)

**Implementation**:
1. Query active submissions for same contest/mode/year
2. Find matching callsign
3. Delete old `operator_points` records
4. Set old submission `is_active = false`
5. Create new submission (always `is_active = true`)

This ensures leaderboard queries only count the most recent submission.

## API Endpoints

### Public
- `GET /api/leaderboard?type=season&year=2025` - Season leaderboard (rank, callsign, totalPoints, contests)
- `GET /api/leaderboard?type=alltime` - All-time leaderboard aggregated across all years
- `GET /api/member/:callsign?year=2025` - Member contest history + totals
- `GET /api/contest/:key/:mode?year=2025` - Contest results + baseline
- `POST /api/upload` - Submit Cabrillo log (multipart/form-data, field: `file`)

### Admin
- `POST /api/admin/roster` - Upload roster CSV (CALLSIGN, ACTIVE_YN, ALIAS_CALLS)
- `POST /api/admin/sync-roster` - Sync roster from yccc.org/roster/ (automated, includes dues dates)
- `POST /api/admin/recompute` - Manual baseline recalculation

## Testing

### Sample Data
- **Roster**: `test-data/sample-roster.csv` (10 members: K1AR, W1WEF, K1TTT, etc.)
- **Cabrillo logs**:
  - `test-data/sample-cabrillo.log` (K1AR single-op, CQWW CW, 5,420,000 points)
  - `test-data/sample-multiop.log` (W1XX multi-op with K1TTT + N1UR, CQWW CW, 3,200,000 points)

### Test Flow
1. Go to `/admin` → Upload `test-data/sample-roster.csv`
2. Go to `/upload` → Submit `test-data/sample-cabrillo.log`
   - Should accept → K1AR gets 1,000,000 normalized (highest single-op)
3. Submit `test-data/sample-multiop.log`
   - Should accept → K1TTT, N1UR each get ~295,000 normalized (3,200,000 / 2 / 5,420,000 × 1M)
4. View leaderboard at `/` - should show K1AR at #1, others ranked by normalized points

### Validation Tests
- **Wrong club**: Edit sample log → change CLUB field → should reject
- **Multi-op <2 members**: Edit multi-op log → remove one OPERATORS → should reject
- **Non-member operator**: Edit log → add non-roster callsign to OPERATORS → should be filtered out
- **Duplicate submission**: Upload same log twice → second overwrites first, no double-counting

## User Preferences
- **Default theme**: Dark mode (set in ThemeProvider)
- **Design**: Data-focused, minimal UI, info-dense tables, professional ham radio aesthetic
- **Font**: Inter (UI), JetBrains Mono (callsigns, scores)
- **Color scheme**: Blue primary, muted backgrounds, clear status badges (green=accepted, red=rejected)

## Known Limitations (Not in MVP)
- No email notifications (email field collected but not used)
- No CSV export functionality (endpoint structure exists, not wired up)
- No static HTML generation (PRD specified, but dynamic React app serves same purpose)
- No season reset functionality (button exists, not implemented - would archive current season data)
- Member and Contest detail pages show mock data (not wired to dynamic routes yet)

## Deployment Notes
- Uses Replit PostgreSQL database via `DATABASE_URL`
- Run `npm run db:push` to sync schema
- Run `npm run dev` to start (Express + Vite dev server on port 5000)
- Frontend proxied through Vite, all API routes prefixed `/api`

## Future Enhancements
- Email notifications (Nodemailer integration)
- CSV export downloads
- Historical season archive viewer
- Contest quick links from homepage
- Admin submission override UI (currently backend-only)
- Production database separation (currently shares dev DB)
