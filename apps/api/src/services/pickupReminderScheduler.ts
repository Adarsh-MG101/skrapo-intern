import { getDb } from '../config/db';
import { smsService } from './smsService';
import { notificationService } from './notificationService';

const POLL_INTERVAL_MS = 30_000; // Check every 30 seconds
const NO_ACCEPTANCE_WINDOW_MS = 30 * 60 * 1000; // Alert admin if unassigned for 30 mins

let intervalHandle: ReturnType<typeof setInterval> | null = null;

async function checkUnassignedOrders() {
  try {
    const db = getDb();
    const ordersCol = db.collection('orders');
    const now = new Date();
    const delayThreshold = new Date(now.getTime() - NO_ACCEPTANCE_WINDOW_MS);

    // Find requested orders that haven't been accepted within the window
    const delayedOrders = await ordersCol.find({
      status: 'Requested',
      assignedScrapChampId: null,
      adminNotifiedOfDelay: { $ne: true },
      createdAt: { $lte: delayThreshold }
    }).toArray();

    if (delayedOrders.length === 0) return;

    console.log(`[monitor] Found ${delayedOrders.length} unassigned order(s) past 30min window`);

    for (const order of delayedOrders) {
      // Emit alert to admin
      notificationService.notifyAdmins(
        'Action Required: No Acceptance 🚨',
        `No champion accepted order ${order._id} in ${order.generalArea} within 30 minutes!`,
        'admin_no_acceptance',
        { orderId: order._id, area: order.generalArea, createdAt: order.createdAt }
      );

      // Mark as notified
      await ordersCol.updateOne(
        { _id: order._id },
        { $set: { adminNotifiedOfDelay: true } }
      );
    }
  } catch (err: any) {
    console.error('[monitor] Delay check error:', err.message);
  }
}

/**
 * Pickup Reminder Scheduler
 *
 * Polls the database for orders that:
 *  - Have status 'Accepted' (champ has accepted the job)
 *  - Are scheduled within the next N minutes (configured via PICKUP_REMINDER_MINUTES)
 *  - Have NOT already had a reminder sent (reminderSentAt is null)
 *
 * When found, sends an SMS reminder to the assigned Scrap Champ
 * and marks the order so it won't be reminded again.
 */
async function checkAndSendReminders() {
  try {
    const reminderMinutes = parseInt(process.env.PICKUP_REMINDER_MINUTES || '1', 10);
    const db = getDb();
    const ordersCol = db.collection('orders');
    const usersCol = db.collection('users');

    const now = new Date();
    const reminderWindow = new Date(now.getTime() + reminderMinutes * 60 * 1000);

    // Find accepted orders scheduled within the reminder window that haven't been reminded yet
    const upcomingOrders = await ordersCol.find({
      status: 'Accepted',
      assignedScrapChampId: { $ne: null },
      scheduledAt: { $lte: reminderWindow, $gte: now },
      reminderSentAt: { $exists: false },
    }).toArray();

    if (upcomingOrders.length === 0) return;

    console.log(`[reminder] Found ${upcomingOrders.length} order(s) needing reminder`);

    for (const order of upcomingOrders) {
      try {
        // Get the assigned champ's phone number
        const champ = await usersCol.findOne({ _id: order.assignedScrapChampId });
        if (!champ || !champ.mobileNumber) {
          console.warn(`[reminder] No champ or phone for order ${order._id}`);
          continue;
        }

        // Send the SMS reminder
        const result = await smsService.sendPickupReminder(
          champ.mobileNumber,
          order._id.toString(),
          order.exactAddress || order.generalArea || 'N/A',
          order.scheduledAt,
          order.location,
        );

        if (result.success) {
          // Mark order as reminded so we don't send duplicate reminders
          await ordersCol.updateOne(
            { _id: order._id },
            { $set: { reminderSentAt: new Date() } }
          );

          // Also send a notification to the champ
          notificationService.notifyUser(
            order.assignedScrapChampId.toString(),
            'Upcoming Pickup Reminder ⏰',
            `Reminder: You have a pickup soon at ${new Date(order.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            'pickup_reminder',
            { orderId: order._id, address: order.exactAddress || order.generalArea }
          );

          // Notify admin too
          notificationService.notifyAdmins(
            'Pickup Reminder Sent',
            `Reminder sent to ${champ.name} for Order #${order._id.toString().slice(-6).toUpperCase()}`,
            'pickup_reminder_sent',
            { orderId: order._id, champName: champ.name, scheduledAt: order.scheduledAt }
          );

          console.log(`[reminder] Sent reminder for order ${order._id} to champ ${champ.name} (${champ.mobileNumber})`);
        } else {
          console.error(`[reminder] Failed to send SMS for order ${order._id}:`, result.error);
        }
      } catch (err: any) {
        console.error(`[reminder] Error processing order ${order._id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error('[reminder] Scheduler error:', err.message);
  }
}

/**
 * Start the pickup reminder scheduler
 */
export function startPickupReminderScheduler() {
  const reminderMinutes = process.env.PICKUP_REMINDER_MINUTES || '1';
  console.log(`[reminder] Scheduler started — will remind champs ${reminderMinutes} minute(s) before pickup`);
  
  // Run immediately on start, then on interval
  checkAndSendReminders();
  checkUnassignedOrders();
  intervalHandle = setInterval(() => {
    checkAndSendReminders();
    checkUnassignedOrders();
  }, POLL_INTERVAL_MS);
}

/**
 * Stop the scheduler (for graceful shutdown)
 */
export function stopPickupReminderScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('[reminder] Scheduler stopped');
  }
}
