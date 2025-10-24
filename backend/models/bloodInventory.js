import mongoose from "mongoose";

const bloodInventorySchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], required: true },
  unitsAvailable: { type: Number, default: 0 },
  expiryDate: { type: Date },
  lastUpdated: { type: Date, default: Date.now }
});

const BloodInventory = mongoose.model('BloodInventory', bloodInventorySchema);

export default BloodInventory;
