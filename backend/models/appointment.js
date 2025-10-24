import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodRequest' },
  appointmentDate: { type: Date, required: true },
  appointmentTime: String,
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  hospitalName: String,
  hospitalAddress: String,
  status: { type: String, enum: ['scheduled', 'checked_in', 'collected', 'donated', 'missed', 'cancelled'], default: 'scheduled' },
  confirmed: { type: Boolean, default: false },
  // Verification fields for hospital staff
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // hospital staff who verified
  verifiedHospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  verifiedAt: Date,
  notes: String, // additional notes from hospital staff
  createdAt: { type: Date, default: Date.now }
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;
