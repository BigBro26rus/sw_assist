import { Router } from 'express';
import { loadJson } from '../lib/data.js';

const router = Router();

router.get('/flaws', (_req, res) => {
  res.json(loadJson('flaws.json'));
});

router.get('/skills', (_req, res) => {
  res.json(loadJson('skills.json'));
});

router.get('/traits', (_req, res) => {
  res.json(loadJson('traits.json'));
});

router.get('/traits/:category', (req, res) => {
  const traits = loadJson<Array<{ category?: string }>>('traits.json');
  const filtered = traits.filter((t) => t.category === req.params.category);
  res.json(filtered);
});

router.get('/races', (_req, res) => {
  res.json(loadJson('races.json'));
});

export default router;
