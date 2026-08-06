#!/bin/bash
echo "Installing uv..."
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"

echo "Exporting uv lockfile to requirements.txt for Vercel's Python builder..."
cd api
uv export --format requirements-txt --no-hashes --no-dev > requirements.txt
cd ..

echo "Building frontend..."
npm run build
