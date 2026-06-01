import cors from 'cors';
import express, { type Express } from 'express';

import { errBody } from './response';
import { createV1Router, createV2Router } from '../src/routes';
import analyticsRouter from './routes/analytics';
import appointmentsRouter from './routes/appointments';
import medicalRecordsRouter from './routes/medicalRecords';
import medicationsRouter from './routes/medications';
import petsRouter from './routes/pets';
import usersRouter from './routes/users';

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // ── Versioned routes ──────────────────────────────────────────────────────
  app.use('/api/v1', createV1Router());
  app.use('/api/v2', createV2Router());

  // ── Legacy /api prefix — kept for backward compatibility (routes to v1) ──
  const api = express.Router();
  api.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'petchain-api', timestamp: new Date().toISOString() });
  });
  api.use('/analytics', analyticsRouter);
  api.use('/users', usersRouter);
  api.use('/pets', petsRouter);
  api.use('/medical-records', medicalRecordsRouter);
  api.use('/appointments', appointmentsRouter);
  api.use('/medications', medicationsRouter);
  app.use('/api', api);

  app.use((_req, res) => {
    res.status(404).json(errBody('NOT_FOUND', 'Route not found'));
  });

  return app;
}
