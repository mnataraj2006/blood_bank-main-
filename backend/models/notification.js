import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['response_accepted', 'appointment_reminder', 'donor_accepted', 'donation_completed', 'request_accepted'], required: true },
  title: String,
  message: String,
  hospitalName: String,
  appointmentTime: String,
  patientName: String,
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodRequest' },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
