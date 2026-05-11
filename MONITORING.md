# Continuous Monitoring: Prometheus + Grafana

This project includes continuous monitoring for the Placement Portal using:

- Prometheus for metrics collection
- Grafana for dashboards
- Node Exporter for host/system metrics
- `prom-client` in the backend for Express API metrics

## Run Monitoring Locally

Start the backend, Prometheus, Grafana, and Node Exporter:

```bash
docker compose up -d --build backend prometheus grafana node-exporter
```

Open these URLs:

- Backend health: http://localhost:5000/health
- Backend metrics: http://localhost:5000/api/metrics
- Prometheus: http://localhost:9091
- Grafana: http://localhost:3001

Grafana login:

- Username: `admin`
- Password: `admin123`

## What To Show

1. Open `http://localhost:5000/api/metrics`.
   You should see Prometheus text metrics such as:

   ```text
   placement_portal_http_requests_total
   placement_portal_http_request_duration_seconds
   placement_portal_process_cpu_user_seconds_total
   ```

2. Open `http://localhost:9091/targets`.
   Prometheus should show the `placement-backend`, `prometheus`, and `node-exporter` targets as `UP`.

3. Open Grafana at `http://localhost:3001`.
   Go to Dashboards, then open `Placement Portal Overview`.

4. Generate API traffic:

   ```bash
   curl http://localhost:5000/health
   curl http://localhost:5000/api/health
   ```

5. Refresh Grafana.
   The dashboard should show backend status, request rate, API latency, errors, and CPU metrics.

## Interview Explanation

Prometheus continuously scrapes the backend `/api/metrics` endpoint. The backend exports API request count, response status, latency, and default Node.js process metrics. Grafana connects to Prometheus as a datasource and displays the metrics in a dashboard. This helps monitor backend health, traffic, performance, and failures in real time.
