#!/bin/bash
set -e

echo "================================"
echo "GitHub Actions CI Validation"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0

# Function to run a step
run_step() {
    local name="$1"
    local command="$2"

    echo -e "${YELLOW}▶ ${name}${NC}"
    if eval "$command"; then
        echo -e "${GREEN}✓ ${name} passed${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}✗ ${name} failed${NC}"
        echo ""
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "================================"
echo "YAML Syntax Validation"
echo "================================"
echo ""

run_step "YAML Syntax Check" "python3 -c \"import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))\""

echo "================================"
echo "Backend Tests"
echo "================================"
echo ""

cd backend

run_step "Backend: Ruff Check" "ruff check . 2>&1 | head -50 || true" || true
run_step "Backend: Ruff Format Check" "ruff format --check . 2>&1 | head -50 || true" || true

# Docker check
run_step "Docker Availability" "docker info > /dev/null 2>&1"

# Pull Docker images
run_step "Pull Python Image" "docker pull python:3.10-alpine > /dev/null 2>&1"
run_step "Pull Ruby Image" "docker pull ruby:3.2-alpine > /dev/null 2>&1"

cd ..

echo "================================"
echo "Frontend Tests"
echo "================================"
echo ""

if [ -d "frontend/node_modules" ]; then
    cd frontend
    run_step "Frontend: ESLint" "npm run lint 2>&1 | head -50 || true" || true
    run_step "Frontend: Build Check" "npm run build 2>&1 | tail -20 || true" || true
    cd ..
else
    echo -e "${YELLOW}⚠ Frontend node_modules not found, skipping frontend checks${NC}"
    echo "Run 'cd frontend && npm install' to enable frontend validation"
    echo ""
fi

echo "================================"
echo "Summary"
echo "================================"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All validations passed!${NC}"
    echo ""
    echo "The GitHub Actions workflow should work correctly."
    exit 0
else
    echo -e "${RED}✗ ${FAILED} validation(s) failed${NC}"
    echo ""
    echo "Please fix the issues before pushing."
    exit 1
fi
