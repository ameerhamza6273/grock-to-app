# Hugging Face Space (Docker SDK) for the testing backend — no card needed.
# The Space repo holds only this file + README.md; the code is pulled from GitHub at build.
# "Factory rebuild" in the Space settings picks up new commits on master.
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git libjpeg62-turbo zlib1g \
    && rm -rf /var/lib/apt/lists/*

# Changes whenever master gets a new commit, so the clone below isn't served from cache
ADD https://api.github.com/repos/ameerhamza6273/grock-to-app/git/refs/heads/master /tmp/master.json
RUN git clone --depth 1 https://github.com/ameerhamza6273/grock-to-app.git /tmp/repo \
    && mv /tmp/repo/backend /app && rm -rf /tmp/repo

WORKDIR /app
RUN pip install --no-cache-dir -r requirements.txt

# Spaces run the container as uid 1000; storage is not persistent (resets on restart)
RUN mkdir -p uploads/templates uploads/rotors uploads/pads uploads/results data \
    && chmod -R 777 uploads data

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
