import { Router, Response } from 'express';
import { ObjectId, Int32 } from 'mongodb';
import { getDb } from '../config/db';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * POST /feedback
 * Submit customer feedback for a completed order (Story 6)
 */
router.post('/', authenticate, authorize('customer'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId, rating, weight, price, behavior, comments } = req.body;

    if (!ObjectId.isValid(orderId)) {
      res.status(400).json({ error: 'Invalid orderId format' });
      return;
    }

    const db = getDb();
    const ordersCol = db.collection('orders');
    const feedbackCol = db.collection('feedback');

    // Verify order exists and belongs to customer
    const order = await ordersCol.findOne({ _id: new ObjectId(orderId) });
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (!order.customerId || (order.customerId.toString() !== req.user!.userId)) {
      res.status(403).json({ error: 'Unauthorized to provide feedback for this order' });
      return;
    }

    // Check if feedback already exists
    const existingFeedback = await feedbackCol.findOne({ orderId: new ObjectId(orderId) });
    if (existingFeedback) {
      res.status(409).json({ error: 'Feedback already submitted for this order' });
      return;
    }

    const feedbackDoc = {
      orderId: new ObjectId(orderId),
      customerId: new ObjectId(req.user!.userId),
      scrapChampId: order.assignedScrapChampId || null,
      rating: new Int32(Math.floor(Number(rating))), // Ensure strict BSON Int32 for the validator
      weight: weight ? parseFloat(weight) : null,
      price: price ? parseFloat(price) : null,
      behavior: behavior || null,
      comments: comments || null,
      createdAt: new Date(),
    };

    console.log('[feedback] Inserting feedback:', feedbackDoc);
    await feedbackCol.insertOne(feedbackDoc);

    res.status(201).json({ message: 'Feedback submitted successfully' });
  } catch (error: any) {
    console.error('[feedback] Submit error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

/**
 * GET /feedback/admin
 * Admin view of all feedback (Story 10)
 */
router.get('/admin', authenticate, authorize('admin'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDb();
    const feedbackCol = db.collection('feedback');

    const feedbackList = await feedbackCol.aggregate([
      {
        $lookup: {
          from: 'orders',
          localField: 'orderId',
          foreignField: '_id',
          as: 'order'
        }
      },
      { $unwind: { path: '$order', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'scrapChampId',
          foreignField: '_id',
          as: 'scrapChamp'
        }
      },
      { $unwind: { path: '$scrapChamp', preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } }
    ]).toArray();

    res.json(feedbackList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

export default router;
