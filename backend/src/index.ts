import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import queryRouter from './routes/query';
import testConnectionRouter from './routes/testConnection';
import databasesRouter from './routes/databases';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

app.use(cors({
  origin: process.env.CORS_ORIGIN ?? '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/query', queryRouter);
app.use('/api/test-connection', testConnectionRouter);
app.use('/api/databases', databasesRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`SQL Client backend running on port ${PORT}`);
});

export default app;
