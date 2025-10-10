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
- **Cabrillo Log Processing**: Parses Cabrillo files to extract contest, callsign, claimed score, operators, club, and mode. Enhanced to detect "Yankee Clipper Contest Club" or "YCCC" even when CLUB field contains multiple club names.
- **Dues Validation & Inclusive Scoring**: Validates operator dues against a roster. Submissions are accepted if at least one operator has valid dues; only operators with current dues are scored. Operators with expired dues are excluded from scoring calculations with a warning.
- **Scoring Engine**: Implements a normalized scoring formula: `(IndividualClaimed / HighestSingleOpForContestMode) × 1,000,000`. `IndividualClaimed` is `ClaimedScore / TotalOperators`.
- **Baseline Calculation**: Dynamically computes the highest single-operator claimed score for each contest and mode combination to establish a baseline for normalization.
- **Duplicate Submission Handling**: Ensures that only the latest submission for a given callsign, contest, mode, and year is active, deactivating previous submissions.
- **Dynamic Contest Year Parsing**: Extracts the contest year directly from QSO record dates in Cabrillo logs, allowing for historical data analysis and year-specific leaderboards.
- **Dense Ranking**: Leaderboards utilize dense ranking (e.g., 1,1,1,2) for ties.
- **Claimed Points Rounding**: Individual claimed points are rounded to the nearest integer for storage and display, while normalized points maintain full precision for ranking.
- **Perpetual Scoring**: Provides both current season and all-time aggregated leaderboards.
- **Multiple File Upload**: Supports simultaneous upload of multiple Cabrillo log files.
- **Admin Functionality**: Includes features for syncing the member roster from the YCCC website and clearing all contest data.
- **Members List**: Clickable Active Members stat card links to /members page showing all eligible members with current dues for the season. Displays callsign, name, dues expiration, and aliases in a sortable table.
- **Contest Insights**: Homepage displays "Most Competitive Contests" showing top 5 contests by unique operator count (all years) and "Most Active Operators" showing top 5 operators by submission count (all years). APIs: `/api/insights/competitive-contests` and `/api/insights/active-operators`.
- **Year Display**: All submission and contest result views display the contest year extracted from QSO dates in the Cabrillo log, not the submission timestamp. This ensures accurate historical tracking.

### UI/UX Decisions
- **Layout**: Clean, minimal design with tabs for different leaderboard views (e.g., "2025 Season", "All-Time", "Historical").
- **Information Density**: Focuses on displaying key data clearly, with clickable elements for detailed views. Homepage features streamlined 2-card layout combining stats with top performer lists.
- **Branding**: Renamed to "YCCC Awards Program" to reflect a broader scope.
- **Homepage Cards**: Two combined cards - (1) Active Members + Most Active Operators, (2) Contests Tracked + Most Competitive Contests. Each card has clickable stat area with navigation and informational list below.

### Database Schema
- **members**: Stores callsign, active status, aliases, names, and dues expiration.
- **submissions**: Records contest metadata, claimed scores, operator lists, and status.
- **raw_logs**: Stores the original Cabrillo file content.
- **baselines**: Stores the highest single-claimed score for each contest/mode/year.
- **operator_points**: Stores individual and normalized points for each scored member operator.

## External Dependencies
- **PostgreSQL (Neon)**: Primary database for all application data.
- **yccc.org/roster/**: Source for syncing the club member roster.