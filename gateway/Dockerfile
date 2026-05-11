FROM python:3.12-slim

WORKDIR /app

# Install gateway dependencies
COPY gateway/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy gateway code
COPY gateway/ gateway/

# Expose WS + REST port
EXPOSE 9090

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:9090/api/status')" || exit 1

CMD ["python", "-m", "gateway", "--host", "0.0.0.0", "--port", "9090"]
