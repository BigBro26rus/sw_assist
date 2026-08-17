import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const router = Router();

const characterBodySchema = z
  .object({
    uuid: z.string().optional(),
    concept: z
      .object({
        name: z.string().optional(),
        description: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

router.post('/', async (req, res) => {
  const parsed = characterBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Неверные данные' });
  }

  const data = parsed.data;
  const uuid = data.uuid || randomUUID();
  const name = data.concept?.name?.trim() || 'Безымянный';
  const payload = { ...data, uuid };

  await prisma.character.upsert({
    where: { uuid },
    create: { uuid, name, data: payload },
    update: { name, data: payload },
  });

  return res.status(201).json({ success: true, uuid });
});

router.get('/:uuid', async (req, res) => {
  const character = await prisma.character.findUnique({
    where: { uuid: req.params.uuid },
  });

  if (!character) {
    return res.status(404).json({ error: 'Персонаж не найден' });
  }

  return res.json(character.data);
});

router.put('/:uuid', async (req, res) => {
  const parsed = characterBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Неверные данные' });
  }

  const data = { ...parsed.data, uuid: req.params.uuid };
  const name = data.concept?.name?.trim() || 'Безымянный';

  const existing = await prisma.character.findUnique({ where: { uuid: req.params.uuid } });
  if (!existing) {
    return res.status(404).json({ error: 'Персонаж не найден' });
  }

  await prisma.character.update({
    where: { uuid: req.params.uuid },
    data: { name, data },
  });

  return res.json({ success: true });
});

export default router;
