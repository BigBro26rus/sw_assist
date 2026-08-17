import express from 'express';
import cors from 'cors';
import gameDataRoutes from './routes/gameData.js';
import characterRoutes from './routes/character.js';
import charactersRoutes from './routes/characters.js';

const app = express();
const PORT = Number(process.env.PORT) || 8787;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api', gameDataRoutes);
app.use('/api/character', characterRoutes);
app.use('/api/characters', charactersRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
