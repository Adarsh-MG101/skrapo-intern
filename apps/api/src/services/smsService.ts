import fs from 'fs';
import path from 'path';

export interface SmsResponse {
  success: boolean;
  providerDetails?: any;
  error?: string;
}

class SmsService {
  private provider: string;

  constructor() {
    this.provider = process.env.SMS_PROVIDER || 'mock';
  }

  /**
   * Send an SMS message
   * @param to Phone number
   * @param message The SMS text content
   */
  async sendSms(to: string, message: string): Promise<SmsResponse> {
    if (this.provider === 'twilio') {
      return this.sendTwilioSms(to, message);
    }
    
    // Default to mock provider
    return this.sendMockSms(to, message);
  }

  private async sendMockSms(to: string, message: string): Promise<SmsResponse> {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] To: ${to} | Message: ${message}\n`;
    
    // Standardize log path to the repo root
    // We assume the process is running from root or apps/api
    let logPath = path.join(process.cwd(), 'SMS_BOX.log');
    
    // If running from apps/api, go up two levels to root
    if (process.cwd().includes('apps' + path.sep + 'api')) {
      logPath = path.join(process.cwd(), '..', '..', 'SMS_BOX.log');
    }

    try {
      fs.appendFileSync(logPath, logEntry);
      console.log(`[SMS_MOCK] Message for ${to} saved to ${logPath}`);
      return { success: true, providerDetails: { method: 'mock', logPath } };
    } catch (err: any) {
      console.error('[SMS_MOCK] Failed to write to log file:', err);
      return { success: false, error: err.message };
    }
  }

  private async sendTwilioSms(to: string, message: string): Promise<SmsResponse> {
    // Placeholder for Twilio integration
    console.warn('[SMS_TWILIO] Twilio provider is configured but not yet implemented. Falling back to mock.');
    return this.sendMockSms(to, message);
  }

  /**
   * Send assignment notification to Scrap Champ (Story 8)
   */
  async sendAssignmentNotification(to: string, orderId: string, area: string): Promise<SmsResponse> {
    const webUrl = process.env.WEB_URL || 'http://localhost:4200';
    const destinationPath = `/scrap-champ/orders/${orderId}`;
    const orderUrl = `${webUrl}/login?redirect=${encodeURIComponent(destinationPath)}`;
    const message = `[Skrapo] New Job! Area: ${area}. Respond here: ${orderUrl}`;
    return this.sendSms(to, message);
  }

  /**
   * Send notification to customer that their order was accepted (Story 5/14/New Request)
   */
  async sendAcceptanceNotificationToCustomer(to: string, champName: string, orderId: string, scheduledAt: Date): Promise<SmsResponse> {
    const webUrl = process.env.WEB_URL || 'http://localhost:4200';
    const destinationPath = `/customer/pickups/${orderId}`;
    const orderUrl = `${webUrl}/login?redirect=${encodeURIComponent(destinationPath)}`;
    const dateStr = scheduledAt.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const message = `Your Scrap Champ is confirmed! ${champName} will arrive on ${dateStr} at ${timeStr}. View details: ${orderUrl}`;
    return this.sendSms(to, message);
  }

  /**
   * Send feedback request SMS to customer (Story 6)
   */
  async sendFeedbackRequest(to: string, orderId: string): Promise<SmsResponse> {
    const webUrl = process.env.WEB_URL || 'http://localhost:4200';
    const destinationPath = `/customer/feedback/${orderId}`;
    const feedbackUrl = `${webUrl}/login?redirect=${encodeURIComponent(destinationPath)}`;
    const message = `[Skrapo] How was your recycling experience? Rate Champ and share feedback here: ${feedbackUrl}`;
    return this.sendSms(to, message);
  }

  /**
   * Send pickup reminder SMS to Scrap Champ N minutes before scheduled time
   */
  async sendPickupReminder(to: string, orderId: string, address: string, scheduledAt: Date, location?: {lat: number, lng: number}): Promise<SmsResponse> {
    const timeStr = scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = scheduledAt.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const webUrl = process.env.WEB_URL || 'http://localhost:4200';
    const destinationPath = `/scrap-champ/orders/${orderId}`;
    const orderUrl = `${webUrl}/login?redirect=${encodeURIComponent(destinationPath)}`;
    
    let message = `[Skrapo] ⏰ Reminder! You have a pickup at ${timeStr} on ${dateStr}. Address: ${address}. Details: ${orderUrl}`;
    
    if (location) {
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
      message += ` Navigation: ${mapsUrl}`;
    }

    return this.sendSms(to, message);
  }
}

export const smsService = new SmsService();
