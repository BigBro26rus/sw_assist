import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (_req, res) => {
  const characters = await prisma.character.findMany({
    orderBy: { updatedAt: 'desc' },
    select: {
      uuid: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json(
    characters.map((c) => ({
      uuid: c.uuid,
      name: c.name,
      created: c.updatedAt.getTime() / 1000,
    }))
  );
});

export default router;
