# Educase - GitHub Profile Analyzer Backend

Educase is a robust Node.js backend application designed to track, analyze, and compare GitHub profiles. By leveraging the GitHub API, Educase provides deep insights into developers' coding habits, follower growth, repository statistics, and most-used programming languages.

## 🚀 Features

- **Profile Analysis**: Fetch detailed metrics from a GitHub user, including their repos, gists, followers, follower ratio, and top languages.
- **Growth Tracking (Cron Job)**: Automatically takes weekly snapshots of follower counts, stars, and repository counts to track a developer's growth over time.
- **Profile Comparison**: Compare multiple GitHub users side-by-side to see who has the best metrics.
- **Soft Deletes**: Safely remove profiles from the active dashboard without losing the historical data in the database.
- **Secure Authentication**: Endpoints are protected via JSON Web Tokens (JWT) or an `x-api-key` header.

## 🛠️ Tech Stack

- **Runtime**: Node.js with TypeScript
- **Database**: MySQL (Aiven) / SQLite
- **API Requests**: Axios
- **Authentication**: JWT & API Keys
- **Scheduling**: Node-Cron (for weekly snapshots)

---

## ⚙️ Setup & Installation

1. **Clone and Install**
   ```bash
   git clone <repo-url>
   cd educase
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   DB_HOST=...
   DB_USER=...
   DB_PASSWORD=...
   DB_NAME=...
   GITHUB_TOKEN=ghp_YourPersonalAccessToken   # CRITICAL: Increases rate limit to 5000/hr
   JWT_SECRET=your_jwt_secret
   API_KEY=your_api_key
   ```

3. **Start the Server**
   ```bash
   # Development mode
   npm run dev

   # Production build
   npm run build
   npm start
   ```

---

## 📚 API Documentation

You can test these endpoints using Postman. For protected endpoints, either use a JWT token (via the `Authorization: Bearer <token>` header) after logging in, or provide the `x-api-key` header.

### Authentication

#### 1. Register a new user
- **URL**: `POST /api/auth/register`
- **Body** (JSON):
  ```json
  {
      "username": "varun",
      "email": "varun@test.com",
      "password": "secret123"
  }
  ```

#### 2. Login
- **URL**: `POST /api/auth/login`
- **Body** (JSON):
  ```json
  {
      "email": "varun@test.com",
      "password": "secret123"
  }
  ```

### Profiles Management

#### 3. Analyze a Profile
Fetches a user from GitHub, calculates their metrics, and saves them to the database.
- **URL**: `POST /api/profiles/:username/analyze`
- **Headers**: `x-api-key: <your_key>`
- **Example**: `POST /api/profiles/octocat/analyze`

#### 4. Get All Profiles
Retrieves a paginated list of all tracked profiles in the database.
- **URL**: `GET /api/profiles`
- **Headers**: `x-api-key: <your_key>`

#### 5. View Specific Profile
Retrieves detailed insights and language breakdowns for a single profile.
- **URL**: `GET /api/profiles/:username`
- **Headers**: `x-api-key: <your_key>`
- **Example**: `GET /api/profiles/varuuuns`

#### 6. Compare Users
Compare statistics between two or more tracked profiles.
- **URL**: `POST /api/profiles/compare`
- **Headers**: `x-api-key: <your_key>`
- **Body** (JSON):
  ```json
  {
      "usernames": ["torvalds", "octocat"]
  }
  ```

#### 7. Soft Delete Profile
Marks a profile as deleted without removing its historical data from the database.
- **URL**: `DELETE /api/profiles/:username`
- **Headers**: `x-api-key: <your_key>`
- **Example**: `DELETE /api/profiles/octocat`

#### 8. Trigger Manual Snapshot
Manually triggers the weekly growth snapshot logic for all active profiles.
- **URL**: `GET /api/profiles/snapshot-all`
- **Headers**: `x-api-key: <your_key>`

---

## 🔒 Rate Limiting Note
Ensure your `GITHUB_TOKEN` is properly set in the `.env` file. Without it, GitHub limits API calls to 60 per hour, which is easily exhausted during profile analysis. With the token, the limit increases to 5,000 per hour.
