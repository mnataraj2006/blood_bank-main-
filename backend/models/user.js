import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  role: { type: String, enum: ['donor', 'recipient', 'hospital_staff', 'hospital'], required: true },
  fullName: String,
  dateOfBirth: Date,
  gender: String,
  email: { type: String, unique: true, required: true },
  phoneNumber: String,
  password: { type: String }, // Optional for OAuth users, can coexist with oauthId
  oauthId: String, // For OAuth providers
  provider: { type: String, enum: ['local', 'google', 'facebook'], default: 'local' },
  street: String,
  city: String,
  state: String,
  pincode: String,
  bloodGroup: String,
  willingToDonatePlasma: Boolean,
  lastDonationDate: Date,
  weight: Number,
  healthConditions: [String],
  requiredBloodGroup: String,
  purpose: String,
  hospitalName: String,
  prescription: String,
  // Hospital staff specific fields
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  staffRole: String, // e.g., 'nurse', 'doctor', 'administrator'
  profileImage: String, // Base64 encoded image
  lastReminderSent: Date, // Track when the last donation reminder was sent
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

export default User;
