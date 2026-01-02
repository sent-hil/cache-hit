# Branch Protection Setup

This document explains how to set up branch protection rules to require CI checks before merging PRs.

## Required Status Checks

The following CI checks must pass before a PR can be merged:

1. **Backend Tests** - Runs linting, type checking, and tests for the Python backend
2. **Frontend Tests** - Runs linting, tests, and build checks for the frontend
3. **Docker Availability Check** - Verifies Docker is available for containerized tests

## Setting Up Branch Protection Rules

### Via GitHub Web UI

1. Go to your repository on GitHub
2. Click **Settings** → **Branches**
3. Under "Branch protection rules", click **Add rule**
4. Configure the following:

   **Branch name pattern:** `main` (or `master`)

   ✅ **Require a pull request before merging**
   - Require approvals: 1 (optional, adjust as needed)

   ✅ **Require status checks to pass before merging**
   - Require branches to be up to date before merging
   - Add the following status checks:
     - `Backend Tests`
     - `Frontend Tests`
     - `Docker Availability Check`

   ✅ **Require conversation resolution before merging** (optional)

   ✅ **Do not allow bypassing the above settings**

5. Click **Create** or **Save changes**

### Via GitHub CLI

```bash
# Install gh CLI if not already installed: https://cli.github.com/

# Enable branch protection with required status checks
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks[strict]=true \
  --field required_status_checks[contexts][]=Backend Tests \
  --field required_status_checks[contexts][]=Frontend Tests \
  --field required_status_checks[contexts][]=Docker Availability Check \
  --field required_pull_request_reviews[required_approving_review_count]=1 \
  --field enforce_admins=true \
  --field required_conversation_resolution=true
```

## CI Workflow Details

The CI workflow (`.github/workflows/ci.yml`) runs automatically on:
- Push to `main` or `master` branch
- Pull requests targeting `main` or `master` branch

### Backend Tests Job
- Linting with `ruff check`
- Code formatting check with `ruff format --check`
- Type checking with `ty check`
- Unit and integration tests with `pytest`
- Pulls required Docker images (`python:3.10-alpine`, `ruby:3.2-alpine`)

### Frontend Tests Job
- Linting with ESLint
- Unit tests with Vitest
- Build verification

### Docker Availability Check Job
- Verifies Docker daemon is running
- Checks Docker Compose is available

## Local Development

Before pushing code, run the same checks locally:

### Backend
```bash
cd backend
uv run ruff check .
uv run ruff format --check .
uv run ty check
uv run pytest tests/ -v
```

### Frontend
```bash
cd frontend
npm run lint
npm run test
npm run build
```

## Troubleshooting

### Status checks not appearing
- Wait for the first PR to run the CI workflow
- Status checks only appear in the list after they've run at least once

### MOCHI_API_KEY secret
- The backend tests need a `MOCHI_API_KEY` environment variable
- For CI, add it as a repository secret:
  - Go to **Settings** → **Secrets and variables** → **Actions**
  - Click **New repository secret**
  - Name: `MOCHI_API_KEY`
  - Value: Your Mochi API key from https://app.mochi.cards/settings/api
- If not set, the workflow uses a test key for CI

## Badge

Add this badge to your README.md to show CI status:

```markdown
[![CI](https://github.com/YOUR_USERNAME/cache-hit/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/cache-hit/actions/workflows/ci.yml)
```
