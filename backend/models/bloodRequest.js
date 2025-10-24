import mongoose from "mongoose";

const bloodRequestSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  requestedGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], required: true },
  unitsNeeded: { type: Number, required: true },
  urgencyLevel: { type: String, enum: ['low', 'moderate', 'high', 'critical'], default: 'moderate' },
  purpose: String,
  hospitalName: String,
  hospitalAddress: String,
  contactPerson: String,
  contactNumber: String,
  doctorName: String,
  medicalCondition: String,
  requiredDate: Date,
  additionalNotes: String,
  patientAge: Number,
  patientGender: { type: String, enum: ['male', 'female', 'other'] },
  hemoglobinLevel: Number,
  patientName: String,
  email: String,
  status: { type: String, enum: ['pending', 'accepted', 'matched', 'completed', 'cancelled'], default: 'pending' },
  donor_response: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  recipient_status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  requestDate: { type: Date, default: Date.now }
});

const BloodRequest = mongoose.model('BloodRequest', bloodRequestSchema);

export default BloodRequest;
