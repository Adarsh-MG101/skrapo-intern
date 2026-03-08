import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { OAuth2Client } from 'google-auth-library';
import { getDb } from '../config/db';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { smsService } from '../services/smsService';

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
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, mobileNumber, role: roleCode, googleId, pickupAddress, serviceArea, serviceRadiusKm } = req.body;

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
      },
    });
  } catch (error: unknown) {
    console.error('[auth/register]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
        role: user.role,
        defaultRoute: getDefaultRoute(user.role),
        pickupAddress: user.pickupAddress,
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
        role: roleCode,
        defaultRoute: getDefaultRoute(roleCode),
        pickupAddress: user.pickupAddress,
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
      },
    });
  } catch (error: unknown) {
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

export default router;

