import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { OAuth2Client } from 'google-auth-library';
import { getDb } from '../config/db';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { smsService } from '../services/smsService';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../services/emailService';

const router = Router();

if (!process.env.JWT_SECRET) {
  throw new Error('❌ CRITICAL: JWT_SECRET environment variable is missing. The application cannot start without it for security reasons.');
}

const JWT_SECRET = process.env.JWT_SECRET as jwt.Secret;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '24h') as string;

// SECURITY: Use HTTP-only cookies for JWT to prevent XSS theft
const setAuthCookie = (res: Response, token: string) => {
  res.cookie('skrapo_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
  });
};

const clearAuthCookie = (res: Response) => {
  res.clearCookie('skrapo_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });
};

// POST /auth/otp/request
router.post('/otp/request', async (req: Request, res: Response) => {
  try {
    const { mobileNumber } = req.body;
    if (!mobileNumber) {
      res.status(400).json({ error: 'Mobile number is required' });
      return;
    }

    const db = getDb();

    // Determine recipient userId if they exist
    const user = await db.collection('users').findOne({ mobileNumber });
    const userId = user ? user._id : null;

    // DEV OTP LOGIC: Admin is always 1111, everyone else is 2222
    let otp;
    if (user && user.role === 'admin') {
      otp = '1111';
      console.log(`\n👑 [DEV OTP] Admin Match Found! -> ${mobileNumber}`);
    } else {
      otp = '2222';
      if (user) {
        console.log(`\n👤 [DEV OTP] Existing User (${user.role}) -> ${mobileNumber}`);
      } else {
        console.log(`\n🆕 [DEV OTP] New Number -> ${mobileNumber}`);
      }
    }

    console.log(`🔑 [DEV OTP] Generated: ${otp}\n`);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Send SMS via service
    const smsMessage = `Your Skrapo OTP is ${otp}. Valid for 5 minutes.`;
    const smsResult = await smsService.sendSms(mobileNumber, smsMessage);

    if (!smsResult.success) {
      throw new Error(smsResult.error || 'Failed to deliver SMS');
    }

    await db.collection('smsEvents').insertOne({
      orderId: null,
      userId,
      mobileNumber,
      eventType: 'OTP',
      status: 'Sent',
      meta: { otp, expiresAt, smsResult },
      createdAt: new Date(),
    });

    res.json({ message: 'OTP sent successfully', mobileNumber, testingNote: 'Check Terminal or SMS_BOX.log' });
  } catch (error: any) {
    console.error('[auth/otp/request] Error:', error);
    res.status(500).json({ error: 'Failed to request OTP. ' + (error.message || '') });
  }
});

// POST /auth/otp/verify
router.post('/otp/verify', async (req: Request, res: Response) => {
  try {
    const { mobileNumber, otp } = req.body;
    if (!mobileNumber || !otp) {
      res.status(400).json({ error: 'Mobile number and OTP are required' });
      return;
    }

    const db = getDb();
    const lastOtpEvent = await db.collection('smsEvents')
      .find({ mobileNumber, eventType: 'OTP' })
      .sort({ createdAt: -1 })
      .limit(1)
      .next();

    if (!lastOtpEvent || lastOtpEvent.meta.otp !== otp || new Date() > lastOtpEvent.meta.expiresAt) {
      res.status(400).json({ error: 'Invalid or expired OTP' });
      return;
    }

    // Check if user exists
    const user = await db.collection('users').findOne({ mobileNumber });
    
    if (!user) {
      res.status(200).json({ message: 'OTP verified', mobileNumber, isNewUser: true });
      return;
    }

    // Login user if exists
    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    setAuthCookie(res, token);

    res.json({
      message: 'Login successful',
      token, // Still sending token for mobile/legacy support
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
        defaultRoute: getDefaultRoute(user.role),
        pickupAddress: user.pickupAddress,
        serviceArea: user.serviceArea,
        serviceRadiusKm: user.serviceRadiusKm,
        panNumber: user.panNumber,
        panCardPic: user.panCardPic,
        aadharNumber: user.aadharNumber,
        aadharCardPic: user.aadharCardPic,
        gstNumber: user.gstNumber,
        gstCardPic: user.gstCardPic,
        profilePhoto: user.profilePhoto,
        cardNumber: user.cardNumber,
        isActive: user.isActive !== false,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { 
      name, email, password, mobileNumber, role: roleCode, googleId, pickupAddress, serviceArea, serviceRadiusKm,
      panNumber, panCardPic, aadharNumber, aadharCardPic, gstNumber, gstCardPic, profilePhoto, cardNumber
    } = req.body;

    if (!name || !mobileNumber || !roleCode) {
      res.status(400).json({ error: 'name, mobileNumber, and role are required' });
      return;
    }

    // Password is only optional if googleId is present
    if (!password && !googleId) {
        res.status(400).json({ error: 'Password or Google account required' });
        return;
    }

    const validRoles = ['customer', 'admin', 'scrapChamp'];
    if (!validRoles.includes(roleCode)) {
      res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
      return;
    }

    let isAdminCreating = false;
    const authHeader = req.headers.authorization;
    const tokenFromCookie = req.cookies?.skrapo_token;
    const tokenForCheck = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.split(' ')[1] : tokenFromCookie;
    
    if (tokenForCheck) {
      try {
        const decoded = jwt.verify(tokenForCheck, JWT_SECRET) as any;
        if (decoded.role === 'admin') {
          isAdminCreating = true;
        }
      } catch(e) {}
    }

    // SECURITY FIX: Prevent unauthorized admin/champ registration
    if (roleCode === 'admin' || roleCode === 'scrapChamp') {
      const setupKey = req.headers['x-setup-key'];
      const ADMIN_SETUP_KEY = process.env.ADMIN_SETUP_KEY || 'skrapo-emergency-setup-2024';

      let isAuthorized = isAdminCreating;

      // Option A: Emergency setup key (for first admin creation)
      if (setupKey === ADMIN_SETUP_KEY) {
        isAuthorized = true;
      } 

      if (!isAuthorized) {
        res.status(403).json({ error: `Unauthorized. Only admins can register users with the role: ${roleCode}` });
        return;
      }
    }

    const db = getDb();
    const usersCol = db.collection('users');
    const rolesCol = db.collection('roles');
    const userRolesCol = db.collection('user_roles');

    // Check if mobile number already exists
    const existingMobile = await usersCol.findOne({ mobileNumber });
    if (existingMobile) {
      res.status(409).json({ error: 'Mobile number already registered' });
      return;
    }

    // Check if email already exists (if provided)
    if (email) {
        const existingEmail = await usersCol.findOne({ email });
        if (existingEmail) {
          res.status(409).json({ error: 'Email already registered' });
          return;
        }
    }

    let passwordHash = null;
    if (password) {
        const salt = await bcrypt.genSalt(10);
        passwordHash = await bcrypt.hash(password, salt);
    }

    const now = new Date();
    const userDoc: any = {
      name,
      mobileNumber,
      role: roleCode,
      createdAt: now,
      updatedAt: now,
    };

    if (email) userDoc.email = email;
    if (passwordHash) userDoc.passwordHash = passwordHash;
    if (googleId) userDoc.googleId = googleId;
    
    // Role-specific fields
    if (pickupAddress) userDoc.pickupAddress = pickupAddress;
    if (serviceArea) userDoc.serviceArea = serviceArea;
    if (serviceRadiusKm) userDoc.serviceRadiusKm = Number(serviceRadiusKm);

    // Identity & Docs for Champ
    if (panNumber) userDoc.panNumber = panNumber;
    if (panCardPic) userDoc.panCardPic = panCardPic;
    if (aadharNumber) userDoc.aadharNumber = aadharNumber;
    if (aadharCardPic) userDoc.aadharCardPic = aadharCardPic;
    if (gstNumber) userDoc.gstNumber = gstNumber;
    if (gstCardPic) userDoc.gstCardPic = gstCardPic;
    if (profilePhoto) userDoc.profilePhoto = profilePhoto;
    if (cardNumber) userDoc.cardNumber = cardNumber;

    const userResult = await usersCol.insertOne(userDoc);

    console.log(`\n🆕 [DEV] User Created: ${roleCode.toUpperCase()} | Name: ${name} | Mobile: ${mobileNumber}\n`);

    const roleDoc = await rolesCol.findOne({ code: roleCode });
    if (roleDoc) {
      await userRolesCol.insertOne({
        userId: userResult.insertedId,
        roleId: roleDoc._id,
        createdAt: now,
        updatedAt: now,
      });
    }

    const token = jwt.sign(
      { userId: userResult.insertedId.toString(), role: roleCode },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    if (!isAdminCreating) {
      setAuthCookie(res, token);
    }

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: userResult.insertedId.toString(),
        name,
        email,
        mobileNumber,
        role: roleCode,
        defaultRoute: getDefaultRoute(roleCode),
        pickupAddress,
        serviceArea,
        serviceRadiusKm,
        panNumber,
        panCardPic,
        aadharNumber,
        aadharCardPic,
        gstNumber,
        gstCardPic,
        profilePhoto,
        cardNumber,
        isActive: true,
      },
    });
  } catch (error: unknown) {
    console.error('[auth/register]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /auth/password/forgot
router.post('/password/forgot', async (req: Request, res: Response) => {
  try {
    const { contact } = req.body;
    if (!contact) {
      res.status(400).json({ error: 'Email or mobile number is required' });
      return;
    }

    const db = getDb();
    const user = await db.collection('users').findOne({ 
      $or: [
        { email: contact.trim().toLowerCase() }, 
        { mobileNumber: contact.trim() }
      ] 
    });

    if (!user) {
      // For security, do not reveal if the account exists, but we can be helpful for UX
      res.status(404).json({ error: 'No account found with this contact information' });
      return;
    }

    if (!user.email) {
      res.status(400).json({ error: 'This user does not have an email address associated with their account.' });
      return;
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { resetToken, resetTokenExpires } }
    );

    // Get the base URL (for development, default to localhost:4200)
    const webUrl = process.env.WEB_URL || 'http://localhost:4200';
    const resetLink = `${webUrl}/reset-password?token=${resetToken}`;

    const emailResult = await sendPasswordResetEmail(user.email, resetLink);

    if (emailResult.success) {
      res.json({ message: `Password reset link sent to ${user.email}` });
    } else {
      res.status(500).json({ error: 'Failed to send reset email. Please try again later.' });
    }
  } catch (error) {
    console.error('[auth/password/forgot] Error:', error);
    res.status(500).json({ error: 'Failed to request password reset' });
  }
});

// POST /auth/password/reset
router.post('/password/reset', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({ error: 'Token and new password are required' });
      return;
    }

    const db = getDb();
    const user = await db.collection('users').findOne({ 
      resetToken: token,
      resetTokenExpires: { $gt: new Date() } // Must not be expired
    });

    if (!user) {
      res.status(400).json({ error: 'Invalid or expired password reset token' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password and clear the reset token
    await db.collection('users').updateOne(
      { _id: user._id },
      { 
        $set: { passwordHash, updatedAt: new Date() },
        $unset: { resetToken: "", resetTokenExpires: "" }
      }
    );

    res.json({ message: 'Password has been reset successfully. You can now login.' });
  } catch (error) {
    console.error('[auth/password/reset] Error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// POST /auth/google/login
router.post('/google/login', async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      res.status(400).json({ error: 'Google credential is required' });
      return;
    }

    // Verify Google ID Token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      res.status(400).json({ error: 'Invalid Google token payload' });
      return;
    }

    const { sub: googleId, email, name, picture } = payload;
    const db = getDb();
    const usersCol = db.collection('users');

    // Industry grade: check both googleId and email for account linking
    let user = await usersCol.findOne({ 
      $or: [
        { googleId }, 
        { email: email.toLowerCase() }
      ] 
    });

    if (!user) {
      // Return 200 but indicate user needs to finish registration with phone number
      // We send back verified info from Google so the frontend can pre-fill the form
      res.json({ 
        message: 'Google authenticated', 
        googleId, 
        email: email.toLowerCase(), 
        name, 
        picture,
        needsPhone: true 
      });
      return;
    }

    // Update googleId if it wasn't set (linked existing email account)
    const updateData: any = { updatedAt: new Date() };
    if (!user.googleId) updateData.googleId = googleId;
    // Always sync latest name/profile pic from Google
    if (name) updateData.name = name;
    
    await usersCol.updateOne({ _id: user._id }, { $set: updateData });

    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    setAuthCookie(res, token);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
        defaultRoute: getDefaultRoute(user.role),
        pickupAddress: user.pickupAddress,
        serviceArea: user.serviceArea,
        serviceRadiusKm: user.serviceRadiusKm,
        panNumber: user.panNumber,
        panCardPic: user.panCardPic,
        aadharNumber: user.aadharNumber,
        aadharCardPic: user.aadharCardPic,
        gstNumber: user.gstNumber,
        gstCardPic: user.gstCardPic,
        profilePhoto: user.profilePhoto,
        cardNumber: user.cardNumber,
        isActive: user.isActive !== false,
      },
    });
  } catch (error: any) {
    console.error('[auth/google/login] Error:', error.message);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' });
      return;
    }

    const db = getDb();
    const usersCol = db.collection('users');

    const normalizedEmail = email.trim().toLowerCase();
    const user = await usersCol.findOne({ email: normalizedEmail });
    
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const roleCode = user.role;
    const token = jwt.sign(
      { userId: user._id.toString(), role: roleCode },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    setAuthCookie(res, token);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: roleCode,
        defaultRoute: getDefaultRoute(roleCode),
        pickupAddress: user.pickupAddress,
        serviceArea: user.serviceArea,
        serviceRadiusKm: user.serviceRadiusKm,
        panNumber: user.panNumber,
        panCardPic: user.panCardPic,
        aadharNumber: user.aadharNumber,
        aadharCardPic: user.aadharCardPic,
        gstNumber: user.gstNumber,
        gstCardPic: user.gstCardPic,
        profilePhoto: user.profilePhoto,
        cardNumber: user.cardNumber,
        isActive: user.isActive !== false,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const db = getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.userId) });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const roleCode = user.role || req.user.role;

    // Generate a fresh token so the frontend always has a valid JWT after reload
    const token = jwt.sign(
      { userId: user._id.toString(), role: roleCode },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    // Refresh the cookie as well
    setAuthCookie(res, token);

    res.json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: roleCode,
        defaultRoute: getDefaultRoute(roleCode),
        pickupAddress: user.pickupAddress,
        serviceArea: user.serviceArea,
        serviceRadiusKm: user.serviceRadiusKm,
        panNumber: user.panNumber,
        panCardPic: user.panCardPic,
        aadharNumber: user.aadharNumber,
        aadharCardPic: user.aadharCardPic,
        gstNumber: user.gstNumber,
        gstCardPic: user.gstCardPic,
        profilePhoto: user.profilePhoto,
        cardNumber: user.cardNumber,
        isActive: user.isActive !== false,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/profile', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const db = getDb();
    const updateData: any = { updatedAt: new Date() };

    // Whitelist allowed fields
    const allowedFields = [
      'name', 'email', 'pickupAddress', 'serviceArea', 'serviceRadiusKm', 
      'panNumber', 'panCardPic', 'aadharNumber', 'aadharCardPic', 'gstNumber', 'gstCardPic', 'profilePhoto', 'cardNumber'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = field === 'serviceRadiusKm' ? Number(req.body[field]) : req.body[field];
      }
    }

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(req.user.userId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error: any) {
    console.error('[auth/profile] error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', authenticate, (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({ message: 'Logged out successfully' });
});

function getDefaultRoute(role: string): string {
  switch (role) {
    case 'customer':
      return '/customer/schedule';
    case 'admin':
      return '/admin';
    case 'scrapChamp':
      return '/scrap-champ';
    default:
      return '/login';
  }
}

// POST /auth/fcm-token
// Save FCM token for push notifications
router.post('/fcm-token', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    const db = getDb();
    const userId = new ObjectId(req.user!.userId);

    // Save token to user document (using an array to support multiple devices)
    console.log(`[auth/fcm-token] Saving token for user ${userId.toString()}`);
    await db.collection('users').updateOne(
      { _id: userId },
      { $addToSet: { fcmTokens: token } as any }
    );

    res.json({ message: 'FCM token saved successfully' });
  } catch (error) {
    console.error('[auth/fcm-token] Error:', error);
    res.status(500).json({ error: 'Failed to save FCM token' });
  }
});

export default router;

