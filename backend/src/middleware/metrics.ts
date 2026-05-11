import { NextFunction, Request, Response } from 'express';
import client from 'prom-client';

const register = new client.Registry();

client.collectDefaultMetrics({
  register,
  prefix: 'placement_portal_',
});

const httpRequestDuration = new client.Histogram({
  name: 'placement_portal_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

const httpRequestTotal = new client.Counter({
  name: 'placement_portal_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);

const normalizeRoute = (req: Request): string => {
  if (req.route?.path) {
    return `${req.baseUrl || ''}${req.route.path}`;
  }

  return req.path || 'unknown';
};

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/api/metrics') {
    next();
    return;
  }

  const endTimer = httpRequestDuration.startTimer();

  res.on('finish', () => {
    const labels = {
      method: req.method,
      route: normalizeRoute(req),
      status_code: String(res.statusCode),
    };

    httpRequestTotal.inc(labels);
    endTimer(labels);
  });

  next();
};

export const getMetrics = async (): Promise<string> => register.metrics();

export const metricsContentType = register.contentType;
