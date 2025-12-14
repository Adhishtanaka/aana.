# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["fastapi", "run", "index.py", "--host", "0.0.0.0", "--port", "8000"]