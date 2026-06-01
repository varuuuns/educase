# GitHub Profile Analyzer API

A backend service that analyzes GitHub user profiles via the public GitHub API, derives useful insights (language breakdown, repo stats, activity metrics), and persists them in a MySQL database for later retrieval.

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** MySQL
- **HTTP Client:** Axios
- **Third-Party API:** GitHub REST API v3

## Features

| Feature | Description |
|---|---|
| **Profile Analysis** | Fetch and analyze any public GitHub profile |
| **Language Breakdown** | Aggregate language usage across all repos with percentages |
| **Top Repositories** | Store the top 10 repos by stars with full metadata |
| **Pagination + Search** | List profiles with `page`, `limit`, `search`, `sortBy`, `order` |
| **Profile Comparison** | Compare 2-5 profiles side-by-side |
| **Soft Delete** | Mark profiles as deleted without losing data |
| **Re-analysis** | Re-analyzing updates existing data instead of duplicating |
| **API Key Auth** | All endpoints protected by `x-api-key` header |
| **Derived Insights** | Follower ratio, account age in days |

## Architecture (SOLID Principles)

```
src/
├── config/          # Environment + Database configuration
├── interfaces/      # Abstractions (DIP: Dependency Inversion)
├── repositories/    # Data access layer (SRP: Single Responsibility)
├── services/        # Business logic (OCP: Open-Closed)
├── controllers/     # HTTP handlers (SRP: only HTTP concerns)
├── middleware/       # Auth, validation, error handling
├── routes/          # Route definitions + DI composition root
├── types/           # Shared DTOs and type definitions
├── errors/          # Custom error hierarchy
└── utils/           # Shared utilities
```

## Setup

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- A GitHub Personal Access Token (optional but recommended)

### Installation

```bash
# 1. Clone and install
git clone <repo-url>
cd educase
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your MySQL credentials and optional GitHub token

# 3. Start development server (auto-creates database + tables)
npm run dev
```

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | Server port |
| `DB_HOST` | Yes | - | MySQL host |
| `DB_PORT` | No | `3306` | MySQL port |
| `DB_USER` | Yes | - | MySQL user |
| `DB_PASSWORD` | Yes | - | MySQL password |
| `DB_NAME` | Yes | - | Database name (auto-created) |
| `GITHUB_TOKEN` | No | - | GitHub PAT (increases rate limit to 5,000/hr) |
| `API_KEY` | Yes | - | API key for authenticating requests |

## API Reference

> **Authentication:** All endpoints (except health check) require the `x-api-key` header.

### Health Check
```
GET /api/health
```
No authentication required. Returns `{ status: "ok" }`.

---

### Analyze a Profile
```
POST /api/profiles/:username/analyze
```
Fetches fresh data from GitHub, computes insights, and stores everything.

**Example:**
```bash
curl -X POST http://localhost:3000/api/profiles/torvalds/analyze \
  -H "x-api-key: your-api-key"
```

---

### List All Profiles
```
GET /api/profiles
```

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Results per page (max 100) |
| `search` | string | - | Filter by username or name |
| `sortBy` | string | `analyzed_at` | Sort column: `followers`, `public_repos`, `analyzed_at`, `account_age_days`, `follower_ratio` |
| `order` | string | `desc` | Sort order: `asc` or `desc` |

**Example:**
```bash
curl http://localhost:3000/api/profiles?search=tor&sortBy=followers&order=desc \
  -H "x-api-key: your-api-key"
```

---

### Get Single Profile
```
GET /api/profiles/:username
```
Returns full profile with language breakdown and top repositories.

```bash
curl http://localhost:3000/api/profiles/torvalds \
  -H "x-api-key: your-api-key"
```

---

### Delete a Profile
```
DELETE /api/profiles/:username
```
Soft-deletes the profile (excluded from listings but data preserved).

```bash
curl -X DELETE http://localhost:3000/api/profiles/torvalds \
  -H "x-api-key: your-api-key"
```

---

### Compare Profiles
```
POST /api/profiles/compare
```
Compare 2-5 previously analyzed profiles side-by-side.

```bash
curl -X POST http://localhost:3000/api/profiles/compare \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"usernames": ["torvalds", "octocat"]}'
```

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "message": "Description of the error",
    "code": 404
  }
}
```

| Code | Description |
|---|---|
| 400 | Validation error (invalid input) |
| 401 | Unauthorized (missing or invalid API key) |
| 404 | Resource not found |
| 429 | GitHub API rate limit exceeded |
| 500 | Internal server error |
| 502 | GitHub API error |

## Scripts

```bash
npm run dev      # Start dev server with hot reload
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled production build
```
