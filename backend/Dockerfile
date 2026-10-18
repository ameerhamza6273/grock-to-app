FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libjpeg62-turbo zlib1g \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# World-writable so it also works where the container runs as a non-root user
# (e.g. Hugging Face Spaces runs as uid 1000)
RUN mkdir -p uploads/templates uploads/rotors uploads/pads uploads/results data \
    && chmod -R 777 uploads data

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
