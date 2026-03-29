#!/bin/bash
set -e

echo "=== Call Center QA Backend ==="
echo ""

# Start services
echo "1. Starting PostgreSQL and API via Docker Compose..."
docker compose up -d --build

echo ""
echo "2. Waiting for database to be ready..."
sleep 3

echo ""
echo "3. Seeding database with demo data..."
docker compose exec api python -m app.seed

echo ""
echo "=== Backend is running! ==="
echo ""
echo "  API:     http://localhost:8000"
echo "  Docs:    http://localhost:8000/docs"
echo "  Health:  http://localhost:8000/api/health"
echo "  DB:      postgresql://callcenter:callcenter_secret@localhost:5432/callcenter"
echo ""
echo "  Run 'docker compose logs -f api' to see API logs."
echo "  Run 'docker compose down' to stop everything."
