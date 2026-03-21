import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { notificationService } from '../services/notificationService';

const router = Router();

// Get all notifications for the authenticated user
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId;
    const notifications = await notificationService.getForUser(userId);
    res.json(notifications);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark a single notification as read
router.patch('/:id/read', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { id } = req.params;
    const userId = req.user.userId;
    await notificationService.markAsRead(id, userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.patch('/read-all', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId;
    await notificationService.markAllAsRead(userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Clear all notifications
router.delete('/clear-all', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId;
    await notificationService.clearAll(userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

export default router;
