# YCCC Contest Award Scoring System

## Overview
This project is an automated scoring system for the Yankee Clipper Contest Club (YCCC) ham radio contests, named "YCCC Awards Program." It processes Cabrillo log files, validates club membership and categories, calculates normalized scores using a defined formula, and displays results on a live scoreboard. The system supports historical data viewing and aims to provide a professional, data-focused platform for tracking contest performance.

## User Preferences
- **Default theme**: Dark mode (set in ThemeProvider)
- **Design**: Data-focused, minimal UI, info-dense tables, professional ham radio aesthetic
- **Font**: Inter (UI), JetBrains Mono (callsigns, scores)
- **Color scheme**: Blue primary, muted backgrounds, clear status badges (green=accepted, red=rejected)

## System Architecture

### Stack
- **Frontend**: React + Vite, TailwindCSS, Shadcn UI, Wouter (routing), TanStack Query
- **Backend**: Express.js, PostgreSQL (Neon), Drizzle ORM
- **File Processing**: Multer (uploads), PapaParse (CSV parsing)

### Technical Implementations
- **Cabrillo Log Processing**: Parses Cabrillo files to extract contest, callsign, claimed score, operators, club, and mode. Enhanced to detect "Yankee Clipper Contest Club" or "YCCC" even when CLUB field contains multiple club names. The CONTEST field becomes the unique contest identifier (contestKey).
- **Contest Identification**: Contests are uniquely identified by the CONTEST field from Cabrillo logs (stored as contestKey). MODE is captured separately for display purposes only and is not used for contest identification or scoring calculations.
- **Dues Validation & Inclusive Scoring**: Validates operator dues against a roster. Submissions are accepted if at least one operator has valid dues; only operators with current dues are scored. Operators with expired dues are excluded from scoring calculations with a warning.
- **Configurable Scoring System**: Administrators can choose between two scoring methods via the Admin panel:
  - **Fixed Method** (default): Uses a fixed maximum of 1,000,000 points for all contests. Formula: `(IndividualClaimed / HighestSingleOpForContest) × 1,000,000`
  - **Participant-Based Method**: Dynamic maximum based on unique member operators. Formula: `(IndividualClaimed / HighestSingleOpForContest) × min(uniqueOperators × 50,000, 1,000,000)`. Counts all unique member operators across all accepted submissions for each contest/year. Maximum cap of 1,000,000 points (20 participants).
- **Scoring Engine**: Implements normalized scoring using the selected method. `IndividualClaimed` is `ClaimedScore / TotalOperators`. All points are rounded to whole numbers.
- **Baseline Calculation**: Dynamically computes the highest single-operator claimed score for each contest (identified by contestKey) to establish a baseline for normalization. Baselines are stored by (seasonYear, contestKey) only.
- **Duplicate Submission Handling**: Ensures that only the latest submission for a given callsign, contest, and year is active, deactivating previous submissions. Deactivation targets (callsign, contestKey, year) regardless of MODE.
- **Dynamic Contest Year Parsing**: Extracts the contest year directly from QSO record dates in Cabrillo logs, allowing for historical data analysis and year-specific leaderboards.
- **Dense Ranking**: Leaderboards utilize dense ranking (e.g., 1,1,1,2) for ties.
- **Points Rounding**: Both individual claimed points and YCCC Points (normalized points) are rounded to whole numbers for storage and display.
- **Perpetual Scoring**: Provides both current season and all-time aggregated leaderboards.
- **Multiple File Upload**: Supports simultaneous upload of multiple Cabrillo log files.
- **Admin Functionality**: Includes features for syncing the member roster from the YCCC website and clearing all contest data.
- **Members List**: Clickable Active Members stat card links to /members page showing all eligible members with current dues for the season. Displays callsign, name, dues expiration, and aliases in a sortable table.
- **Contest Insights**: Homepage displays:
  - **Most Active Operators**: Top 5 operators by number of submitted logs with tie handling. Displays entry count (e.g., "3 logs" or "1 log"). Links to operator detail pages. API: `/api/insights/active-operators` returns top 5+ (including ties) based on entry count.
  - **Most Competitive Contests**: Top 5 contests by submission count with dense ranking. Contests with the same submission count receive the same rank (e.g., 1, 1, 2). Displays rank and count (e.g., "#1" followed by "4 logs"). Links to contest detail pages. API: `/api/insights/competitive-contests` returns top 5+ (including ties) with dense ranking.
  - Both APIs fetch 100 records initially, then filter to include all records that tie with 5th place, ensuring complete rankings.
- **Operator Detail Page**: New page at `/operator/:callsign` shows comprehensive operator history. Displays all-time rank, total YCCC points, total contests, and a detailed table of all submissions. API: `/api/operator/:callsign`.
- **Year Display**: All submission and contest result views display the contest year extracted from QSO dates in the Cabrillo log, not the submission timestamp. This ensures accurate historical tracking.
- **Interactive Insights**: Entry count and submission count links in homepage insight cards are clickable. Clicking submission count in "Most Competitive Contests" navigates to contest detail page; clicking entry count in "Most Active Operators" navigates to operator detail page.
- **Contest List Page**: The /contests page displays all contests for the current season with clickable submission counts on each card. The log count (e.g., "4 logs" or "1 log") is styled as a link that navigates to the contest detail page showing all submissions.
- **Real-Time Updates**: WebSocket-based live updates automatically refresh the homepage when new logs are uploaded or roster is synced. No manual page refresh required. Server broadcasts "submission:created" and "roster:synced" events to all connected clients.
- **Automatic Daily Roster Sync**: Scheduler runs roster synchronization from yccc.org immediately on server startup and then every 24 hours. Ensures member roster stays current automatically without manual intervention.

### UI/UX Decisions
- **Layout**: Clean, minimal design with tabs for different leaderboard views (e.g., "2025 Season", "All-Time", "Historical").
- **Information Density**: Focuses on displaying key data clearly, with clickable elements for detailed views. Homepage features streamlined 2-card layout combining stats with top performer lists.
- **Branding**: Renamed to "YCCC Awards Program" to reflect a broader scope.
- **Homepage Cards**: Two combined cards - (1) Active Members + Most Active Operators, (2) Contests Tracked + Most Competitive Contests. Each card has clickable stat area with navigation and informational list below.

### Database Schema
- **members**: Stores callsign, active status, aliases, names, and dues expiration.
- **submissions**: Records contest metadata, claimed scores, operator lists, MODE (for display), and status.
- **raw_logs**: Stores the original Cabrillo file content.
- **baselines**: Stores the highest single-claimed score for each contest/year. Unique key: (seasonYear, contestKey). MODE is not used in baseline calculations.
- **operator_points**: Stores individual and normalized points for each scored member operator.
- **scoring_config**: Stores key-value configuration for scoring method ('fixed' or 'participant-based') with update timestamps.

## External Dependencies
- **PostgreSQL (Neon)**: Primary database for all application data.
- **yccc.org/roster/**: Source for syncing the club member roster.