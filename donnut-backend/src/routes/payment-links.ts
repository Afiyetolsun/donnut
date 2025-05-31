import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();
const router = Router();

// ... existing code ...

// Update payment link status
router.patch('/:id', async (req, res) => {
  console.log('Received PATCH request for payment link:', req.params.id);
  console.log('Request body:', req.body);

  try {
    const { id } = req.params;
    const { active } = z.object({
      active: z.boolean(),
    }).parse(req.body);

    console.log('Validated request data:', { id, active });

    // First check if the link exists
    const existingLink = await prisma.paymentLink.findUnique({
      where: { id },
    });

    if (!existingLink) {
      console.log('Payment link not found:', id);
      return res.status(404).json({ error: 'Payment link not found' });
    }

    console.log('Found existing link:', existingLink);

    const updatedLink = await prisma.paymentLink.update({
      where: { id },
      data: { active },
      include: {
        donations: true,
      },
    });

    console.log('Updated link:', updatedLink);

    return res.json(updatedLink);
  } catch (error) {
    console.error('Error updating payment link:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    return res.status(500).json({ error: 'Failed to update payment link' });
  }
});

export default router; 