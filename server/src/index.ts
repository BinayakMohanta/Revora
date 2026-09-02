import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { router } from './routes/api';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api', router);

app.get('/', (_req, res) => {
  res.json({ name: 'Revora API', status: 'running', docs: '/api/health' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n  ⚡ Revora API running at http://localhost:${PORT}`);
  console.log(`  Mode: DEMO (set RAZORPAY_KEY_ID/SECRET for Test Mode)\n`);
});
