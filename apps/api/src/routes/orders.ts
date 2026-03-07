import bcrypt from 'bcryptjs';
import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../config/db';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { smsService } from '../services/smsService';
import { emitAndLog } from '../services/socketService';

const router = Router();

/**
 * Broadcast order to all Scrap Champions in the same pincode.
 * Logic:
 *  1. Extract pincode from customer address
 *  2. Find all champs in that pincode
 *  3. Send SMS and Socket notifications to all of them
 *  4. Update order with the count of notified champs
 */
async function broadcastToChamps(orderId: string, customerAddress: string, retryCount: number = 0) {
  try {
    const db = getDb();
    const usersCol = db.collection('users');
    const ordersCol = db.collection('orders');

    // Extract pincode (last 6-digit number)
    const pincodeMatch = customerAddress.match(/(\d{6})/);
    const customerPincode = pincodeMatch ? pincodeMatch[1] : null;

    if (!customerPincode) {
      console.log(`[broadcast] No valid pincode found for order ${orderId}`);
      return;
    }

    console.log(`[broadcast] Broadcasting Order ${orderId} to pincode: ${customerPincode}`);

    // Get all champs whose serviceArea contains this pincode
    const matchingChamps = await usersCol.find({ 
      role: 'scrapChamp',
      serviceArea: { $regex: customerPincode }
    }).toArray();

    if (matchingChamps.length === 0) {
      console.log(`[broadcast] No champs matched pincode ${customerPincode}`);
      emitAndLog('admin_room', 'broadcast_failed', {
        orderId,
        message: `No Scrap Champions found in pincode ${customerPincode}.`,
        reason: 'no_matches'
      });
      return;
    }

    // Update the order with notified count
    await ordersCol.updateOne(
      { _id: new ObjectId(orderId) },
      { 
        $set: { 
          notifiedChampsCount: matchingChamps.length,
          updatedAt: new Date()
        } 
      }
    );

    // Notify each champ
    const notifyTasks = matchingChamps.map(async (champ) => {
      try {
        // SMS Notification
        const area = champ.serviceArea || 'Your Area';
        await smsService.sendAssignmentNotification(champ.mobileNumber, orderId, area);

        // Tracker Event
        await db.collection('smsEvents').insertOne({
          orderId: new ObjectId(orderId),
          userId: champ._id,
          mobileNumber: champ.mobileNumber,
          eventType: 'AutoAllocationAssigned', // Re-using type for legacy reasons
          status: 'Sent',
          meta: { method: 'broadcast', pincode: customerPincode },
          createdAt: new Date(),
        });

        // Real-time notification
        emitAndLog(`user_${champ._id}`, 'new_available_job', {
          orderId: orderId,
          message: 'A new pickup is available in your area! First to accept gets it. ♻️'
        });
      } catch (err) {
        console.error(`[broadcast] Failed to notify champ ${champ._id}:`, err);
      }
    });

    await Promise.all(notifyTasks);

    // Notify admin
    emitAndLog('admin_room', 'broadcast_success', {
      orderId,
      notifiedCount: matchingChamps.length,
      message: `Pickup broadcasted to ${matchingChamps.length} champions in pincode ${customerPincode}.`
    });

    const maxRetries = parseInt(process.env.BROADCAST_MAX_RETRIES || '3', 10);
    const timeoutMin = parseInt(process.env.BROADCAST_TIMEOUT_MINUTES || '10', 10);

    // Schedule re-broadcast check
    setTimeout(async () => {
      try {
        const freshDb = getDb();
        const currentOrder = await freshDb.collection('orders').findOne({ _id: new ObjectId(orderId) });
        
        if (currentOrder && currentOrder.status === 'Requested') {
          if (retryCount < maxRetries) {
            console.log(`[broadcast-timer] Order ${orderId} still requested. Retrying broadcast (Attempt ${retryCount + 1}/${maxRetries})...`);
            
            // Notify admin about the retry
            emitAndLog('admin_room', 'broadcast_retry', {
              orderId,
              message: `No champ accepted Order #${orderId.slice(-6).toUpperCase()} within ${timeoutMin}m. Re-sending broadcast (Attempt ${retryCount + 1}/${maxRetries}).`
            });
            
            await broadcastToChamps(orderId, customerAddress, retryCount + 1);
          } else {
            console.log(`[broadcast-timer] Order ${orderId} reached max retries (${maxRetries}).`);
            // Notify admin of ultimate failure
            emitAndLog('admin_room', 'broadcast_exhausted', {
              orderId,
              message: `🚨 Critical: Order #${orderId.slice(-6).toUpperCase()} has reached max broadcast retries (${maxRetries}). Manual intervention required!`
            });
            
            // Optionally update order status to indicate it needs manual help
            await freshDb.collection('orders').updateOne(
              { _id: new ObjectId(orderId) },
              { $set: { adminNotifiedOfDelay: true, updatedAt: new Date() } }
            );
          }
        } else {
           console.log(`[broadcast-timer] Order ${orderId} is no longer Requested (status: ${currentOrder?.status}). Stopping timer.`);
        }
      } catch (err) {
        console.error('[broadcast-timer] Check failed:', err);
      }
    }, timeoutMin * 60 * 1000);

  } catch (error) {
    console.error('[broadcast] Fatal error:', error);
  }
}

// --- CUSTOMER ENDPOINTS ---

/**
 * POST /orders
 * Create a new pickup request (Story 2)
 */
router.post('/', authenticate, authorize('customer'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      scrapTypes, 
      estimatedWeight, 
      photoUrl, 
      scheduledAt, 
      generalArea, 
      exactAddress,
      location,
      timeSlot
    } = req.body;

    if (!scrapTypes || !scheduledAt || !exactAddress) {
      res.status(400).json({ error: 'Missing required fields: scrapTypes, scheduledAt, exactAddress' });
      return;
    }

    const db = getDb();
    const ordersCol = db.collection('orders');

    const newOrder = {
      customerId: new ObjectId(req.user!.userId),
      scrapTypes: Array.isArray(scrapTypes) ? scrapTypes : [scrapTypes],
      estimatedWeight: estimatedWeight || {},
      photoUrl: photoUrl || null,
      scheduledAt: new Date(scheduledAt),
      timeSlot: timeSlot || 'any',
      scheduledSlotDuration: 1,
      generalArea: generalArea || exactAddress.split(',').slice(-2).join(',').trim(),
      exactAddress,
      location: location || null,
      assignedScrapChampId: null,
      declinedChampIds: [],
      notifiedChampsCount: 0,
      viewCount: 0,
      adminNotifiedOfDelay: false,
      status: 'Requested',
      problemNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await ordersCol.insertOne(newOrder);

    // Emit real-time notification to all admins
    try {
      console.log(`[socket] Emitting 'new_pickup_request' for order ${result.insertedId} to admin_room`);
      emitAndLog('admin_room', 'new_pickup_request', {
        orderId: result.insertedId,
        message: 'A new pickup request has been scheduled!',
        area: generalArea
      });
    } catch (e) {
      console.error('[socket] Failed to emit new_pickup_request', e);
    }

    // Broadcast to all champs in the customer's area
    const usersCol = db.collection('users');
    const customer = await usersCol.findOne({ _id: new ObjectId(req.user!.userId) });
    const addressForMatching = customer?.pickupAddress || exactAddress;
    broadcastToChamps(result.insertedId.toString(), addressForMatching).catch(err => {
      console.error('[broadcast] Background failure:', err);
    });

    res.status(201).json({
      message: 'Order created successfully',
      orderId: result.insertedId,
      status: 'Requested',
    });
  } catch (error: any) {
    console.error('[orders] Create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /orders/history
 * View pickup history for the customer (Story 4)
 */
router.get('/history', authenticate, authorize('customer'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDb();
    const ordersCol = db.collection('orders');

    const orders = await ordersCol.aggregate([
      { $match: { customerId: new ObjectId(req.user!.userId), status: { $ne: 'Cancelled' } } },
      {
        $lookup: {
          from: 'feedback',
          localField: '_id',
          foreignField: 'orderId',
          as: 'feedback'
        }
      },
      {
        $addFields: {
          hasFeedback: { $gt: [{ $size: '$feedback' }, 0] }
        }
      },
      { $project: { feedback: 0 } },
      { $sort: { updatedAt: -1 } }
    ]).toArray();

    res.json(orders);
  } catch (error) {
    console.error('[orders] History error:', error);
    res.status(500).json({ error: 'Failed to fetch order history' });
  }
});

/**
 * GET /orders/customer/stats
 * Get summary stats for customer dashboard
 */
router.get('/customer/stats', authenticate, authorize('customer'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDb();
    const ordersCol = db.collection('orders');
    const feedbackCol = db.collection('feedback');
    const customerId = new ObjectId(req.user!.userId);

    const [total, pending, completed, feedback] = await Promise.all([
      ordersCol.countDocuments({ customerId }),
      ordersCol.countDocuments({ customerId, status: { $in: ['Requested', 'Assigned', 'Accepted'] } }),
      ordersCol.countDocuments({ customerId, status: 'Completed' }),
      feedbackCol.find({ customerId }).project({ rating: 1 }).toArray()
    ]);

    const avgRating = feedback.length > 0
      ? (feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length).toFixed(1)
      : '--';

    res.json({ total, pending, completed, avgRating });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer stats' });
  }
});

// --- ADMIN ENDPOINTS ---

/**
 * GET /admin/orders
 * View all orders
 */
router.get('/admin', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, startDate, endDate } = req.query;
    const db = getDb();
    const ordersCol = db.collection('orders');

    // Build query
    const query: any = {};
    if (status && status !== 'All') {
      query.status = status;
    }

    if (startDate || endDate) {
      query.scheduledAt = {};
      if (startDate) {
        query.scheduledAt.$gte = new Date(startDate as string).toISOString();
      }
      if (endDate) {
        // End of the selected day
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        query.scheduledAt.$lte = end.toISOString();
      }
    }

    // Performance note: The $lookup is expensive on large datasets. 
    // Pagination should be added if the history grows very large.
    const orders = await ordersCol
      .aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'users',
            localField: 'customerId',
            foreignField: '_id',
            as: 'customerDetails',
          }
        },
        { $unwind: { path: '$customerDetails', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'assignedScrapChampId',
            foreignField: '_id',
            as: 'champDetails',
          }
        },
        { $unwind: { path: '$champDetails', preserveNullAndEmptyArrays: true } }
      ])
      .sort({ updatedAt: -1 })
      .toArray();

    // Mask image for cancelled orders if needed
    const filteredOrders = orders.map(o => {
      if (o.status === 'Cancelled') {
        return { ...o, photoUrl: null, maskReason: 'Customer cancelled pickup' };
      }
      return o;
    });

    res.json(filteredOrders);
  } catch (error) {
    console.error('[admin-orders] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch admin orders' });
  }
});

/**
 * GET /admin/stats
 * Overview stats for admin dashboard
 */
router.get('/admin/stats', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDb();
    const ordersCol = db.collection('orders');
    const usersCol = db.collection('users');

    const [total, pending, active, completed, champs] = await Promise.all([
      ordersCol.countDocuments({}),
      ordersCol.countDocuments({ status: 'Requested' }),
      ordersCol.countDocuments({ status: { $in: ['Assigned', 'Accepted'] } }),
      ordersCol.countDocuments({ status: 'Completed' }),
      usersCol.countDocuments({ role: 'scrapChamp' })
    ]);

    // Get recent activity (last 5 orders)
    const recentActivity = await ordersCol.aggregate([
      { $sort: { updatedAt: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } }
    ]).toArray();

    res.json({ 
      total, 
      pending, 
      active, 
      completed, 
      champs,
      recentActivity 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

/**
 * GET /admin/scrap-champs
 * List all scrap champions
 */
router.get('/admin/scrap-champs', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDb();
    const usersCol = db.collection('users');

    const champs = await usersCol
      .find({ role: 'scrapChamp' })
      .project({ name: 1, mobileNumber: 1, serviceArea: 1, createdAt: 1, email: 1, serviceRadiusKm: 1 })
      .toArray();

    res.json(champs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scrap champions' });
  }
});

/**
 * GET /admin/scrap-champs/:champId
 * Get single champ details
 */
router.get('/admin/scrap-champs/:champId', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { champId } = req.params;
    if (!ObjectId.isValid(champId)) {
      res.status(400).json({ error: 'Invalid Champion ID' });
      return;
    }

    const db = getDb();
    const champ = await db.collection('users').findOne({ _id: new ObjectId(champId), role: 'scrapChamp' });
    
    if (!champ) {
      res.status(404).json({ error: 'Scrap Champion not found' });
      return;
    }

    res.json(champ);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch champion details' });
  }
});

/**
 * PATCH /admin/scrap-champs/:champId
 * Update champ details
 */
router.patch('/admin/scrap-champs/:champId', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { champId } = req.params;
    const { name, email, mobileNumber, serviceArea, serviceRadiusKm, password } = req.body;

    if (!ObjectId.isValid(champId)) {
      res.status(400).json({ error: 'Invalid Champion ID' });
      return;
    }

    const db = getDb();
    const usersCol = db.collection('users');

    const updateDoc: any = { updatedAt: new Date() };
    if (name) updateDoc.name = name;
    if (email) updateDoc.email = email;
    if (mobileNumber) updateDoc.mobileNumber = mobileNumber;
    if (serviceArea) updateDoc.serviceArea = serviceArea;
    if (serviceRadiusKm !== undefined) updateDoc.serviceRadiusKm = Number(serviceRadiusKm);

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateDoc.passwordHash = await bcrypt.hash(password, salt);
    }

    const result = await usersCol.updateOne(
      { _id: new ObjectId(champId), role: 'scrapChamp' },
      { $set: updateDoc }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ error: 'Scrap Champion not found' });
      return;
    }

    res.json({ message: 'Champion updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update champion' });
  }
});

/**
 * GET /orders/admin/:orderId
 * Get detailed order info for admin
 */
router.get('/admin/:orderId', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    
    // Validate ObjectId format
    if (!ObjectId.isValid(orderId)) {
      res.status(400).json({ error: 'Invalid Order ID format' });
      return;
    }

    const db = getDb();
    const ordersCol = db.collection('orders');

    const order = await ordersCol.aggregate([
      { $match: { _id: new ObjectId(orderId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customerDetails',
        }
      },
      { $unwind: { path: '$customerDetails', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedScrapChampId',
          foreignField: '_id',
          as: 'champDetails',
        }
      },
      { $unwind: { path: '$champDetails', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'feedback',
          localField: '_id',
          foreignField: 'orderId',
          as: 'feedback',
        }
      },
      { $unwind: { path: '$feedback', preserveNullAndEmptyArrays: true } }
    ]).next();

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.status === 'Cancelled') {
      order.photoUrl = null;
      order.maskReason = 'Customer cancelled pickup';
    }

    res.json(order);
  } catch (error) {
    console.error('[orders] Admin detail error:', error);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});


/**
 * POST /admin/orders/:orderId/assign
 * Assign a Scrap Champ to an order (Story 8)
 */
router.post('/admin/:orderId/assign', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { scrapChampId } = req.body;

    const db = getDb();
    const ordersCol = db.collection('orders');

    // Case: Unassign
    if (!scrapChampId) {
      await ordersCol.updateOne(
        { _id: new ObjectId(orderId) },
        { 
          $set: { 
            assignedScrapChampId: null,
            status: 'Requested',
            updatedAt: new Date()
          } 
        }
      );
      res.json({ message: 'Assignment cleared' });
      return;
    }

    const usersCol = db.collection('users');
    const champ = await usersCol.findOne({ _id: new ObjectId(scrapChampId), role: 'scrapChamp' });

    if (!champ) {
      res.status(404).json({ error: 'Scrap Champion not found' });
      return;
    }

    const result = await ordersCol.updateOne(
      { _id: new ObjectId(orderId) },
      { 
        $set: { 
          assignedScrapChampId: new ObjectId(scrapChampId),
          status: 'Assigned',
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Story 8: Trigger SMS to Champ with decision link
    const area = champ.serviceArea || 'Your Area';
    await smsService.sendAssignmentNotification(champ.mobileNumber, orderId, area);

    // Track SMS Event
    await db.collection('smsEvents').insertOne({
      orderId: new ObjectId(orderId),
      userId: new ObjectId(scrapChampId),
      mobileNumber: champ.mobileNumber,
      eventType: 'AllocationAssigned',
      status: 'Sent',
      meta: { area },
      createdAt: new Date(),
    });

    // Emit real-time notification to the specific Champ
    try {
      console.log(`[socket] Emitting 'new_job_assigned' for order ${orderId} to user_${scrapChampId}`);
      emitAndLog(`user_${scrapChampId}`, 'new_job_assigned', {
        orderId: orderId,
        message: 'You have been assigned a new pickup!'
      });
    } catch (e) {
      console.error('[socket] Failed to emit new_job_assigned', e);
    }

    res.json({ message: 'Order assigned and SMS sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign order' });
  }
});

// --- SCRAP CHAMP ENDPOINTS ---

/**
 * GET /scrap-champ/available-jobs
 * View unassigned pickups in the champion's service area (Pincode match)
 */
router.get('/scrap-champ/available-jobs', authenticate, authorize('scrapChamp'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDb();
    const usersCol = db.collection('users');
    const ordersCol = db.collection('orders');

    const champ = await usersCol.findOne({ _id: new ObjectId(req.user!.userId) });
    if (!champ) return res.status(404).json({ error: 'Champion not found' });

    const pincodeMatch = (champ.serviceArea || '').match(/(\d{6})/);
    const champPincode = pincodeMatch ? pincodeMatch[1] : null;

    if (!champPincode) {
      res.json([]);
      return;
    }

    // Find orders in the same pincode that haven't been claimed and weren't declined by this champ
    const jobs = await ordersCol
      .find({
        assignedScrapChampId: null,
        status: 'Requested',
        declinedChampIds: { $ne: new ObjectId(req.user!.userId) },
        $or: [
          { exactAddress: { $regex: champPincode } },
          { generalArea: { $regex: champPincode } }
        ]
      })
      .sort({ scheduledAt: 1 })
      .toArray();

    return res.json(jobs);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch available jobs' });
  }
});

/**
 * GET /scrap-champ/stats
 * Summary counts for champion notifications
 */
router.get('/scrap-champ/stats', authenticate, authorize('scrapChamp'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDb();
    const ordersCol = db.collection('orders');
    const usersCol = db.collection('users');
    const champId = new ObjectId(req.user!.userId);

    const champ = await usersCol.findOne({ _id: champId });
    const pincodeMatch = (champ?.serviceArea || '').match(/(\d{6})/);
    const champPincode = pincodeMatch ? pincodeMatch[1] : null;

    const [myJobsCount, availableJobsCount] = await Promise.all([
      ordersCol.countDocuments({ 
        assignedScrapChampId: champId,
        status: { $in: ['Assigned', 'Accepted'] }
      }),
      champPincode ? ordersCol.countDocuments({
        assignedScrapChampId: null,
        status: 'Requested',
        declinedChampIds: { $ne: champId },
        $or: [
          { exactAddress: { $regex: champPincode } },
          { generalArea: { $regex: champPincode } }
        ]
      }) : Promise.resolve(0)
    ]);

    res.json({ 
      myJobs: myJobsCount, 
      availableJobs: availableJobsCount, 
      total: myJobsCount + availableJobsCount 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch champion stats' });
  }
});

/**
 * POST /scrap-champ/:orderId/decline
 * Champion passes on a broadcasted pickup
 */
router.post('/scrap-champ/:orderId/decline', authenticate, authorize('scrapChamp'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const db = getDb();
    const ordersCol = db.collection('orders');

    await ordersCol.updateOne(
      { _id: new ObjectId(orderId) },
      { $addToSet: { declinedChampIds: new ObjectId(req.user!.userId) } }
    );

    // Notify admin
    emitAndLog('admin_room', 'order_declined', {
      orderId,
      champId: req.user!.userId,
      message: 'A champion declined a broadcasted job.'
    });

    res.json({ success: true, message: 'Job declined successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to decline job' });
  }
});

/**
 * GET /scrap-champ/my-jobs
 * View active assignments and accepted pickups (Excludes completed tasks)
 */
router.get('/scrap-champ/my-jobs', authenticate, authorize('scrapChamp'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDb();
    const ordersCol = db.collection('orders');

    const jobs = await ordersCol
      .find({ 
        assignedScrapChampId: new ObjectId(req.user!.userId),
        status: { $in: ['Assigned', 'Accepted'] }
      })
      .sort({ scheduledAt: 1 })
      .toArray();

    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

/**
 * GET /scrap-champ/history
 * View all past jobs: Completed, Accepted, or even those they were once assigned to
 */
router.get('/scrap-champ/history', authenticate, authorize('scrapChamp'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log(`[history] Fetching history for champ: ${req.user!.userId}`);
    const db = getDb();
    const ordersCol = db.collection('orders');

    // Aggregate to get customer info and feedback for rating
    const history = await ordersCol.aggregate([
      { 
        $match: { 
          assignedScrapChampId: new ObjectId(req.user!.userId),
          status: { $in: ['Accepted', 'Completed', 'Problem'] } 
        } 
      },
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
          from: 'feedback',
          localField: '_id',
          foreignField: 'orderId',
          as: 'feedback'
        }
      },
      { $unwind: { path: '$feedback', preserveNullAndEmptyArrays: true } },
      { $sort: { updatedAt: -1 } }
    ]).toArray();

    console.log(`[history] Found ${history.length} jobs for champ: ${req.user!.userId}`);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch job history' });
  }
});

/**
 * GET /scrap-champ/orders/:orderId
 */
router.get('/scrap-champ/:orderId', authenticate, authorize('scrapChamp'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const db = getDb();
    const ordersCol = db.collection('orders');

    const order = await ordersCol.findOne({ _id: new ObjectId(orderId) });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // TRACKING: Increment view/click count for the order
    await ordersCol.updateOne(
      { _id: new ObjectId(orderId) },
      { 
        $inc: { viewCount: 1 },
        $set: { lastViewedAt: new Date() }
      }
    );

    // SECURITY CHECK: allow if assigned OR if it's an available job in the champ's pincode
    const isAssigned = order.assignedScrapChampId?.toString() === req.user!.userId;
    const isAvailable = order.status === 'Requested' && !order.assignedScrapChampId;

    if (!isAssigned) {
      if (!isAvailable) {
        res.status(410).json({ 
          error: 'This order has already been accepted.',
          message: "This order has already been accepted. We'll send you the next one!"
        });
        return;
      }
      
      // Verify pincode match for available jobs to prevent "peeking" across regions
      const champ = await db.collection('users').findOne({ _id: new ObjectId(req.user!.userId) });
      const pincodeMatch = (champ?.serviceArea || '').match(/(\d{6})/);
      const champPincode = pincodeMatch ? pincodeMatch[1] : null;

      if (!champPincode || !(order.exactAddress?.includes(champPincode) || order.generalArea?.includes(champPincode))) {
        res.status(403).json({ error: 'Unauthorized: This pickup is outside your service area' });
        return;
      }
    }

    const filteredOrder = { ...order };
    if (order.status !== 'Accepted' && order.status !== 'Completed') {
      delete (filteredOrder as any).exactAddress;
      (filteredOrder as any).isAddressHidden = true;
    }

    res.json(filteredOrder);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

/**
 * POST /scrap-champ/orders/:orderId/complete
 * Mark an order as completed after pickup
 */
router.post('/scrap-champ/:orderId/complete', authenticate, authorize('scrapChamp'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const db = getDb();
    const ordersCol = db.collection('orders');

    const order = await ordersCol.findOne({ _id: new ObjectId(orderId) });
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.assignedScrapChampId?.toString() !== req.user!.userId) {
      res.status(403).json({ error: 'Unauthorized assignment' });
      return;
    }

    if (order.status !== 'Accepted') {
      res.status(400).json({ error: 'Only accepted orders can be marked as completed' });
      return;
    }

    await ordersCol.updateOne(
      { _id: new ObjectId(orderId) },
      { $set: { status: 'Completed', updatedAt: new Date() } }
    );

    // Story 6 & 10: Trigger feedback SMS after delay
    const usersCol = db.collection('users');
    const customer = await usersCol.findOne({ _id: order.customerId });

    console.log(`[Feedback] Order ${orderId} marked as completed. Customer: ${customer?.mobileNumber}`);

    if (customer?.mobileNumber) {
      const delayMinutes = parseInt(process.env.FEEDBACK_DELAY_MINUTES || '120');
      console.log(`[Feedback] Scheduling SMS for ${customer.mobileNumber} in ${delayMinutes} minutes.`);
      
      setTimeout(async () => {
        try {
          console.log(`[Feedback Timer] Timer expired for order ${orderId}. Sending SMS to ${customer.mobileNumber}`);
          await smsService.sendFeedbackRequest(customer.mobileNumber, orderId);
        } catch (err) {
          console.error('[Feedback] Failed to send feedback SMS:', err);
        }
      }, delayMinutes * 60 * 1000);
    }

    // Emit real-time notification to admin
    try {
      console.log(`[socket] Emitting 'order_completed' for order ${orderId} to admin_room`);
      emitAndLog('admin_room', 'order_completed', {
        orderId: orderId,
        message: 'A pickup task has been completed by the Scrap Champ.',
        status: 'Completed'
      });
    } catch (e) {
      console.error('[socket] Failed to emit order_completed', e);
    }

    // Emit real-time notification to customer
    try {
      console.log(`[socket] Emitting 'order_completed_customer' for order ${orderId} to user_${order.customerId}`);
      emitAndLog(`user_${order.customerId}`, 'order_completed_customer', {
        orderId: orderId,
        message: 'Your pickup has been completed! Thank you for recycling. ♻️',
        status: 'Completed'
      });
    } catch (e) {
      console.error('[socket] Failed to emit order_completed_customer', e);
    }

    res.json({ message: `Order marked as completed. Feedback SMS scheduled in ${process.env.FEEDBACK_DELAY_MINUTES || 120} mins.`, status: 'Completed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete order' });
  }
});

/**
 * POST /scrap-champ/orders/:orderId/decision
 */
router.post('/scrap-champ/:orderId/decision', authenticate, authorize('scrapChamp'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { decision } = req.body;

    if (!['accept', 'deny'].includes(decision)) {
      res.status(400).json({ error: "Decision must be 'accept' or 'deny'" });
      return;
    }

    const db = getDb();
    const ordersCol = db.collection('orders');

    const order = await ordersCol.findOne({ _id: new ObjectId(orderId) });
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Security: If specific champ is assigned, only they can respond. 
    // If it's a broadcast (Requested), any champ can respond (logic below handles first-come-first-served).
    if (order.status === 'Assigned' && order.assignedScrapChampId?.toString() !== req.user!.userId) {
      res.status(403).json({ error: 'Unauthorized assignment' });
      return;
    }

    if (order.status === 'Requested') {
      // In theory, we could check pincode here for extra security
      const usersCol = db.collection('users');
      const champ = await usersCol.findOne({ _id: new ObjectId(req.user!.userId) });
      const pincodeMatch = (champ?.serviceArea || '').match(/(\d{6})/);
      const champPincode = pincodeMatch ? pincodeMatch[1] : null;
      
      const orderPincodeMatch = (order.exactAddress || '').match(/(\d{6})/) || (order.generalArea || '').match(/(\d{6})/);
      const orderPincode = orderPincodeMatch ? orderPincodeMatch[1] : null;

      if (orderPincode && champPincode && orderPincode !== champPincode) {
        res.status(403).json({ error: 'This pickup is outside your service area.' });
        return;
      }
    }

    const now = new Date();
    if (decision === 'accept') {
      // Atomic update: only the first champ to hit this gains the assignment
      const result = await ordersCol.updateOne(
        { 
          _id: new ObjectId(orderId), 
          $or: [
            { assignedScrapChampId: null },
            { assignedScrapChampId: new ObjectId(req.user!.userId) }
          ],
          status: { $in: ['Requested', 'Assigned'] } 
        },
        { 
          $set: { 
            status: 'Accepted', 
            assignedScrapChampId: new ObjectId(req.user!.userId),
            updatedAt: now 
          } 
        }
      );

      if (result.modifiedCount === 0) {
        res.status(400).json({ error: 'Sorry, this pickup has already been accepted by another champion.' });
        return;
      }

      // Story 14: Notify customer
      const usersCol = db.collection('users');
      const [customer, champ] = await Promise.all([
        usersCol.findOne({ _id: order.customerId }),
        usersCol.findOne({ _id: new ObjectId(req.user!.userId) })
      ]);

      if (customer?.mobileNumber && champ) {
        await smsService.sendAcceptanceNotificationToCustomer(
          customer.mobileNumber, 
          champ.name, 
          orderId, 
          new Date(order.scheduledAt)
        );
        
        // Track event
        await db.collection('smsEvents').insertOne({
          orderId: new ObjectId(orderId),
          userId: customer._id,
          mobileNumber: customer.mobileNumber,
          eventType: 'CustomerConfirmation',
          status: 'Sent',
          createdAt: new Date(),
        });

        // Emit real-time notification to admin
        try {
          console.log(`[socket] Emitting 'order_accepted' for order ${orderId} to admin_room`);
          emitAndLog('admin_room', 'order_accepted', {
            orderId: orderId,
            message: `Scrap Champ ${champ.name} has accepted the pickup.`,
            status: 'Accepted'
          });
        } catch (e) {
          console.error('[socket] Failed to emit order_accepted', e);
        }

        // Emit real-time notification to ALL OTHER CHAMPS
        try {
           console.log(`[socket] Emitting 'order_accepted_by_other' for order ${orderId} to champ_room`);
           emitAndLog('champ_room', 'order_accepted_by_other', {
             orderId: orderId,
             champName: champ.name,
             acceptedByUserId: req.user!.userId
           });
        } catch (e) {
           console.error('[socket] Failed to emit order_accepted_by_other', e);
        }

        // Emit real-time notification to customer
        try {
          console.log(`[socket] Emitting 'order_accepted_customer' for order ${orderId} to user_${order.customerId}`);
          emitAndLog(`user_${order.customerId}`, 'order_accepted_customer', {
            orderId: orderId,
            message: `Your pickup has been accepted by ${champ.name}! They will arrive at the scheduled time.`,
            champName: champ.name,
            status: 'Accepted'
          });
        } catch (e) {
          console.error('[socket] Failed to emit order_accepted_customer', e);
        }
      }

      res.json({ message: 'Order accepted', status: 'Accepted' });
    } else {
      // Track this champ as having declined
      // The order status remains 'Requested' so other champs can still see and accept it.
      // We only update the declinedChampIds and updatedAt.
      await ordersCol.updateOne(
        { _id: new ObjectId(orderId) },
        { 
          $set: { updatedAt: now },
          $addToSet: { declinedChampIds: new ObjectId(req.user!.userId) }
        }
      );

      // NO AUTO-CASCADE: In a broadcast model, the order stays available for others.
      // We just log that this specific champ declined it.

      res.json({ message: 'Order declined', status: 'Requested' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to process decision' });
  }
});

// --- GENERIC PARAMETERIZED ROUTES (Put at the end to avoid hijacking) ---

/**
 * DELETE /orders/:orderId
 * Delete an order (Before acceptance)
 */
router.delete('/:orderId', authenticate, authorize('customer'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.userId;
    console.log(`[orders] DELETE /orders/${orderId} | User: ${userId} | Role: ${req.user?.role}`);

    if (!userId) {
      console.error('[orders] No user ID in request - authentication might have failed incorrectly');
      res.status(401).json({ error: 'User not authenticated or missing ID' });
      return;
    }

    if (!ObjectId.isValid(orderId)) {
      console.warn(`[orders] Invalid Order ID format: ${orderId}`);
      res.status(400).json({ error: 'Invalid Order ID format' });
      return;
    }

    const db = getDb();
    const ordersCol = db.collection('orders');

    const order = (await ordersCol.findOne({ _id: new ObjectId(orderId) })) as any;

    if (!order) {
      console.warn(`[orders] Order not found: ${orderId}`);
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    console.log(`[orders] Found order ${orderId}, status: ${order.status}, customerId: ${order.customerId}`);

    if (order.customerId.toString() !== userId) {
      console.warn(`[orders] Unauthorized cancel attempt by ${userId} for order owned by ${order.customerId}`);
      res.status(403).json({ error: 'Unauthorized to cancel this order' });
      return;
    }

    if (['Accepted', 'Completed'].includes(order.status)) {
      res.status(400).json({ error: 'Cannot cancel order after it has been accepted' });
      return;
    }

    const result = await ordersCol.updateOne(
      { _id: new ObjectId(orderId) },
      { $set: { status: 'Cancelled', updatedAt: new Date() } }
    );

    console.log(`[orders] Cancel update result: matched=${result.matchedCount}, modified=${result.modifiedCount}`);

    // Emit real-time cancellation notification to all admins
    try {
      console.log(`[socket] Emitting 'pickup_cancelled' for order ${orderId} to admin_room`);
      emitAndLog('admin_room', 'pickup_cancelled', {
        orderId: orderId,
        message: 'A pickup request was just cancelled by the customer.',
        area: order.generalArea
      });
    } catch (e: any) {
      console.error('[socket] Failed to emit pickup_cancelled', e.message);
    }

    console.log(`[orders] Sending success response for order ${orderId}`);
    res.json({ message: 'Order cancelled successfully' });
  } catch (error: any) {
    console.error('[orders] Cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

/**
 * GET /orders/:orderId
 * Get single order details for the customer
 */
router.get('/:orderId', authenticate, authorize('customer'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const db = getDb();
    const ordersCol = db.collection('orders');

    const order = await ordersCol.aggregate([
      { $match: { _id: new ObjectId(orderId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedScrapChampId',
          foreignField: '_id',
          as: 'champDetails'
        }
      },
      { $unwind: { path: '$champDetails', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'feedback',
          localField: '_id',
          foreignField: 'orderId',
          as: 'feedback'
        }
      },
      {
        $addFields: {
          hasFeedback: { $gt: [{ $size: '$feedback' }, 0] },
          champDetails: {
            $cond: {
              if: { $and: [{ $gt: ["$champDetails", null] }, { $in: ["$status", ["Accepted", "Completed"]] }] },
              then: {
                name: "$champDetails.name",
                mobileNumber: "$champDetails.mobileNumber"
              },
              else: "$$REMOVE"
            }
          }
        }
      },
      { $project: { feedback: 0 } }
    ]).next();

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.customerId.toString() !== req.user!.userId) {
      res.status(403).json({ error: 'Unauthorized to view this order' });
      return;
    }

    res.json(order);
  } catch (error) {
    console.error('[orders] Detail error:', error);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

export default router;
