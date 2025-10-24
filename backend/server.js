import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { OAuth2Client } from "google-auth-library";
import Hospital from "./models/hospital.js";
import Response from "./models/response.js";
import Appointment from "./models/appointment.js";
import Notification from "./models/notification.js";
import User from "./models/user.js";
import BloodInventory from "./models/bloodInventory.js";
import PlasmaInventory from "./models/plasmaInventory.js";
import BloodRequest from "./models/bloodRequest.js";
import AuditLog from "./models/auditLog.js";
import { generateAccessToken, generateRefreshToken, authenticateToken } from "./utils/jwt.js";
import { startReminderScheduler, triggerManualReminderCheck } from "./services/donationReminderService.js";
import { notifyMatchingDonors } from "./services/bloodRequestNotificationService.js";
import { startExpiryReminderScheduler, triggerManualExpiryCheck } from "./services/expiryReminderService.js";

dotenv.config();

const app = express();
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());

// Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Passport setup
app.use(passport.initialize());

// Google OAuth Strategy (only if env vars are set)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ oauthId: profile.id, provider: 'google' });
      if (!user) {
        // Check if user exists with same email
        user = await User.findOne({ email: profile.emails[0].value });
        if (user) {
          // Link OAuth to existing user (don't change provider if they already have one)
          if (!user.oauthId) {
            user.oauthId = profile.id;
            user.provider = 'google';
            await user.save();
          }
          // If user already has OAuth but different provider, keep existing provider
        } else {
          // Create new user
          user = new User({
            oauthId: profile.id,
            provider: 'google',
            email: profile.emails[0].value,
            fullName: profile.displayName,
            role: 'donor' // Default role, can be changed later
          });
          await user.save();
        }
      }
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// Facebook OAuth Strategy (only if env vars are set)
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "/auth/facebook/callback",
    profileFields: ['id', 'emails', 'name']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ oauthId: profile.id, provider: 'facebook' });
      if (!user) {
        user = await User.findOne({ email: profile.emails[0].value });
        if (user) {
          user.oauthId = profile.id;
          user.provider = 'facebook';
          await user.save();
        } else {
          user = new User({
            oauthId: profile.id,
            provider: 'facebook',
            email: profile.emails[0].value,
            fullName: `${profile.name.givenName} ${profile.name.familyName}`,
            role: 'donor'
          });
          await user.save();
        }
      }
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// ✅ MongoDB Connection
const mongoUri = process.env.MONGO_URI || "mongodb+srv://2312031:nataraj2006@cluster0.al6c44h.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("✅ Connected to MongoDB");
}).catch((err) => {
  console.error("❌ MongoDB connection failed:", err);
});

const Donation = mongoose.model('Donation', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bloodGroup: String,
  hospitalName: String,
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  donationDate: Date,
  createdAt: { type: Date, default: Date.now }
}));

app.post("/signup", async (req, res) => {
  const {
    role, fullName, dateOfBirth, gender, email, phoneNumber,
    password, street, city, state, pincode,
    bloodGroup, willingToDonatePlasma, lastDonationDate, weight, healthConditions
  } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      role,
      fullName,
      dateOfBirth,
      gender,
      email,
      phoneNumber,
      password: hashedPassword,
      street,
      city,
      state,
      pincode,
      bloodGroup: bloodGroup || null,
      willingToDonatePlasma: willingToDonatePlasma || null,
      lastDonationDate: lastDonationDate || null,
      weight: weight || null,
      healthConditions: healthConditions || []
    });

    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      message: "✅ User registered successfully!",
      user: {
        id: user._id,
        name: user.fullName,
        email: user.email,
        role: user.role
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Server error", error });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.warn("Login failed: No user found with email", email);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check if user has a password set (could be OAuth user who added password)
    if (!user.password) {
      return res.status(400).json({
        message: "This account was created with OAuth. Please set a password first or use OAuth login.",
        needsPasswordSetup: true
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn("Login failed: Password mismatch for email", email);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log("✅ Login success, sending user:", user);

    // Handle different user roles
    let userResponse = {
      id: user._id,
      name: user.fullName,
      email: user.email,
      role: user.role,
      hasPassword: !!user.password,
      hasOAuth: !!user.oauthId
    };

    if (user.role === 'hospital_staff') {
      userResponse.hospitalId = user.hospitalId;
      userResponse.staffRole = user.staffRole;
    } else if (user.role === 'hospital') {
      userResponse.hospitalId = user.hospitalId;
    } else if (user.role === 'donor') {
      userResponse.bloodGroup = user.bloodGroup;
      userResponse.lastDonationDate = user.lastDonationDate;
    } else if (user.role === 'recipient') {
      userResponse.bloodGroup = user.requiredBloodGroup;
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      message: "✅ Login successful!",
      user: userResponse,
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error("Unexpected error during login:", error);
    res.status(500).json({ message: "Server error during login", error });
  }
});

// OAuth Routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    const accessToken = generateAccessToken(req.user);
    const refreshToken = generateRefreshToken(req.user);

    // Redirect to frontend with tokens
    res.redirect(`http://localhost:3000/oauth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}&user=${encodeURIComponent(JSON.stringify({
      id: req.user._id,
      name: req.user.fullName,
      email: req.user.email,
      role: req.user.role
    }))}`);
  }
);

app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ['email'] })
);

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  (req, res) => {
    const accessToken = generateAccessToken(req.user);
    const refreshToken = generateRefreshToken(req.user);

    res.redirect(`http://localhost:3000/oauth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}&user=${encodeURIComponent(JSON.stringify({
      id: req.user._id,
      name: req.user.fullName,
      email: req.user.email,
      role: req.user.role
    }))}`);
  }
);

// Refresh Token Endpoint
app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required' });
  }

  try {
    const decoded = verifyToken(refreshToken, true);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(403).json({ message: 'User not found' });
    }
    const newAccessToken = generateAccessToken(user);

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(403).json({ message: 'Invalid refresh token' });
  }
});

// ✅ Admin Login API
app.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;

  // In production, use a proper admin table and hashed passwords
  const adminEmail = process.env.ADMIN_EMAIL || "admin@lifeshare.com";
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH || crypto.createHash('sha256').update("admin123").digest('hex');

  console.log("Admin login attempt:");
  console.log("Provided email:", email);
  console.log("Expected email:", adminEmail);
  console.log("Provided password hash:", crypto.createHash('sha256').update(password).digest('hex'));
  console.log("Expected password hash:", adminPasswordHash);

  if (email === adminEmail) {
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    if (passwordHash === adminPasswordHash) {
      const adminUser = {
        _id: 1,
        email: adminEmail,
        role: "admin",
        fullName: "System Admin"
      };
      const accessToken = generateAccessToken(adminUser);
      const refreshToken = generateRefreshToken(adminUser);

      res.json({
        message: "✅ Admin login successful!",
        user: {
          id: 1,
          name: "System Admin",
          email: adminEmail,
          role: "admin"
        },
        accessToken,
        refreshToken
      });
      return;
    }
  }
  res.status(401).json({ message: "Invalid admin credentials" });
});

// 👨‍⚕️ Hospital Staff Login API
app.post("/hospital-staff/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const staff = await User.findOne({ email, role: 'hospital_staff' });
    if (!staff) {
      console.warn("Hospital staff login failed: No staff found with email", email);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) {
      console.warn("Hospital staff login failed: Password mismatch for email", email);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log("✅ Hospital staff login success, sending user:", staff);

    res.json({
      message: "✅ Hospital staff login successful!",
      user: {
        id: staff._id,
        name: staff.fullName,
        email: staff.email,
        role: staff.role,
        hospitalId: staff.hospitalId,
        staffRole: staff.staffRole
      }
    });
  } catch (error) {
    console.error("Unexpected error during hospital staff login:", error);
    res.status(500).json({ message: "Server error during login", error });
  }
});

  
// =================== ADMIN ROUTES ===================

// 📊 Admin Dashboard Stats
app.get("/admin/stats", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalDonors = await User.countDocuments({ role: 'donor' });
    const totalRecipients = await User.countDocuments({ role: 'recipient' });
    const totalDonations = await Donation.countDocuments();
    const pendingRequests = await BloodRequest.countDocuments({ status: 'pending' });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayDonations = await Donation.countDocuments({
      donationDate: { $gte: today, $lt: tomorrow }
    });

    // Calculate total plasma stock
    const totalPlasmaStock = await PlasmaInventory.aggregate([
      { $group: { _id: null, total: { $sum: "$unitsAvailable" } } }
    ]);
    const totalPlasmaStockValue = totalPlasmaStock.length > 0 ? totalPlasmaStock[0].total : 0;

    // Calculate plasma stock alerts (units < 5)
    const plasmaStockAlerts = await PlasmaInventory.countDocuments({ unitsAvailable: { $lt: 5 } });

    res.json({
      totalUsers,
      totalDonors,
      totalRecipients,
      totalDonations,
      pendingRequests,
      todayDonations,
      totalPlasmaStock: totalPlasmaStockValue,
      plasmaStockAlerts
    });
  } catch (err) {
    console.error("Error fetching admin stats:", err);
    res.status(500).json({ message: "Error fetching stats", error: err });
  }
});

  
// 👥 Admin - Get All Users
app.get("/admin/users", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select(
      'id fullName email role bloodGroup requiredBloodGroup city state phoneNumber createdAt'
    );

    // Add displayBloodGroup field based on role
    const usersWithDisplayBloodGroup = users.map(user => {
      const displayBloodGroup = user.role === 'donor' ? user.bloodGroup :
        user.role === 'recipient' ? user.requiredBloodGroup : null;
      return {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        bloodGroup: user.bloodGroup,
        requiredBloodGroup: user.requiredBloodGroup,
        city: user.city,
        state: user.state,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
        displayBloodGroup
      };
    });

    res.json(usersWithDisplayBloodGroup);
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
});

// 👤 Admin - Get User by ID
app.get("/admin/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const userObj = user.toObject();
    delete userObj.password; // Don't send password
    res.json(userObj);
  } catch (err) {
    console.error("❌ Error fetching user:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
});

// ✏️ Admin - Update User
app.patch("/admin/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated this way
    delete updates.id;
    delete updates.password;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const user = await User.findByIdAndUpdate(id, updates, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "✅ User updated successfully" });
  } catch (err) {
    console.error("❌ Error updating user:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
});

// 🗑️ Admin - Delete User
app.delete("/admin/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Delete related records (donations, requests)
    await Donation.deleteMany({ userId: id });
    await BloodRequest.deleteMany({ recipientId: id });
    const user = await User.findByIdAndDelete(id);

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "✅ User deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting user:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
});

// 🩸 Admin - Get All Donations
app.get("/admin/donations", async (req, res) => {
  try {
    const donations = await Donation.find().populate('userId', 'fullName email phoneNumber').sort({ donationDate: -1 });

    const results = donations.map(donation => ({
      _id: donation._id,
      userId: donation.userId?._id,
      bloodGroup: donation.bloodGroup,
      hospitalName: donation.hospitalName,
      hospitalId: donation.hospitalId,
      donationDate: donation.donationDate,
      createdAt: donation.createdAt,
      donor_name: donation.userId?.fullName,
      donor_email: donation.userId?.email,
      donor_phone: donation.userId?.phoneNumber
    }));

    res.json(results);
  } catch (err) {
    console.error("❌ Error fetching donations:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
});

// 💉 Admin - Get All Blood Requests
app.get("/admin/requests", async (req, res) => {
  try {
    const requests = await BloodRequest.find().populate('recipientId', 'fullName email phoneNumber city state').sort({ requestDate: -1 });

    const results = requests.map(request => ({
      _id: request._id,
      recipientId: request.recipientId?._id,
      requestedGroup: request.requestedGroup,
      unitsNeeded: request.unitsNeeded,
      urgencyLevel: request.urgencyLevel,
      purpose: request.purpose,
      hospitalName: request.hospitalName,
      hospitalAddress: request.hospitalAddress,
      contactPerson: request.contactPerson,
      contactNumber: request.contactNumber,
      doctorName: request.doctorName,
      medicalCondition: request.medicalCondition,
      requiredDate: request.requiredDate,
      additionalNotes: request.additionalNotes,
      patientAge: request.patientAge,
      patientGender: request.patientGender,
      hemoglobinLevel: request.hemoglobinLevel,
      patientName: request.patientName,
      email: request.email,
      status: request.status,
      requestDate: request.requestDate,
      recipient_name: request.recipientId?.fullName,
      recipient_email: request.recipientId?.email,
      recipient_phone: request.recipientId?.phoneNumber,
      city: request.recipientId?.city,
      state: request.recipientId?.state
    }));

    res.json(results);
  } catch (err) {
    console.error("❌ Error fetching requests:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
});

// 📈 Admin - Analytics Data
app.get("/admin/analytics", async (req, res) => {
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const donationsByMonth = await Donation.aggregate([
      { $match: { donationDate: { $gte: oneYearAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$donationDate" },
            month: { $month: "$donationDate" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const donationsByBloodGroup = await Donation.aggregate([
      { $match: { bloodGroup: { $ne: null } } },
      { $group: { _id: "$bloodGroup", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const usersByRole = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } }
    ]);

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const requestsByUrgency = await BloodRequest.aggregate([
      { $match: { status: 'pending' } },
      {
        $group: {
          _id: {
            $cond: {
              if: { $gte: ["$requestDate", oneDayAgo] },
              then: "critical",
              else: {
                $cond: {
                  if: { $gte: ["$requestDate", threeDaysAgo] },
                  then: "high",
                  else: "normal"
                }
              }
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      donationsByMonth,
      donationsByBloodGroup,
      usersByRole,
      requestsByUrgency
    });
  } catch (err) {
    console.error("Error fetching analytics:", err);
    res.status(500).json({ message: "Error fetching analytics", error: err });
  }
});

// 🏥 Admin - Get All Hospitals
app.get("/admin/hospitals", async (req, res) => {
  try {
    const hospitals = await Hospital.find().sort({ name: 1 });
    res.json(hospitals);
  } catch (err) {
    console.error("❌ Error fetching hospitals:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
});

// 🏥 Admin - Add New Hospital
app.post("/admin/hospitals", async (req, res) => {
  try {
    const { name, address, city, state, pincode, phone, email } = req.body;

    if (!name || !address || !city || !state || !pincode) {
      return res.status(400).json({ message: "Name, address, city, state, and pincode are required" });
    }

    const hospital = new Hospital({
      name,
      address,
      city,
      state,
      pincode,
      phone,
      email
    });

    const savedHospital = await hospital.save();
    res.json({ message: "✅ Hospital added successfully", hospital: savedHospital });
  } catch (err) {
    console.error("❌ Error adding hospital:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
});

// 🏥 Admin - Update Hospital Verification
app.patch("/admin/hospitals/:id/verify", async (req, res) => {
  try {
    const { id } = req.params;
    const { verified } = req.body;

    const hospital = await Hospital.findById(id);
    if (!hospital) return res.status(404).json({ message: "Hospital not found" });

    // Validation for verification
    if (verified && (!hospital.name || !hospital.email)) {
      return res.status(400).json({ message: "Hospital name and email are required for verification" });
    }

    const previousStatus = hospital.verified;
    hospital.verified = verified;
    await hospital.save();

    // If verifying the hospital, create hospital login account
    if (verified && !previousStatus) {
      // Check if user already exists
      let hospitalUser = await User.findOne({ email: hospital.email, role: 'hospital' });
      if (hospitalUser) {
        return res.status(400).json({ message: "Hospital user already exists" });
      }

      const hashedPassword = await bcrypt.hash("abcd1234", 10);

      hospitalUser = new User({
        role: 'hospital',
        fullName: hospital.name,
        email: hospital.email,
        password: hashedPassword,
        hospitalId: hospital._id
      });

      await hospitalUser.save();

      // Create audit log
      const auditLog = new AuditLog({
        adminId: req.user?.id || 1, // Assuming admin ID from token or default
        action: 'verified',
        targetType: 'hospital',
        targetId: hospital._id,
        details: {
          hospitalName: hospital.name,
          hospitalEmail: hospital.email,
          createdHospitalUser: hospitalUser._id
        }
      });
      await auditLog.save();

      console.log("🏥 HOSPITAL VERIFIED:");
      console.log(`Hospital: ${hospital.name}`);
      console.log(`Login Email: ${hospital.email}`);
      console.log(`Default Password: abcd1234`);
    }

    res.json({ message: "✅ Hospital verification updated", hospital });
  } catch (err) {
    console.error("❌ Error updating hospital:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
});

// 🏥 Admin - Delete Hospital
app.delete("/admin/hospitals/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const hospital = await Hospital.findByIdAndDelete(id);
    if (!hospital) return res.status(404).json({ message: "Hospital not found" });

    res.json({ message: "✅ Hospital deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting hospital:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
});

// 🩸 Admin - Get Blood Inventory (Individual records with hospital details)
app.get("/admin/blood-inventory", async (req, res) => {
  try {
    const inventory = await BloodInventory.find()
      .populate('hospitalId', 'name city state')
      .sort({ hospitalId: 1, bloodGroup: 1 });

    // Format the response to match frontend expectations
    const formattedInventory = inventory.map(item => ({
      _id: item._id,
      id: item._id,
      hospitalName: item.hospitalId?.name || 'N/A',
      hospital: {
        name: item.hospitalId?.name || 'N/A',
        city: item.hospitalId?.city || '',
        state: item.hospitalId?.state || ''
      },
      bloodGroup: item.bloodGroup,
      quantity: item.unitsAvailable,
      unitsAvailable: item.unitsAvailable,
      expiryDate: item.expiryDate,
      lastUpdated: item.lastUpdated,
      status: item.unitsAvailable > 5 ? 'Available' : 'Low Stock'
    }));

    res.json(formattedInventory);
  } catch (err) {
    console.error("❌ Error fetching blood inventory:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
});

// 🩸 Admin - Get Plasma Inventory (Individual records with hospital details)
app.get("/admin/plasma-inventory", async (req, res) => {
  try {
    const inventory = await PlasmaInventory.find()
      .populate('hospitalId', 'name city state')
      .sort({ hospitalId: 1, bloodGroup: 1 });

    // Format the response to match frontend expectations
    const formattedInventory = inventory.map(item => ({
      _id: item._id,
      id: item._id,
      hospitalName: item.hospitalId?.name || 'N/A',
      hospital: {
        name: item.hospitalId?.name || 'N/A',
        city: item.hospitalId?.city || '',
        state: item.hospitalId?.state || ''
      },
      bloodGroup: item.bloodGroup,
      quantity: item.unitsAvailable,
      unitsAvailable: item.unitsAvailable,
      expiryDate: item.expiryDate,
      lastUpdated: item.lastUpdated,
      status: item.unitsAvailable > 5 ? 'Available' : 'Low Stock'
    }));

    res.json(formattedInventory);
  } catch (err) {
    console.error("❌ Error fetching plasma inventory:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
});

// 🩸 Admin - Add Plasma Inventory
app.post("/admin/plasma-inventory", async (req, res) => {
  try {
    const { hospitalId, bloodGroup, unitsAvailable, expiryDate, sourceBloodUnitId } = req.body;

    // Validate required fields
    if (!hospitalId || !bloodGroup || !unitsAvailable || !expiryDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Create new plasma inventory entry
    const newPlasma = new PlasmaInventory({
      hospitalId,
      bloodGroup,
      unitsAvailable,
      expiryDate: new Date(expiryDate),
      sourceBloodUnitId: sourceBloodUnitId || null
    });

    await newPlasma.save();

    // Log the action
    await AuditLog.create({
      action: 'CREATE_PLASMA_INVENTORY',
      performedBy: 'admin',
      details: {
        plasmaId: newPlasma._id,
        hospitalId,
        bloodGroup,
        unitsAvailable,
        expiryDate
      }
    });

    res.status(201).json({
      message: "Plasma inventory added successfully",
      plasma: newPlasma
    });
  } catch (err) {
    console.error("❌ Error adding plasma inventory:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
});

// 🩸 Admin - Update Plasma Inventory
app.put("/admin/plasma-inventory/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { unitsAvailable, expiryDate } = req.body;

    const updateData = {};
    if (unitsAvailable !== undefined) updateData.unitsAvailable = unitsAvailable;
    if (expiryDate) updateData.expiryDate = new Date(expiryDate);
    updateData.lastUpdated = new Date();

    const updatedPlasma = await PlasmaInventory.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('hospitalId', 'name');

    if (!updatedPlasma) {
      return res.status(404).json({ message: "Plasma inventory not found" });
    }

    // Log the action
    await AuditLog.create({
      action: 'UPDATE_PLASMA_INVENTORY',
      performedBy: 'admin',
      details: {
        plasmaId: id,
        updates: updateData
      }
    });

    res.json({
      message: "Plasma inventory updated successfully",
      plasma: updatedPlasma
    });
  } catch (err) {
    console.error("❌ Error updating plasma inventory:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
});

// 🩸 Admin - Delete Plasma Inventory
app.delete("/admin/plasma-inventory/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedPlasma = await PlasmaInventory.findByIdAndDelete(id);

    if (!deletedPlasma) {
      return res.status(404).json({ message: "Plasma inventory not found" });
    }

    // Log the action
    await AuditLog.create({
      action: 'DELETE_PLASMA_INVENTORY',
      performedBy: 'admin',
      details: {
        plasmaId: id,
        bloodGroup: deletedPlasma.bloodGroup,
        unitsAvailable: deletedPlasma.unitsAvailable
      }
    });

    res.json({ message: "Plasma inventory deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting plasma inventory:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
});

// 👨‍⚕️ Admin - Create Hospital Staff Account
app.post("/admin/hospital-staff", async (req, res) => {
  try {
    const { fullName, email, phoneNumber, password, hospitalId, staffRole } = req.body;

    if (!fullName || !email || !password || !hospitalId) {
      return res.status(400).json({ message: "Full name, email, password, and hospital ID are required" });
    }

    // Check if hospital exists and is verified
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }
    if (!hospital.verified) {
      return res.status(400).json({ message: "Cannot create staff for unverified hospital" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const hospitalStaff = new User({
      role: 'hospital_staff',
      fullName,
      email,
      phoneNumber,
      password: hashedPassword,
      hospitalId,
      staffRole: staffRole || 'staff'
    });

    const savedStaff = await hospitalStaff.save();
    res.json({
      message: "✅ Hospital staff account created successfully",
      staff: {
        id: savedStaff._id,
        fullName: savedStaff.fullName,
        email: savedStaff.email,
        hospitalId: savedStaff.hospitalId,
        staffRole: savedStaff.staffRole
      }
    });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern && err.keyPattern.email) {
      return res.status(400).json({ message: "Email already exists" });
    }
    console.error("❌ Error creating hospital staff:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
});

// 👨‍⚕️ Admin - Get Hospital Staff
app.get("/admin/hospital-staff", async (req, res) => {
  try {
    const staff = await User.find({ role: 'hospital_staff' })
      .populate('hospitalId', 'name city state')
      .select('fullName email phoneNumber hospitalId staffRole createdAt')
      .sort({ createdAt: -1 });

    res.json(staff);
  } catch (err) {
    console.error("❌ Error fetching hospital staff:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
});

// =================== EXISTING ROUTES ===================

// Get user by ID
app.get("/user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('id fullName email bloodGroup role');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ message: "DB error", error: err });
  }
});

app.get("/donors", async (req, res) => {
  try {
    const { bg, city, state } = req.query;
    const filter = { role: 'donor' };
    if (bg) filter.bloodGroup = bg;
    if (city) filter.city = city;
    if (state) filter.state = state;

    const donors = await User.find(filter).select('id fullName bloodGroup city state lastDonationDate');
    res.json(donors);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ message: "DB error", error: err });
  }
});

app.post("/requests", async (req, res) => {
  try {
    const {
      recipient_id,
      requested_group,
      units_needed,
      urgency_level,
      purpose,
      hospital_name,
      hospital_address,
      contact_person,
      contact_number,
      doctor_name,
      medical_condition,
      required_date,
      additional_notes,
      patient_age,
      patient_gender,
      hemoglobin_level,
      patient_name,
      email
    } = req.body;

    if (!recipient_id || !requested_group) {
      return res.status(400).json({ message: "recipient_id and requested_group are required" });
    }

    const bloodRequest = new BloodRequest({
      recipientId: recipient_id,
      requestedGroup: requested_group,
      unitsNeeded: units_needed,
      urgencyLevel: urgency_level,
      purpose,
      hospitalName: hospital_name,
      hospitalAddress: hospital_address,
      contactPerson: contact_person,
      contactNumber: contact_number,
      doctorName: doctor_name,
      medicalCondition: medical_condition,
      requiredDate: required_date,
      additionalNotes: additional_notes,
      patientAge: patient_age,
      patientGender: patient_gender,
      hemoglobinLevel: hemoglobin_level,
      patientName: patient_name,
      email
    });

    const savedRequest = await bloodRequest.save();

    // Automatically notify matching donors after request creation
    try {
      console.log('🔔 Triggering donor notifications for new blood request:', savedRequest._id);
      const notificationResult = await notifyMatchingDonors(savedRequest);
      console.log('✅ Donor notification result:', notificationResult);
    } catch (notificationError) {
      console.error('❌ Error sending donor notifications:', notificationError);
      // Don't fail the request creation if notifications fail
    }

    res.json({ message: "✅ Request created", request_id: savedRequest._id });
  } catch (err) {
    console.error("❌ DB error inserting blood request:", err);
    res.status(500).json({ message: `DB error: ${err.message}`, error: err });
  }
});

// 📋 List requests for a user
app.get("/requests/:recipientId", async (req, res) => {
  try {
    const { recipientId } = req.params;
    const requests = await BloodRequest.find({ recipientId }).sort({ requestDate: -1 });
    res.json(requests);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ message: "DB error", error: err });
  }
});

// 📋 List all pending blood requests
app.get("/requests/all/pending", async (req, res) => {
  try {
    const requests = await BloodRequest.find({ status: 'pending' }).sort({ requestDate: -1 });
    res.json(requests);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ message: "DB error", error: err });
  }
});

// 🩸 Get blood requests matching donor's blood group
app.get("/requests/donor/:donorId", async (req, res) => {
  try {
    const { donorId } = req.params;

    // Get donor's blood group
    const donor = await User.findById(donorId);
    if (!donor || donor.role !== 'donor') {
      return res.status(404).json({ message: "Donor not found" });
    }

    const bloodGroup = donor.bloodGroup;
    if (!bloodGroup) {
      return res.status(400).json({ message: "Donor blood group not set" });
    }

    // Find pending requests with matching requestedGroup
    const requests = await BloodRequest.find({ status: 'pending', requestedGroup: bloodGroup })
      .sort({ requestDate: -1 })
      .limit(10); // Limit to 10 recent requests

    res.json(requests);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ message: "DB error", error: err });
  }
});

// 🩸 Donor directly accepts a blood request
app.patch("/requests/:requestId/accept", async (req, res) => {
  try {
    const { requestId } = req.params;
    const { donorId } = req.body;

    if (!donorId) {
      return res.status(400).json({ message: "donorId is required" });
    }

    // Find the blood request
    const bloodRequest = await BloodRequest.findById(requestId);
    if (!bloodRequest) {
      return res.status(404).json({ message: "Blood request not found" });
    }

    if (bloodRequest.status !== 'pending') {
      return res.status(400).json({ message: "Request is not in pending status" });
    }

    // Get donor details
    const donor = await User.findById(donorId);
    if (!donor || donor.role !== 'donor') {
      return res.status(404).json({ message: "Donor not found" });
    }

    // Update the blood request
    bloodRequest.donorId = donorId;
    bloodRequest.status = 'accepted';
    bloodRequest.donor_response = 'accepted';
    bloodRequest.recipient_status = 'accepted';
    await bloodRequest.save();

    // Find hospital by name to get hospitalId
    const hospital = await Hospital.findOne({ name: bloodRequest.hospitalName });
    if (!hospital) {
      return res.status(400).json({ message: "Hospital not found for the request" });
    }

    // Create appointment automatically
    const appointment = new Appointment({
      donorId: donorId,
      recipientId: bloodRequest.recipientId,
      requestId: requestId,
      appointmentDate: bloodRequest.requiredDate || new Date(),
      hospitalId: hospital._id,
      hospitalName: bloodRequest.hospitalName,
      hospitalAddress: bloodRequest.hospitalAddress,
      status: 'scheduled'
    });
    await appointment.save();

    // Get recipient details for notification
    const recipient = await User.findById(bloodRequest.recipientId);

    // Notify recipient about donor acceptance
    if (recipient) {
      const notification = new Notification({
        userId: recipient._id,
        type: 'donor_accepted',
        title: 'Donor Found!',
        message: `${donor.fullName} has accepted your blood request and an appointment has been scheduled.`,
        requestId: requestId
      });
      await notification.save();
    }

    // Notify donor about acceptance
    const donorNotification = new Notification({
      userId: donorId,
      type: 'request_accepted',
      title: 'Request Accepted',
      message: `You have accepted the blood request. An appointment has been scheduled at ${bloodRequest.hospitalName}.`,
      requestId: requestId
    });
    await donorNotification.save();

    console.log("🎉 DONOR ACCEPTED REQUEST:");
    console.log(`Request ID: ${requestId}`);
    console.log(`Donor: ${donor.fullName} (${donor.bloodGroup})`);
    console.log(`Recipient: ${recipient ? recipient.fullName : 'N/A'}`);
    console.log(`Hospital: ${bloodRequest.hospitalName}`);
    console.log(`Appointment created: ${appointment._id}`);

    res.json({
      message: "✅ Request accepted successfully",
      request: {
        id: bloodRequest._id,
        status: bloodRequest.status,
        donor_response: bloodRequest.donor_response,
        recipient_status: bloodRequest.recipient_status
      },
      appointment: {
        id: appointment._id,
        date: appointment.appointmentDate,
        hospitalName: appointment.hospitalName
      }
    });
  } catch (err) {
    console.error("Error accepting request:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// 📥 Record a new donation
app.post("/donations", async (req, res) => {
  try {
    const { user_id, blood_group, hospital_name, hospital_id, donation_date } = req.body;

    if (!user_id || !donation_date) {
      return res.status(400).json({ message: "user_id and donation_date are required" });
    }

    const donation = new Donation({
      userId: user_id,
      bloodGroup: blood_group || null,
      hospitalName: hospital_name || null,
      hospitalId: hospital_id || null,
      donationDate: donation_date
    });

    const savedDonation = await donation.save();
    res.json({ message: "✅ Donation recorded", donation_id: savedDonation._id });
  } catch (err) {
    console.error("❌ DB error inserting donation:", err);
    res.status(500).json({ message: "DB error", error: err });
  }
});

// 🔢 Get donation count for a donor
app.get("/donations/count/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const count = await Donation.countDocuments({ userId });
    res.json({ count });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err });
  }
});

// ✅ Get donation history with hospital name
app.get("/donations/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const donations = await Donation.find({ userId }).select('donationDate hospitalName bloodGroup').sort({ donationDate: -1 });
    res.json(donations);
  } catch (err) {
    console.error("❌ Error fetching donation history:", err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// Get latest donation date for a user
app.get("/donations/latest/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const latestDonation = await Donation.findOne({ userId }).sort({ donationDate: -1 }).select('donationDate');

    if (latestDonation) {
      res.json({ lastDonation: latestDonation.donationDate });
    } else {
      res.json({ lastDonation: null });
    }
  } catch (err) {
    console.error("❌ Error fetching latest donation:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// 🏥 Get Verified Hospitals for Donors
app.get("/hospitals/verified", async (req, res) => {
  try {
    const hospitals = await Hospital.find({ verified: true }).sort({ name: 1 });
    res.json(hospitals);
  } catch (err) {
    console.error("❌ Error fetching verified hospitals:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
});

// 📅 Book Donation Appointment
app.post("/appointments/book", async (req, res) => {
  try {
    const { donorId, hospitalId, appointmentDate, appointmentTime, requestId } = req.body;

    if (!donorId || !hospitalId || !appointmentDate) {
      return res.status(400).json({ message: "donorId, hospitalId, and appointmentDate are required" });
    }

    // Get donor and hospital details
    const donor = await User.findById(donorId);
    if (!donor || donor.role !== 'donor') {
      return res.status(404).json({ message: "Donor not found" });
    }

    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    if (!hospital.verified) {
      return res.status(400).json({ message: "Cannot book appointment at unverified hospital" });
    }

    // Get recipient from request if provided
    let recipientId = null;
    if (requestId) {
      const bloodRequest = await BloodRequest.findById(requestId);
      if (bloodRequest) {
        recipientId = bloodRequest.recipientId;
      }
    }

    // Create appointment record
    const appointment = new Appointment({
      donorId,
      recipientId,
      requestId,
      appointmentDate,
      appointmentTime,
      hospitalId,
      hospitalName: hospital.name,
      hospitalAddress: `${hospital.address}, ${hospital.city}, ${hospital.state} ${hospital.pincode}`,
      status: 'scheduled'
    });

    const savedAppointment = await appointment.save();
    res.json({
      message: "✅ Appointment booked successfully",
      appointment: {
        id: savedAppointment._id,
        appointmentDate: savedAppointment.appointmentDate,
        hospitalName: savedAppointment.hospitalName,
        status: savedAppointment.status
      }
    });
  } catch (err) {
    console.error("❌ Error booking appointment:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
});

app.get("/api/recipients/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const recipient = await User.findById(id).select('id fullName requiredBloodGroup email phoneNumber city state');
    if (!recipient) {
      console.warn("Recipient not found for id:", id);
      return res.status(404).json({ error: "Recipient not found" });
    }
    res.json({
      id: recipient._id,
      name: recipient.fullName,
      bloodGroup: recipient.requiredBloodGroup,
      email: recipient.email,
      contactNumber: recipient.phoneNumber,
      city: recipient.city,
      state: recipient.state
    });
  } catch (err) {
    console.error("❌ Database error:", err);
    res.status(500).json({ error: err.message });
  }
});





const PORT = 5000;

// GET /admin/matches - get donor-recipient matches for admin dashboard
app.get('/admin/matches', async (req, res) => {
  try {
    // Find all responses with accepted status
    const acceptedResponses = await Response.find({ responseStatus: 'accepted' })
      .populate('donorId', 'fullName email city state bloodGroup')
      .populate({
        path: 'requestId',
        populate: { path: 'recipientId', select: 'fullName email city state' }
      });

    // Map to match objects
    const matches = acceptedResponses.map(resp => ({
      id: resp._id,
      donor: resp.donorId,
      recipient: resp.requestId.recipientId,
      bloodGroup: resp.donorId.bloodGroup || 'N/A',
      city: resp.requestId.recipientId?.city || 'Not specified',
      state: resp.requestId.recipientId?.state || '',
      matchDate: resp.createdAt,
      status: resp.requestId.status || 'matched'
    }));

    res.json(matches);
  } catch (err) {
    console.error('Error fetching matches:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
});

// POST /responses - donor responds to a blood request
app.post("/responses", async (req, res) => {
  try {
    const { donorId, requestId } = req.body;
    if (!donorId || !requestId) {
      return res.status(400).json({ message: "donorId and requestId are required" });
    }

    // Check if response already exists
    const existingResponse = await Response.findOne({ donorId, requestId });
    if (existingResponse) {
      return res.status(400).json({ message: "You have already responded to this request" });
    }

    // Create new response
    const response = new Response({ donorId, requestId });
    await response.save();

    // Update blood request status to 'matched' if currently 'pending'
    const bloodRequest = await BloodRequest.findById(requestId);
    if (bloodRequest && bloodRequest.status === 'pending') {
      bloodRequest.status = 'matched';
      await bloodRequest.save();
    }

    // Notify recipient about donor response (create notification)
    const recipientId = bloodRequest.recipientId;
    const donor = await User.findById(donorId);
    if (recipientId && donor) {
      const notification = new Notification({
        userId: recipientId,
        type: 'response_accepted',
        title: 'New Donor Response',
        message: `${donor.fullName} has responded to your blood request.`,
        requestId: requestId
      });
      await notification.save();
    }

    res.json({ message: "✅ Response recorded successfully" });
  } catch (err) {
    console.error("Error recording response:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// GET /responses/:recipientId - get all responses for recipient's requests
app.get("/responses/:recipientId", async (req, res) => {
  try {
    const { recipientId } = req.params;

    // Find requests by recipient
    const requests = await BloodRequest.find({ recipientId });
    const requestIds = requests.map(r => r._id);

    // Find responses for those requests
    const responses = await Response.find({ requestId: { $in: requestIds } })
      .populate('donorId', 'fullName bloodGroup email phoneNumber')
      .populate('requestId');

    res.json(responses);
  } catch (err) {
    console.error("Error fetching responses:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// PATCH /responses/:responseId - update response status (accept/decline)
app.patch("/responses/:responseId", async (req, res) => {
  try {
    const { responseId } = req.params;
    const { responseStatus } = req.body;

    if (!['accepted', 'declined'].includes(responseStatus)) {
      return res.status(400).json({ message: "Invalid responseStatus" });
    }

    const response = await Response.findById(responseId);
    if (!response) {
      return res.status(404).json({ message: "Response not found" });
    }

    response.responseStatus = responseStatus;
    await response.save();

    // If accepted, lock the blood request and handle the full workflow
    if (responseStatus === 'accepted') {
      const bloodRequest = await BloodRequest.findById(response.requestId);
      if (bloodRequest) {
        // 1. Lock the Match - Change request status from pending → matched
        bloodRequest.status = 'matched';
        bloodRequest.donorId = response.donorId;

        // Ensure required fields are set with valid values
        if (!bloodRequest.unitsNeeded) {
          bloodRequest.unitsNeeded = 1;
        }
        if (bloodRequest.urgencyLevel === 'urgent') {
          bloodRequest.urgencyLevel = 'critical';
        }

        await bloodRequest.save();

        // 2. Handle other donor responses - decline other pending responses for this request
        await Response.updateMany(
          { requestId: response.requestId, _id: { $ne: responseId }, responseStatus: 'pending' },
          { responseStatus: 'declined' }
        );

        // 3. Find hospital by name to get hospitalId
        const hospital = await Hospital.findOne({ name: bloodRequest.hospitalName });
        if (!hospital) {
          return res.status(400).json({ message: "Hospital not found for the request" });
        }

        // 3. Create appointment with hospital details
        const appointment = new Appointment({
          donorId: response.donorId,
          recipientId: bloodRequest.recipientId,
          requestId: response.requestId,
          appointmentDate: bloodRequest.requiredDate || new Date(),
          hospitalId: hospital._id,
          hospitalName: bloodRequest.hospitalName,
          hospitalAddress: bloodRequest.hospitalAddress
        });
        await appointment.save();

        // 4. Get donor and recipient details for notification
        const donor = await User.findById(response.donorId);
        const recipient = await User.findById(bloodRequest.recipientId);

        // 5. Notify Donor - In a real app, this would send email/SMS
        // For now, we'll log the notification details
        console.log("🔔 NOTIFICATION TO DONOR:");
        console.log(`Donor: ${donor.fullName} (${donor.email})`);
        console.log(`Recipient accepted your blood donation offer!`);
        console.log(`Hospital: ${bloodRequest.hospitalName}`);
        console.log(`Address: ${bloodRequest.hospitalAddress}`);
        console.log(`Contact Person: ${bloodRequest.contactPerson}`);
        console.log(`Contact Number: ${bloodRequest.contactNumber}`);
        console.log(`Appointment Date: ${bloodRequest.requiredDate}`);
        console.log(`Recipient Contact: ${recipient.fullName} - ${recipient.phoneNumber}`);

        // Create notification for recipient about acceptance
        if (recipient) {
          const notification = new Notification({
            userId: recipient._id,
            type: 'response_accepted',
            title: 'Donor Response Accepted',
            message: `${donor.fullName} has accepted your blood request.`,
            requestId: bloodRequest._id
          });
          await notification.save();
        }

        // 6. Share Contact/Logistics - In controlled model, generate QR code or request ID
        const requestId = bloodRequest._id.toString();
        console.log(`Request ID for verification: ${requestId}`);

        // 7. Admin Dashboard Update - Log for admin monitoring
        console.log("📊 ADMIN UPDATE: New donor-recipient match created");
        console.log(`Request ID: ${requestId}`);
        console.log(`Donor: ${donor.fullName}`);
        console.log(`Recipient: ${recipient.fullName}`);
        console.log(`Status: Matched - Awaiting donation completion`);
      }
    }

    res.json({
      message: `Response ${responseStatus}`,
      status: responseStatus === 'accepted' ? 'matched' : responseStatus
    });
  } catch (err) {
    console.error("Error updating response:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// GET /appointments/:userId - get appointments for user (donor or recipient)
app.get("/appointments/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const appointments = await Appointment.find({
      $or: [{ donorId: userId }, { recipientId: userId }]
    }).populate('donorId', 'fullName').populate('recipientId', 'fullName').populate('requestId');
    res.json(appointments);
  } catch (err) {
    console.error("Error fetching appointments:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// PATCH /appointments/:appointmentId - update appointment status
app.patch("/appointments/:appointmentId", async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body;

    if (!['scheduled', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    appointment.status = status;
    await appointment.save();

    // If completed, update blood request to completed and record donation
    if (status === 'completed') {
      const bloodRequest = await BloodRequest.findById(appointment.requestId);
      if (bloodRequest) {
        bloodRequest.status = 'completed';
        await bloodRequest.save();

        // Record the donation
        const donation = new Donation({
          userId: appointment.donorId,
          bloodGroup: bloodRequest.requestedGroup,
          hospitalName: appointment.hospitalName,
          donationDate: new Date()
        });
        await donation.save();

        // Update donor's last donation date
        await User.findByIdAndUpdate(appointment.donorId, {
          lastDonationDate: new Date()
        });

        console.log("🎉 DONATION COMPLETED:");
        console.log(`Donor: ${appointment.donorId}`);
        console.log(`Recipient: ${appointment.recipientId}`);
        console.log(`Hospital: ${appointment.hospitalName}`);
        console.log(`Units donated: ${bloodRequest.unitsNeeded}`);
        console.log("✅ Donor recognition updated");
      }
    }

    res.json({ message: `Appointment ${status}` });
  } catch (err) {
    console.error("Error updating appointment:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// GET /matches - Get all matched donor-recipient pairs for admin
app.get("/admin/matches", async (req, res) => {
  try {
    const matches = await BloodRequest.find({ status: 'matched' })
      .populate('recipientId', 'fullName email phoneNumber')
      .populate('donorId', 'fullName email phoneNumber bloodGroup')
      .sort({ requestDate: -1 });

    const results = matches.map(match => ({
      _id: match._id,
      requestId: match._id,
      donor: {
        id: match.donorId?._id,
        name: match.donorId?.fullName,
        email: match.donorId?.email,
        phone: match.donorId?.phoneNumber,
        bloodGroup: match.donorId?.bloodGroup
      },
      recipient: {
        id: match.recipientId?._id,
        name: match.recipientId?.fullName,
        email: match.recipientId?.email,
        phone: match.recipientId?.phoneNumber
      },
      hospitalName: match.hospitalName,
      hospitalAddress: match.hospitalAddress,
      unitsNeeded: match.unitsNeeded,
      urgencyLevel: match.urgencyLevel,
      requestDate: match.requestDate,
      status: 'matched'
    }));

    res.json(results);
  } catch (err) {
    console.error("❌ Error fetching matches:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
});

// GET /matches/completed - Get completed matches for recognition
app.get("/matches/completed", async (req, res) => {
  try {
    const completed = await BloodRequest.find({ status: 'completed' })
      .populate('recipientId', 'fullName')
      .populate('donorId', 'fullName bloodGroup')
      .sort({ requestDate: -1 })
      .limit(10);

    const results = completed.map(match => ({
      _id: match._id,
      donorName: match.donorId?.fullName,
      recipientName: match.recipientId?.fullName,
      bloodGroup: match.donorId?.bloodGroup,
      hospitalName: match.hospitalName,
      unitsDonated: match.unitsNeeded,
      completedDate: match.requestDate
    }));

    res.json(results);
  } catch (err) {
    console.error("❌ Error fetching completed matches:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
});

// POST /matches/:requestId/complete - Mark donation as completed (admin/hospital)
app.post("/matches/:requestId/complete", async (req, res) => {
  try {
    const { requestId } = req.params;
    const { hospitalConfirmation } = req.body;

    const bloodRequest = await BloodRequest.findById(requestId);
    if (!bloodRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (bloodRequest.status !== 'matched') {
      return res.status(400).json({ message: "Request is not in matched status" });
    }

    // Update request status
    bloodRequest.status = 'completed';
    await bloodRequest.save();

    // Find and update appointment
    const appointment = await Appointment.findOne({ requestId });
    if (appointment) {
      appointment.status = 'completed';
      await appointment.save();
    }

    // Record donation
    const donation = new Donation({
      userId: bloodRequest.donorId,
      bloodGroup: bloodRequest.requestedGroup,
      hospitalName: bloodRequest.hospitalName,
      donationDate: new Date()
    });
    await donation.save();

    // Update donor's last donation date
    await User.findByIdAndUpdate(bloodRequest.donorId, {
      lastDonationDate: new Date()
    });

    console.log("🏥 HOSPITAL CONFIRMED DONATION:");
    console.log(`Request ID: ${requestId}`);
    console.log(`Donor: ${bloodRequest.donorId}`);
    console.log(`Hospital: ${bloodRequest.hospitalName}`);
    console.log(`Confirmation: ${hospitalConfirmation || 'Manual completion'}`);

    res.json({ message: "✅ Donation marked as completed" });
  } catch (err) {
    console.error("❌ Error completing donation:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
});

// GET /notifications/:userId - get notifications for user
app.get("/notifications/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// GET /notifications/:userId/unread-count - get unread notifications count
app.get("/notifications/:userId/unread-count", async (req, res) => {
  try {
    const { userId } = req.params;
    const count = await Notification.countDocuments({ userId, isRead: false });
    res.json({ count });
  } catch (err) {
    console.error("Error fetching unread count:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// PATCH /notifications/:notificationId/read - mark notification as read
app.patch("/notifications/:notificationId/read", async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findByIdAndUpdate(notificationId, { isRead: true }, { new: true });
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// DELETE /notifications/:notificationId - delete notification
app.delete("/notifications/:notificationId", async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findByIdAndDelete(notificationId);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json({ message: "Notification deleted successfully" });
  } catch (err) {
    console.error("Error deleting notification:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// PATCH /appointments/:appointmentId/confirm - confirm attendance
app.patch("/appointments/:appointmentId/confirm", async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const appointment = await Appointment.findByIdAndUpdate(appointmentId, { confirmed: true }, { new: true });
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    res.json({ message: "Attendance confirmed" });
  } catch (err) {
    console.error("Error confirming attendance:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// 👨‍⚕️ Hospital Staff - Get Upcoming Appointments
app.get("/hospital-staff/appointments/upcoming/:staffId", async (req, res) => {
  try {
    const { staffId } = req.params;

    // Get staff member and their hospital
    const staff = await User.findById(staffId);
    if (!staff || staff.role !== 'hospital_staff') {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointments = await Appointment.find({
      hospitalId: staff.hospitalId,
      appointmentDate: { $gte: today },
      status: 'scheduled'
    })
    .populate('donorId', 'fullName email phoneNumber bloodGroup')
    .populate('recipientId', 'fullName email phoneNumber')
    .populate('requestId')
    .sort({ appointmentDate: 1 });

    res.json(appointments);
  } catch (err) {
    console.error("Error fetching upcoming appointments:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// 👨‍⚕️ Hospital Staff - Confirm Donation
app.patch("/hospital-staff/appointments/:appointmentId/confirm-donation", async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { staffId, status, notes } = req.body;

    if (!['donated', 'missed'].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be 'donated' or 'missed'" });
    }

    // Get staff member
    const staff = await User.findById(staffId);
    if (!staff || staff.role !== 'hospital_staff') {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Verify staff belongs to the same hospital
    if (appointment.hospitalId.toString() !== staff.hospitalId.toString()) {
      return res.status(403).json({ message: "Staff can only manage appointments for their hospital" });
    }

    // Update appointment
    appointment.status = status;
    appointment.verifiedBy = staffId;
    appointment.verifiedHospitalId = staff.hospitalId;
    appointment.verifiedAt = new Date();
    appointment.notes = notes;
    await appointment.save();

    // If donation happened, update blood inventory and create donation record
    if (status === 'donated') {
      // Get donor's blood group
      const donor = await User.findById(appointment.donorId);
      if (donor) {
        // Update blood inventory
        let inventory = await BloodInventory.findOne({
          hospitalId: staff.hospitalId,
          bloodGroup: donor.bloodGroup
        });

        if (!inventory) {
          inventory = new BloodInventory({
            hospitalId: staff.hospitalId,
            bloodGroup: donor.bloodGroup,
            unitsAvailable: 1
          });
        } else {
          inventory.unitsAvailable += 1;
        }
        inventory.lastUpdated = new Date();
        await inventory.save();

        // Create donation record
        const donation = new Donation({
          userId: appointment.donorId,
          bloodGroup: donor.bloodGroup,
          hospitalName: appointment.hospitalName,
          hospitalId: staff.hospitalId,
          donationDate: new Date()
        });
        await donation.save();

        // Update donor's last donation date
        donor.lastDonationDate = new Date();
        await donor.save();

        // Update blood request status if linked
        if (appointment.requestId) {
          const bloodRequest = await BloodRequest.findById(appointment.requestId);
          if (bloodRequest) {
            bloodRequest.status = 'completed';
            await bloodRequest.save();

            // Notify recipient
            const notification = new Notification({
              userId: bloodRequest.recipientId,
              title: "Blood Donation Completed",
              message: `Your blood request has been fulfilled. A donor has successfully donated at ${appointment.hospitalName}.`,
              type: "donation_completed"
            });
            await notification.save();
          }
        }

        console.log("🎉 DONATION CONFIRMED:");
        console.log(`Donor: ${donor.fullName} (${donor.bloodGroup})`);
        console.log(`Hospital: ${appointment.hospitalName}`);
        console.log(`Staff: ${staff.fullName}`);
        console.log(`Blood inventory updated: +1 ${donor.bloodGroup}`);
      }
    }

    res.json({
      message: `Appointment marked as ${status}`,
      appointment: {
        id: appointment._id,
        status: appointment.status,
        verifiedBy: staff.fullName,
        verifiedAt: appointment.verifiedAt
      }
    });
  } catch (err) {
    console.error("Error confirming donation:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// 👨‍⚕️ Hospital Staff - Get Appointments for Staff's Hospital
app.get("/staff/appointments/:staffId", async (req, res) => {
  try {
    const { staffId } = req.params;

    // Get staff member and their hospital
    const staff = await User.findById(staffId);
    if (!staff || staff.role !== 'hospital_staff') {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await Appointment.find({
      hospitalId: staff.hospitalId,
      status: 'scheduled',
      appointmentDate: { $gte: today, $lt: tomorrow }
    })
    .populate('donorId', 'fullName email phoneNumber bloodGroup')
    .populate('recipientId', 'fullName email phoneNumber')
    .populate('requestId')
    .sort({ appointmentDate: 1 });

    res.json(appointments);
  } catch (err) {
    console.error("Error fetching staff appointments:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// 👨‍⚕️ Hospital Staff - Get Blood Inventory for Staff's Hospital
app.get("/staff/stock/:staffId", async (req, res) => {
  try {
    const { staffId } = req.params;

    // Get staff member and their hospital
    const staff = await User.findById(staffId);
    if (!staff || staff.role !== 'hospital_staff') {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const inventory = await BloodInventory.find({ hospitalId: staff.hospitalId })
      .sort({ bloodGroup: 1 });

    res.json(inventory);
  } catch (err) {
    console.error("Error fetching staff stock:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// 👨‍⚕️ Hospital Staff - Get Notifications for Staff's Hospital
app.get("/staff/notifications/:staffId", async (req, res) => {
  try {
    const { staffId } = req.params;

    // Get staff member and their hospital
    const staff = await User.findById(staffId);
    if (!staff || staff.role !== 'hospital_staff') {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    // Get notifications for the hospital staff user
    const notifications = await Notification.find({ userId: staffId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (err) {
    console.error("Error fetching staff notifications:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// 👨‍⚕️ Hospital Staff - Confirm Donation
app.patch("/staff/appointments/:appointmentId/confirm", async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { staffId, status, notes } = req.body;

    if (!['donated', 'missed'].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be 'donated' or 'missed'" });
    }

    // Get staff member
    const staff = await User.findById(staffId);
    if (!staff || staff.role !== 'hospital_staff') {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Verify staff belongs to the same hospital
    if (appointment.hospitalId.toString() !== staff.hospitalId.toString()) {
      return res.status(403).json({ message: "Staff can only manage appointments for their hospital" });
    }

    // Update appointment
    appointment.status = status;
    appointment.verifiedBy = staffId;
    appointment.verifiedHospitalId = staff.hospitalId;
    appointment.verifiedAt = new Date();
    appointment.notes = notes;
    await appointment.save();

    // If donation happened, update blood inventory and create donation record
    if (status === 'donated') {
      // Get donor's blood group
      const donor = await User.findById(appointment.donorId);
      if (donor) {
        // Update blood inventory
        let inventory = await BloodInventory.findOne({
          hospitalId: staff.hospitalId,
          bloodGroup: donor.bloodGroup
        });

        if (!inventory) {
          inventory = new BloodInventory({
            hospitalId: staff.hospitalId,
            bloodGroup: donor.bloodGroup,
            unitsAvailable: 1
          });
        } else {
          inventory.unitsAvailable += 1;
        }
        inventory.lastUpdated = new Date();
        await inventory.save();

        // Create donation record
        const donation = new Donation({
          userId: appointment.donorId,
          bloodGroup: donor.bloodGroup,
          hospitalName: appointment.hospitalName,
          hospitalId: staff.hospitalId,
          donationDate: new Date()
        });
        await donation.save();

        // Update donor's last donation date
        donor.lastDonationDate = new Date();
        await donor.save();

        // Update blood request status if linked
        if (appointment.requestId) {
          const bloodRequest = await BloodRequest.findById(appointment.requestId);
          if (bloodRequest) {
            bloodRequest.status = 'completed';
            await bloodRequest.save();

            // Notify recipient
            const notification = new Notification({
              userId: bloodRequest.recipientId,
              title: "Blood Donation Completed",
              message: `Your blood request has been fulfilled. A donor has successfully donated at ${appointment.hospitalName}.`,
              type: "donation_completed"
            });
            await notification.save();
          }
        }

        // Create notification for hospital staff
        const staffNotification = new Notification({
          userId: staffId,
          title: "Donation Verified",
          message: `Donation from ${donor.fullName} (${donor.bloodGroup}) has been verified and inventory updated.`,
          type: "donation_verified"
        });
        await staffNotification.save();

        console.log("🎉 DONATION CONFIRMED:");
        console.log(`Donor: ${donor.fullName} (${donor.bloodGroup})`);
        console.log(`Hospital: ${appointment.hospitalName}`);
        console.log(`Staff: ${staff.fullName}`);
        console.log(`Blood inventory updated: +1 ${donor.bloodGroup}`);
      }
    } else if (status === 'missed') {
      // Create notification for missed appointment
      const staffNotification = new Notification({
        userId: staffId,
        title: "Missed Appointment",
        message: `Appointment was marked as missed. Donor did not show up.`,
        type: "appointment_missed"
      });
      await staffNotification.save();
    }

    res.json({
      message: `Appointment marked as ${status}`,
      appointment: {
        id: appointment._id,
        status: appointment.status,
        verifiedBy: staff.fullName,
        verifiedAt: appointment.verifiedAt
      }
    });
  } catch (err) {
    console.error("Error confirming donation:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// 👨‍⚕️ Hospital Staff - Adjust Blood Stock
app.post("/staff/stock/adjust", async (req, res) => {
  try {
    const { staffId, bloodGroup, adjustment, reason } = req.body;

    if (!bloodGroup || typeof adjustment !== 'number') {
      return res.status(400).json({ message: "bloodGroup and adjustment (number) are required" });
    }

    // Get staff member
    const staff = await User.findById(staffId);
    if (!staff || staff.role !== 'hospital_staff') {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    // Only supervisors can adjust stock manually
    if (staff.staffRole !== 'supervisor') {
      return res.status(403).json({ message: "Only supervisors can manually adjust stock" });
    }

    let inventory = await BloodInventory.findOne({
      hospitalId: staff.hospitalId,
      bloodGroup: bloodGroup
    });

    if (!inventory) {
      if (adjustment > 0) {
        inventory = new BloodInventory({
          hospitalId: staff.hospitalId,
          bloodGroup: bloodGroup,
          unitsAvailable: adjustment
        });
      } else {
        return res.status(400).json({ message: "Cannot reduce stock for non-existent blood group" });
      }
    } else {
      const newUnits = inventory.unitsAvailable + adjustment;
      if (newUnits < 0) {
        return res.status(400).json({ message: "Cannot reduce stock below zero" });
      }
      inventory.unitsAvailable = newUnits;
    }

    inventory.lastUpdated = new Date();
    await inventory.save();

    // Log the adjustment
    console.log("📊 STOCK ADJUSTMENT:");
    console.log(`Hospital: ${staff.hospitalId}`);
    console.log(`Blood Group: ${bloodGroup}`);
    console.log(`Adjustment: ${adjustment > 0 ? '+' : ''}${adjustment}`);
    console.log(`Reason: ${reason || 'Manual adjustment'}`);
    console.log(`Staff: ${staff.fullName}`);

    // Create notification for staff
    const notification = new Notification({
      userId: staffId,
      title: "Stock Adjusted",
      message: `${bloodGroup} inventory ${adjustment > 0 ? 'increased' : 'decreased'} by ${Math.abs(adjustment)} units.`,
      type: "stock_adjustment"
    });
    await notification.save();

    res.json({
      message: "Stock adjusted successfully",
      inventory: {
        bloodGroup: inventory.bloodGroup,
        unitsAvailable: inventory.unitsAvailable,
        lastUpdated: inventory.lastUpdated
      }
    });
  } catch (err) {
    console.error("Error adjusting stock:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// 🏥 Hospital Routes

// Middleware to check if user is hospital
const requireHospitalRole = (req, res, next) => {
  if (req.user.role !== 'hospital') {
    return res.status(403).json({ message: 'Access denied. Hospital role required.' });
  }
  if (!req.user.hospitalId) {
    return res.status(403).json({ message: 'Hospital ID not assigned to user.' });
  }
  next();
};

// 🏥 Hospital - Get Appointments for Hospital
app.get("/hospital/appointments", authenticateToken, requireHospitalRole, async (req, res) => {
  try {
    const { hospitalId } = req.query;
    console.log('hospitalId from query:', hospitalId);
    console.log('req.user.hospitalId:', req.user.hospitalId);

    if (!hospitalId || !req.user.hospitalId || hospitalId !== req.user.hospitalId.toString()) {
      console.log('Hospital ID mismatch or not found');
      return res.status(403).json({ message: 'Hospital ID mismatch or not found' });
    }

    console.log('Finding appointments for hospitalId:', new mongoose.Types.ObjectId(hospitalId));
    const appointments = await Appointment.find({ hospitalId: new mongoose.Types.ObjectId(hospitalId) })
      .populate('donorId', 'fullName email phoneNumber bloodGroup')
      .populate('recipientId', 'fullName email phoneNumber')
      .populate('requestId')
      .sort({ appointmentDate: 1 });

    console.log('Appointments found:', appointments.length);
    res.json(appointments);
  } catch (err) {
    console.error("Error fetching hospital appointments:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// 🏥 Hospital - Get My Appointments
app.get("/hospital/my-appointments", authenticateToken, requireHospitalRole, async (req, res) => {
  try {
    const appointments = await Appointment.find({ hospitalId: req.user.hospitalId })
      .populate('donorId', 'fullName email phoneNumber bloodGroup')
      .populate('recipientId', 'fullName email phoneNumber')
      .populate('requestId')
      .sort({ appointmentDate: 1 });

    res.json(appointments);
  } catch (err) {
    console.error("Error fetching hospital appointments:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// 🏥 Hospital - Update Appointment Status
app.patch("/hospital/appointments/:appointmentId/status", authenticateToken, requireHospitalRole, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status, notes, hospitalId } = req.body;

    if (!hospitalId || !req.user.hospitalId || hospitalId !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Hospital ID mismatch or not found' });
    }

    if (!['scheduled', 'checked_in', 'collected', 'donated', 'missed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Verify appointment belongs to user's hospital
    if (appointment.hospitalId.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: "Access denied. Appointment not for your hospital." });
    }

    appointment.status = status;
    appointment.verifiedBy = req.user._id;
    appointment.verifiedHospitalId = req.user.hospitalId;
    appointment.verifiedAt = new Date();
    appointment.notes = notes;
    await appointment.save();

    // If donated, update blood inventory and create donation record (only for general donations, not direct donor-to-recipient)
    if (status === 'donated') {
      const donor = await User.findById(appointment.donorId);
      if (donor) {
        // Only update blood inventory if this is not a direct donor-to-recipient donation
        if (!appointment.recipientId) {
          // Update blood inventory
          let inventory = await BloodInventory.findOne({
            hospitalId: req.user.hospitalId,
            bloodGroup: donor.bloodGroup
          });

          if (!inventory) {
            inventory = new BloodInventory({
              hospitalId: req.user.hospitalId,
              bloodGroup: donor.bloodGroup,
              unitsAvailable: 1
            });
          } else {
            inventory.unitsAvailable += 1;
          }
          inventory.lastUpdated = new Date();
          await inventory.save();
        }

        // Create donation record
        const donation = new Donation({
          userId: appointment.donorId,
          bloodGroup: donor.bloodGroup,
          hospitalName: appointment.hospitalName,
          hospitalId: req.user.hospitalId,
          donationDate: new Date()
        });
        await donation.save();

        // Update donor's last donation date
        donor.lastDonationDate = new Date();
        await donor.save();

        // Update blood request status if linked
        if (appointment.requestId) {
          const bloodRequest = await BloodRequest.findById(appointment.requestId);
          if (bloodRequest) {
            bloodRequest.status = 'completed';
            await bloodRequest.save();

            // Notify recipient
            const notification = new Notification({
              userId: bloodRequest.recipientId,
              title: "Blood Donation Completed",
              message: `Your blood request has been fulfilled. A donor has successfully donated at ${appointment.hospitalName}.`,
              type: "donation_completed"
            });
            await notification.save();
          }
        }

        // Create audit log
        const auditLog = new AuditLog({
          adminId: req.user._id,
          action: 'donation_completed',
          targetType: 'appointment',
          targetId: appointment._id,
          details: {
            donorId: appointment.donorId,
            bloodGroup: donor.bloodGroup,
            hospitalId: req.user.hospitalId,
            notes: notes
          }
        });
        await auditLog.save();

        console.log("🎉 DONATION CONFIRMED BY HOSPITAL:");
        console.log(`Donor: ${donor.fullName} (${donor.bloodGroup})`);
        console.log(`Hospital: ${appointment.hospitalName}`);
        console.log(`Verified by: ${req.user.fullName}`);
        console.log(`Blood inventory updated: +1 ${donor.bloodGroup}`);
      }
    }

    res.json({
      message: `Appointment marked as ${status}`,
      appointment: {
        id: appointment._id,
        status: appointment.status,
        verifiedBy: req.user.fullName,
        verifiedAt: appointment.verifiedAt
      }
    });
  } catch (err) {
    console.error("Error updating appointment status:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// 🏥 Hospital - Get Blood Inventory for Hospital
app.get("/hospital/stock", authenticateToken, requireHospitalRole, async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;

    const inventory = await BloodInventory.find({ hospitalId })
      .sort({ bloodGroup: 1 });

    res.json(inventory);
  } catch (err) {
    console.error("Error fetching hospital stock:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// 🏥 Hospital - Get Plasma Inventory for Hospital
app.get("/hospital/plasma-stock", authenticateToken, requireHospitalRole, async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;

    const inventory = await PlasmaInventory.find({ hospitalId })
      .sort({ bloodGroup: 1 });

    res.json(inventory);
  } catch (err) {
    console.error("Error fetching hospital plasma stock:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// 🏥 Hospital - Get Accepted/Matched Requests for Hospital
app.get("/hospital/requests/accepted", authenticateToken, requireHospitalRole, async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;

    // Find requests that are accepted/matched and belong to this hospital
    const requests = await BloodRequest.find({
      hospitalName: { $exists: true },
      status: { $in: ['accepted', 'matched'] }
    })
    .populate('recipientId', 'fullName email phoneNumber city state')
    .populate('donorId', 'fullName email phoneNumber bloodGroup')
    .sort({ requestDate: -1 });

    // Filter requests that belong to this hospital (by hospital name matching)
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    const hospitalRequests = requests.filter(request =>
      request.hospitalName && request.hospitalName.toLowerCase().includes(hospital.name.toLowerCase())
    );

    const results = hospitalRequests.map(request => ({
      _id: request._id,
      recipientId: request.recipientId?._id,
      donorId: request.donorId?._id,
      requestedGroup: request.requestedGroup,
      unitsNeeded: request.unitsNeeded,
      urgencyLevel: request.urgencyLevel,
      purpose: request.purpose,
      hospitalName: request.hospitalName,
      hospitalAddress: request.hospitalAddress,
      contactPerson: request.contactPerson,
      contactNumber: request.contactNumber,
      doctorName: request.doctorName,
      medicalCondition: request.medicalCondition,
      requiredDate: request.requiredDate,
      additionalNotes: request.additionalNotes,
      patientAge: request.patientAge,
      patientGender: request.patientGender,
      hemoglobinLevel: request.hemoglobinLevel,
      patientName: request.patientName,
      email: request.email,
      status: request.status,
      requestDate: request.requestDate,
      recipient_name: request.recipientId?.fullName,
      recipient_email: request.recipientId?.email,
      recipient_phone: request.recipientId?.phoneNumber,
      recipient_city: request.recipientId?.city,
      recipient_state: request.recipientId?.state,
      donor_name: request.donorId?.fullName,
      donor_email: request.donorId?.email,
      donor_phone: request.donorId?.phoneNumber,
      donor_bloodGroup: request.donorId?.bloodGroup
    }));

    res.json(results);
  } catch (err) {
    console.error("❌ Error fetching accepted requests:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
});

// 🏥 Hospital - Mark Request as Completed
app.patch("/hospital/requests/:requestId/complete", authenticateToken, requireHospitalRole, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { hospitalId } = req.body;

    if (!hospitalId || !req.user.hospitalId || hospitalId !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Hospital ID mismatch or not found' });
    }

    const bloodRequest = await BloodRequest.findById(requestId);
    if (!bloodRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Verify request belongs to user's hospital
    const hospital = await Hospital.findById(req.user.hospitalId);
    if (!hospital || !bloodRequest.hospitalName.toLowerCase().includes(hospital.name.toLowerCase())) {
      return res.status(403).json({ message: "Access denied. Request not for your hospital." });
    }

    if (!['accepted', 'matched'].includes(bloodRequest.status)) {
      return res.status(400).json({ message: "Request is not in accepted/matched status" });
    }

    // Update request status to completed
    bloodRequest.status = 'completed';
    await bloodRequest.save();

    // Update blood inventory
    if (bloodRequest.donorId) {
      const donor = await User.findById(bloodRequest.donorId);
      if (donor && donor.bloodGroup) {
        let inventory = await BloodInventory.findOne({
          hospitalId: req.user.hospitalId,
          bloodGroup: donor.bloodGroup
        });

        if (!inventory) {
          inventory = new BloodInventory({
            hospitalId: req.user.hospitalId,
            bloodGroup: donor.bloodGroup,
            unitsAvailable: bloodRequest.unitsNeeded
          });
        } else {
          inventory.unitsAvailable += bloodRequest.unitsNeeded;
        }
        inventory.lastUpdated = new Date();
        await inventory.save();
      }
    }

    // Record donation
    if (bloodRequest.donorId) {
      const donation = new Donation({
        userId: bloodRequest.donorId,
        bloodGroup: bloodRequest.requestedGroup,
        hospitalName: bloodRequest.hospitalName,
        hospitalId: req.user.hospitalId,
        donationDate: new Date()
      });
      await donation.save();

      // Update donor's last donation date
      await User.findByIdAndUpdate(bloodRequest.donorId, {
        lastDonationDate: new Date()
      });
    }

    // Create audit log
    const auditLog = new AuditLog({
      adminId: req.user._id,
      action: 'donation_completed',
      targetType: 'blood_request',
      targetId: bloodRequest._id,
      details: {
        donorId: bloodRequest.donorId,
        recipientId: bloodRequest.recipientId,
        bloodGroup: bloodRequest.requestedGroup,
        unitsNeeded: bloodRequest.unitsNeeded,
        hospitalId: req.user.hospitalId
      }
    });
    await auditLog.save();

    // Notify recipient
    if (bloodRequest.recipientId) {
      const notification = new Notification({
        userId: bloodRequest.recipientId,
        title: "Blood Donation Completed",
        message: `Your blood request has been fulfilled. A donor has successfully donated at ${bloodRequest.hospitalName}.`,
        type: "donation_completed"
      });
      await notification.save();
    }

    console.log("🏥 HOSPITAL COMPLETED DONATION:");
    console.log(`Request ID: ${requestId}`);
    console.log(`Donor: ${bloodRequest.donorId}`);
    console.log(`Recipient: ${bloodRequest.recipientId}`);
    console.log(`Hospital: ${bloodRequest.hospitalName}`);
    console.log(`Units: ${bloodRequest.unitsNeeded}`);
    console.log(`Verified by: ${req.user.fullName}`);

    res.json({
      message: "✅ Donation marked as completed",
      request: {
        id: bloodRequest._id,
        status: bloodRequest.status
      }
    });
  } catch (err) {
    console.error("❌ Error completing donation:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
});



// Google OAuth login endpoint
app.post("/auth/google-login", async (req, res) => {
  try {
    const { email, googleId } = req.body;

    if (!email || !googleId) {
      return res.status(400).json({ message: "Email and Google ID are required" });
    }

    // Find user by email and Google ID
    let user = await User.findOne({ email, oauthId: googleId, provider: 'google' });

    if (!user) {
      // Check if user exists with same email but different auth method
      user = await User.findOne({ email });
      if (user) {
        // Link Google OAuth to existing account
        user.oauthId = googleId;
        user.provider = 'google'; // Keep as google since they used Google login
        await user.save();
      } else {
        return res.status(404).json({ message: "Google account not found. Please sign up first." });
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.fullName,
        role: user.role,
        bloodGroup: user.bloodGroup,
        hasPassword: !!user.password,
        hasOAuth: !!user.oauthId
      },
      accessToken,
      refreshToken
    });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

// Google OAuth check user endpoint
app.post("/auth/google/check-user", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });

    if (user) {
      return res.json({
        exists: true,
        hasPassword: !!user.password,
        hasOAuth: !!user.oauthId,
        provider: user.provider
      });
    } else {
      return res.json({ exists: false });
    }
  } catch (err) {
    console.error("Check user error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Set password for OAuth users
app.post("/auth/set-password", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password set successfully" });
  } catch (err) {
    console.error("Set password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Google OAuth complete signup endpoint
app.post("/auth/google/complete-signup", async (req, res) => {
  try {
    const {
      email, fullName, googleId, googleToken,
      dateOfBirth, gender, phoneNumber, otp,
      street, city, state, pincode, role,
      bloodGroup, willingToDonatePlasma, lastDonationDate, weight, healthConditions
    } = req.body;

    // Validate required fields
    if (!email || !fullName || !googleId || !googleToken) {
      return res.status(400).json({ message: "Missing required Google OAuth data" });
    }

    if (!dateOfBirth || !gender || !phoneNumber || !street || !city || !state || !pincode || !role) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    // Create new user with complete profile
    user = new User({
      email,
      fullName,
      dateOfBirth,
      gender,
      phoneNumber,
      street,
      city,
      state,
      pincode,
      role,
      oauthId: googleId,
      provider: 'google',
      bloodGroup: role === 'donor' ? bloodGroup : null,
      willingToDonatePlasma: role === 'donor' ? willingToDonatePlasma : null,
      lastDonationDate: role === 'donor' ? lastDonationDate : null,
      weight: role === 'donor' ? weight : null,
      healthConditions: role === 'donor' ? healthConditions : [],
      requiredBloodGroup: role === 'recipient' ? bloodGroup : null
    });

    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      message: "✅ Google signup completed successfully!",
      user: {
        id: user._id,
        email: user.email,
        name: user.fullName,
        role: user.role,
        bloodGroup: user.bloodGroup
      },
      accessToken,
      refreshToken
    });
  } catch (err) {
    console.error("Google complete signup error:", err);
    res.status(500).json({ message: "Signup failed" });
  }
});

// Google OAuth login endpoint
app.post("/auth/google", async (req, res) => {
  try {
    const { email, name, googleId } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user
      user = new User({
        email,
        fullName: name,
        oauthId: googleId,
        provider: 'google',
        role: 'donor', // Default role
        bloodGroup: 'Not specified',
        phoneNumber: '',
        street: '',
        city: '',
        state: '',
        pincode: '',
        lastDonationDate: null
      });
      await user.save();
    } else {
      // Update OAuth info if not present
      if (!user.oauthId) {
        user.oauthId = googleId;
        user.provider = 'google';
        await user.save();
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.fullName,
        role: user.role,
        bloodGroup: user.bloodGroup
      },
      accessToken,
      refreshToken
    });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(500).json({ message: "Authentication failed" });
  }
});

// Start the donation reminder scheduler
startReminderScheduler();

// Start the expiry reminder scheduler
startExpiryReminderScheduler();

// Manual trigger endpoint for testing (admin only)
app.post("/admin/trigger-reminders", async (req, res) => {
  try {
    console.log("🔧 Manual reminder trigger requested");
    const result = await triggerManualReminderCheck();
    res.json({
      message: "✅ Manual reminder check completed",
      result: result
    });
  } catch (error) {
    console.error("❌ Manual reminder trigger failed:", error);
    res.status(500).json({
      message: "❌ Manual reminder trigger failed",
      error: error.message
    });
  }
});

// Manual trigger endpoint for expiry reminders (admin only)
app.post("/admin/trigger-expiry-reminders", async (req, res) => {
  try {
    console.log("🔧 Manual expiry reminder trigger requested");
    const result = await triggerManualExpiryCheck();
    res.json({
      message: "✅ Manual expiry reminder check completed",
      result: result
    });
  } catch (error) {
    console.error("❌ Manual expiry reminder trigger failed:", error);
    res.status(500).json({
      message: "❌ Manual expiry reminder trigger failed",
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log("🔧 Admin routes available at /admin/*");
  console.log("👨‍⚕️ Hospital staff routes available at /staff/*");
  console.log("🏥 Hospital routes available at /hospital/*");
  console.log("📧 Donation reminder scheduler started - runs daily at 9:00 AM");
  console.log("⏰ Expiry reminder scheduler started - runs daily at 8:00 AM");
});
