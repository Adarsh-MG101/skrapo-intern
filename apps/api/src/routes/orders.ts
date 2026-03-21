import bcrypt from 'bcryptjs';
import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../config/db';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { smsService } from '../services/smsService';
import { emitAndLog } from '../services/socketService';
import { notificationService } from '../services/notificationService';

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

    // Get all Active champs whose serviceArea contains this pincode
    const matchingChamps = await usersCol.find({ 
      role: 'scrapChamp',
      serviceArea: { $regex: customerPincode },
      isActive: { $ne: false } // Exclude deactivated champs
    }).toArray();

    if (matchingChamps.length === 0) {
      console.log(`[broadcast] No champs matched pincode ${customerPincode}`);
      notificationService.notifyAdmins(
        'Broadcast Failed', 
        `No Scrap Champions found in pincode ${customerPincode}.`,
        'broadcast_failed',
        { orderId, reason: 'no_matches' }
      );
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
        notificationService.notifyUser(
          champ._id.toString(),
          'New Scrapo Job Available! ♻️',
          'A new pickup is available in your area! First to accept gets it.',
          'new_available_job',
          { orderId }
        );
      } catch (err) {
        console.error(`[broadcast] Failed to notify champ ${champ._id}:`, err);
      }
    });

    await Promise.all(notifyTasks);

    // Notify admin
    notificationService.notifyAdmins(
      'Broadcast Success',
      `Pickup broadcasted to ${matchingChamps.length} champions in pincode ${customerPincode}.`,
      'broadcast_success',
      { orderId, notifiedCount: matchingChamps.length }
    );

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
            console.log(`[broadcast-timer] Order ${orderId} reached max retries (${maxRetries}). Expiring...`);
            
            // Mark as Expired
            await freshDb.collection('orders').updateOne(
              { _id: new ObjectId(orderId) },
              { $set: { status: 'Expired', adminNotifiedOfDelay: true, updatedAt: new Date() } }
            );

            // Notify admin
            emitAndLog('admin_room', 'broadcast_exhausted', {
              orderId,
              message: `🚨 Order #${orderId.slice(-6).toUpperCase()} expired. No champ accepted within 30m.`
            });

            // Notify customer
            if (currentOrder.customerId) {
              notificationService.notifyUser(
                currentOrder.customerId.toString(),
                'Pickup Status Update ♻️',
                'Sorry, Scrap Champions are unavailable at the moment. Please try again later!',
                'order_expired',
                { orderId, status: 'Expired' }
              );
            }
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
      await notificationService.notifyAdmins(
        'New Pickup Request! ♻️',
        `A new pickup has even scheduled in ${generalArea}`,
        'new_pickup_request',
        { orderId: result.insertedId, area: generalArea }
      );
    } catch (e) {
      console.error('[socket] Failed to emit new_pickup_request', e);
    }

    try {
      await notificationService.notifyUser(
        req.user!.userId,
        'Pickup Scheduled 🎉',
        `Your scrap pickup has been confirmed! We will notify you once a Scrap Champion is assigned.`,
        'pickup_scheduled',
        { orderId: result.insertedId, status: 'Requested' }
      );
    } catch (e) {
      console.error('[socket] Failed to notify customer of creation', e);
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

    const now = new Date();
    const processedOrders = orders.map(order => {
      // Check if order is Requested but older than 30 mins
      if (order.status === 'Requested') {
        const createdAt = new Date(order.createdAt);
        const diffMs = now.getTime() - createdAt.getTime();
        const diffMins = diffMs / (1000 * 60);
        
        if (diffMins >= 30) {
          return { ...order, status: 'Expired' };
        }
      }
      return order;
    });

    res.json(processedOrders);
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
      if (status === 'Expired') {
        query.status = 'Expired';
      } else {
        query.status = status;
      }
    }
    // Note: 'Requested' status is now filtered correctly at the frontend level
    // between Allocation Center and History pages.

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

    // Fetch active champs to dynamically recount
    const activeChamps = await db.collection('users').find({ role: 'scrapChamp', isActive: { $ne: false } }).project({ _id: 1, serviceArea: 1 }).toArray();

    // Mask image for cancelled orders if needed and recalculate engagement
    const filteredOrders = orders.map(o => {
      o = { ...o };
      if (o.status === 'Cancelled') {
        o.photoUrl = null;
        o.maskReason = 'Customer cancelled pickup';
      }
      
      const pincodeMatch = (o.exactAddress || '').match(/(\d{6})/);
      const orderPincode = pincodeMatch ? pincodeMatch[1] : null;
      
      if (orderPincode) {
         o.notifiedChampsCount = activeChamps.filter(c => c.serviceArea?.includes(orderPincode)).length;
      } else {
         o.notifiedChampsCount = 0;
      }

      if (o.declinedChampIds && Array.isArray(o.declinedChampIds)) {
         o.declinedChampIds = o.declinedChampIds.filter((id: any) => 
            activeChamps.some(c => c._id.toString() === id.toString())
         );
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

    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

    const [total, requested, active, completed, champs] = await Promise.all([
      ordersCol.countDocuments({}),
      ordersCol.countDocuments({ 
        status: 'Requested',
        createdAt: { $gt: thirtyMinsAgo }
      }),
      ordersCol.countDocuments({ status: { $in: ['Assigned', 'Accepted', 'Arrived', 'Picking'] } }),
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
      pending: requested, 
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
      .project({ 
        name: 1, mobileNumber: 1, serviceArea: 1, createdAt: 1, email: 1, serviceRadiusKm: 1, 
        profilePhoto: 1, panNumber: 1, aadharNumber: 1, gstNumber: 1, cardNumber: 1
      })
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
    const { 
      name, email, mobileNumber, serviceArea, serviceRadiusKm, password,
      panNumber, panCardPic, aadharNumber, aadharCardPic, gstNumber, gstCardPic, profilePhoto, cardNumber
    } = req.body;

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

    // Identity & Docs
    if (panNumber !== undefined) updateDoc.panNumber = panNumber;
    if (panCardPic !== undefined) updateDoc.panCardPic = panCardPic;
    if (aadharNumber !== undefined) updateDoc.aadharNumber = aadharNumber;
    if (aadharCardPic !== undefined) updateDoc.aadharCardPic = aadharCardPic;
    if (gstNumber !== undefined) updateDoc.gstNumber = gstNumber;
    if (gstCardPic !== undefined) updateDoc.gstCardPic = gstCardPic;
    if (profilePhoto !== undefined) updateDoc.profilePhoto = profilePhoto;
    if (cardNumber !== undefined) updateDoc.cardNumber = cardNumber;

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
 * POST /admin/scrap-champs/:champId/deactivate
 * Deactivate a scrap champion
 */
router.post('/admin/scrap-champs/:champId/deactivate', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { champId } = req.params;
    if (!ObjectId.isValid(champId)) {
      res.status(400).json({ error: 'Invalid Champion ID' });
      return;
    }

    const db = getDb();
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(champId), role: 'scrapChamp' },
      { $set: { isActive: false, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ error: 'Scrap Champion not found' });
      return;
    }

    res.json({ message: 'Champion deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate champion' });
  }
});

/**
 * POST /admin/scrap-champs/:champId/activate
 * Reactivate a scrap champion
 */
router.post('/admin/scrap-champs/:champId/activate', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { champId } = req.params;
    if (!ObjectId.isValid(champId)) {
      res.status(400).json({ error: 'Invalid Champion ID' });
      return;
    }

    const db = getDb();
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(champId), role: 'scrapChamp' },
      { $set: { isActive: true, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ error: 'Scrap Champion not found' });
      return;
    }

    res.json({ message: 'Champion activated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to activate champion' });
  }
});

/**
 * POST /orders/admin/:orderId/assign
 * Manually assign or reassign an order to a specific Scrap Champion by Admin
 */
router.post('/admin/:orderId/assign', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { champId, scrapChampId } = req.body;
    const finalChampId = champId || scrapChampId;

    if (!ObjectId.isValid(orderId) || !ObjectId.isValid(finalChampId)) {
      res.status(400).json({ error: 'Invalid Order ID or Champion ID' });
      return;
    }

    const db = getDb();
    const ordersCol = db.collection('orders');
    const usersCol = db.collection('users');

    const champ = await usersCol.findOne({ _id: new ObjectId(finalChampId), role: 'scrapChamp' });
    if (!champ) {
      res.status(404).json({ error: 'Scrap Champion not found' });
      return;
    }

    const order = await ordersCol.findOne({ _id: new ObjectId(orderId) });
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (['Completed', 'Cancelled'].includes(order.status)) {
      res.status(400).json({ error: 'Cannot reassign a completed or cancelled order' });
      return;
    }

    const result = await ordersCol.updateOne(
      { _id: new ObjectId(orderId) },
      { 
        $set: { 
          assignedScrapChampId: new ObjectId(finalChampId),
          status: 'Assigned',
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ error: 'Order not found or update failed' });
      return;
    }

    // Side effects wrapped in try-catch to ensure main logic success
    try {
        // Notify the newly assigned champion via SMS
        if (champ.mobileNumber) {
            // Prepare SMS
            const smsMessage = `You have been manually assigned a new pickup by Admin! Order ${orderId.slice(-6).toUpperCase()}. Please check your app.`;
            await smsService.sendSms(champ.mobileNumber, smsMessage);
            
            // Log SMS Event (Optional persistence)
            await db.collection('smsEvents').insertOne({
                orderId: order._id,
                userId: champ._id,
                mobileNumber: champ.mobileNumber,
                eventType: 'Manual_Allocation',
                status: 'Sent',
                meta: {},
                createdAt: new Date(),
            }).catch(e => console.error('[orders] SMS Event log failed:', e));
        }

        // Real-time socket notification to the champ
        try {
            emitAndLog(`user_${champ._id}`, 'orderAssigned', { orderId: order._id, assignedBy: 'Admin' });
            notificationService.notifyUser(
              champ._id.toString(),
              'New Assignment Received! ♻️',
              `An Admin has manually assigned you Job #${orderId.slice(-6).toUpperCase()}. Please check details and accept.`,
              'new_job_assigned_manual',
              { orderId: order._id }
            );
        } catch (sockError) {
            console.error('[orders] Socket emit error (manual assign):', sockError);
        }

        // Notify customer that a champ is assigned
        try {
            notificationService.notifyUser(
              order.customerId.toString(),
              'Champion Assigned! ♻️',
              `${champ.name} has been assigned for your pickup. They will arrive at the scheduled time.`,
              'champ_assigned_customer',
              { orderId: order._id, champName: champ.name }
            );
        } catch (custError) {
            console.error('[orders] Customer notify error (manual assign):', custError);
        }
    } catch (sideEffectError) {
        console.error('[orders] assignment side effects failed but DB updated:', sideEffectError);
    }

    res.json({ message: 'Order manually reassigned successfully', assignedTo: champ.name });
  } catch (error) {
    console.error('[orders] Admin manual assign error:', error);
    res.status(500).json({ error: 'Failed to manually assign order' });
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

    const pincodeMatch = (order.exactAddress || '').match(/(\d{6})/);
    const orderPincode = pincodeMatch ? pincodeMatch[1] : null;

    if (orderPincode) {
      const activeChamps = await db.collection('users').find({ role: 'scrapChamp', isActive: { $ne: false } }).project({ _id: 1, serviceArea: 1 }).toArray();
      order.notifiedChampsCount = activeChamps.filter(c => c.serviceArea?.includes(orderPincode)).length;
      
      if (order.declinedChampIds && Array.isArray(order.declinedChampIds)) {
         order.declinedChampIds = order.declinedChampIds.filter((id: any) => 
            activeChamps.some(c => c._id.toString() === id.toString())
         );
      }
    } else {
      order.notifiedChampsCount = 0;
    }

    res.json(order);
  } catch (error) {
    console.error('[orders] Admin detail error:', error);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});


/**
 * GET /admin/orders/:orderId/engagement
 * View list of champs notified and those who declined (Story: Engagement Visibility)
 */
router.get('/admin/:orderId/engagement', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const db = getDb();
    
    const dbOrder = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });
    if (!dbOrder) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const pincodeMatch = (dbOrder.exactAddress || '').match(/(\d{6})/);
    const orderPincode = pincodeMatch ? pincodeMatch[1] : null;

    if (!orderPincode) {
      res.json({ notified: [], declined: [] });
      return;
    }

    // Find all champs in that pincode (these were notified)
    const matchingChamps = await db.collection('users').find({ 
      role: 'scrapChamp',
      serviceArea: { $regex: orderPincode },
      isActive: { $ne: false }
    }).project({ name: 1, mobileNumber: 1, profilePhoto: 1 }).toArray();

    const declinedIds = (dbOrder.declinedChampIds || []).map((id: any) => id.toString());
    
    const notified = matchingChamps.map(champ => ({
      id: champ._id.toString(),
      name: champ.name,
      mobileNumber: champ.mobileNumber,
      profilePhoto: champ.profilePhoto,
      hasDeclined: declinedIds.includes(champ._id.toString())
    }));

    const declined = notified.filter(c => c.hasDeclined);

    res.json({ notified, declined });
  } catch (error) {
    console.error('[orders] Engagement fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch engagement details' });
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
        createdAt: { $gt: new Date(Date.now() - 30 * 60 * 1000) },
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

    const [myJobs, availableJobs, declined, feedbackDocs] = await Promise.all([
      ordersCol.countDocuments({ 
        assignedScrapChampId: champId,
        status: { $in: ['Assigned', 'Accepted'] }
      }),
      champPincode ? ordersCol.countDocuments({
        assignedScrapChampId: { $ne: champId },
        status: 'Requested',
        declinedChampIds: { $ne: champId },
        createdAt: { $gt: new Date(Date.now() - 30 * 60 * 1000) },
        $or: [
          { exactAddress: { $regex: champPincode } },
          { generalArea: { $regex: champPincode } }
        ]
      }) : Promise.resolve(0),
      ordersCol.countDocuments({ declinedChampIds: champId }),
      db.collection('feedback').find({ champId }).toArray()
    ]);

    // Calculate avg rating
    const ratings = (feedbackDocs as any[]).filter(f => f.rating).map(f => f.rating);
    const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '--';

    res.json({ 
      myJobs, 
      availableJobs, 
      declined,
      avgRating,
      total: myJobs + availableJobs 
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
    notificationService.notifyAdmins(
      'Job Declined',
      'A champion declined a broadcasted job.',
      'order_declined',
      { orderId, champId: req.user!.userId }
    );

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
          $or: [
            { assignedScrapChampId: new ObjectId(req.user!.userId) },
            { declinedChampIds: new ObjectId(req.user!.userId) }
          ]
        } 
      },
      {
        $addFields: {
          status: {
            $cond: {
              if: { 
                $and: [
                  { $ne: ["$assignedScrapChampId", new ObjectId(req.user!.userId)] },
                  { $in: [new ObjectId(req.user!.userId), { $ifNull: ["$declinedChampIds", []] }] }
                ]
              },
              then: "Declined",
              else: "$status"
            }
          }
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

    if (!ObjectId.isValid(orderId)) {
      res.status(400).json({ error: 'Invalid order ID format' });
      return;
    }

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

    const filteredOrder = { ...order } as any;
    filteredOrder.hasDeclined = order.declinedChampIds?.some((id: any) => id.toString() === req.user!.userId);

    if (order.status !== 'Accepted' && order.status !== 'Completed') {
      delete (filteredOrder as any).exactAddress;
      (filteredOrder as any).isAddressHidden = true;
    }

    res.json(filteredOrder);
  } catch (error: any) {
    console.error(`[orders] Scrap-champ detail error (ID: ${req.params.orderId}):`, error);
    res.status(500).json({ error: `Failed to fetch order details: ${error.message}` });
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
      notificationService.notifyAdmins(
        'Pickup Completed! ♻️',
        'A pickup task has been completed by the Scrap Champ.',
        'order_completed',
        { orderId, status: 'Completed' }
      );
    } catch (e) {
      console.error('[socket] Failed to emit order_completed', e);
    }

    // Emit real-time notification to customer
    try {
      console.log(`[socket] Emitting 'order_completed_customer' for order ${orderId} to user_${order.customerId}`);
      notificationService.notifyUser(
        order.customerId.toString(),
        'Pickup Completed! ♻️',
        'Your pickup has been completed! Thank you for recycling.',
        'order_completed_customer',
        { orderId, status: 'Completed' }
      );
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
          notificationService.notifyAdmins(
            'Job Accepted! ♻️',
            `Scrap Champ ${champ.name} has accepted the pickup.`,
            'order_accepted',
            { orderId, status: 'Accepted' }
          );
        } catch (e) {
          console.error('[socket] Failed to emit order_accepted', e);
        }

        // Emit real-time notification to ALL OTHER CHAMPS
        try {
           console.log(`[socket] Emitting 'order_accepted_by_other' for order ${orderId} to champ_room`);
           notificationService.notifyChamps(
             'Job Taken ♻️',
             `Job #${orderId.slice(-6).toUpperCase()} was accepted by ${champ.name}.`,
             'order_accepted_by_other',
             { orderId, champName: champ.name, acceptedByUserId: req.user!.userId }
           );
        } catch (e) {
           console.error('[socket] Failed to emit order_accepted_by_other', e);
        }

        // Emit real-time notification to customer
        try {
          console.log(`[socket] Emitting 'order_accepted_customer' for order ${orderId} to user_${order.customerId}`);
          notificationService.notifyUser(
            order.customerId.toString(),
            'Pickup Confirmed! ♻️',
            `Your pickup has been accepted by ${champ.name}! They will arrive at the scheduled time.`,
            'order_accepted_customer',
            { orderId, champName: champ.name, status: 'Accepted' }
          );
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

/**
 * PATCH /orders/admin/:orderId/status
 * Manually update order status (Admin Override)
 */
router.patch('/admin/:orderId/status', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const db = getDb();
    const ordersCol = db.collection('orders');

    const order = await ordersCol.findOne({ _id: new ObjectId(orderId) });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await ordersCol.updateOne(
      { _id: new ObjectId(orderId) },
      { $set: { status, updatedAt: new Date() } }
    );

    // Notify customer
    const statusMsg = status === 'Accepted' 
      ? 'Your pickup request has been accepted! A Scrap Champion will be assigned shortly.' 
      : `Your pickup request status has been updated to: ${status}`;

    notificationService.notifyUser(
      order.customerId.toString(),
      'Pickup Update ♻️',
      statusMsg,
      'order_status_update',
      { orderId, status }
    );

    // Notify Champ if assigned
    if (order.assignedScrapChampId) {
      notificationService.notifyUser(
        order.assignedScrapChampId.toString(),
        'Job Status Updated',
        `An admin has updated the status of order #${orderId.slice(-6).toUpperCase()} to: ${status}.`,
        'order_status_update_champ',
        { orderId, status }
      );
    }

    return res.json({ message: 'Status updated successfully', status });
  } catch (error) {
    console.error('[admin-status-update] Error:', error);
    return res.status(500).json({ error: 'Failed to update status' });
  }
});

// --- GENERIC PARAMETERIZED ROUTES (Put at the end to avoid hijacking) ---

/**
 * POST /orders/:orderId/retry
 * Retry an expired order (Story 14/New Request)
 */
router.post('/:orderId/retry', authenticate, authorize('customer'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req.user!.userId;
    const db = getDb();
    const ordersCol = db.collection('orders');

    const order = await ordersCol.findOne({ _id: new ObjectId(orderId) });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.customerId.toString() !== userId) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const isStaleRequested = order.status === 'Requested' && (new Date().getTime() - new Date(order.createdAt).getTime() > 30 * 60 * 1000);

    if (order.status !== 'Expired' && !isStaleRequested) {
      res.status(400).json({ error: 'Only expired orders can be retried' });
      return;
    }

    // Reset order for re-broadcast
    await ordersCol.updateOne(
      { _id: new ObjectId(orderId) },
      { 
        $set: { 
          status: 'Requested', 
          declinedChampIds: [], 
          notifiedChampsCount: 0,
          adminNotifiedOfDelay: false,
          createdAt: new Date(), // Reset timer for Allocation Center
          updatedAt: new Date() 
        } 
      }
    );

    // Re-broadcast
    const usersCol = db.collection('users');
    const customer = await usersCol.findOne({ _id: new ObjectId(userId) });
    const addressForMatching = customer?.pickupAddress || order.exactAddress;
    broadcastToChamps(orderId.toString(), addressForMatching).catch(err => {
      console.error('[broadcast] Background failure during retry:', err);
    });

    // Notify Customer
    notificationService.notifyUser(
      userId,
      'Retry Initiated ♻️',
      'We have re-broadcasted your pickup request to nearby Scrap Champions.',
      'order_retried_customer',
      { orderId }
    );

    // Notify Admin
    notificationService.notifyAdmins(
      'Pickup Retried',
      `Customer ${customer?.name || 'User'} has retried their expired pickup request.`,
      'order_retried_admin',
      { orderId }
    );

    res.json({ message: 'Order re-broadcasted successfully' });
  } catch (error) {
    console.error('[orders] Retry error:', error);
    res.status(500).json({ error: 'Failed to retry order' });
  }
});

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
      notificationService.notifyAdmins(
        'Pickup Cancelled 🚨',
        'A pickup request was just cancelled by the customer.',
        'pickup_cancelled',
        { orderId, area: order.generalArea }
      );
      notificationService.notifyUser(
        userId,
        'Pickup Cancelled',
        'Your pickup request has been successfully cancelled.',
        'pickup_cancelled',
        { orderId }
      );

      // Notify Champ if assigned
      if (order.assignedScrapChampId) {
        notificationService.notifyUser(
          order.assignedScrapChampId.toString(),
          'Pickup Cancelled 🚨',
          `Job #${orderId.slice(-6).toUpperCase()} has been cancelled by the customer.`,
          'pickup_cancelled_champ',
          { orderId }
        );
      }
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
