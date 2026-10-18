#!/bin/bash
set -e
cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
  echo ">>> Creating virtual environment..."
  python3 -m venv venv
fi

echo ">>> Activating virtual environment..."
source venv/bin/activate

echo ">>> Installing / updating dependencies..."
pip install -r requirements.txt --quiet

if [ ! -f ".env" ]; then
  echo ">>> Creating .env from example..."
  cp .env.example .env
fi

echo ">>> Starting server on http://0.0.0.0:8000"
echo ">>> Press Ctrl+C to stop"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
