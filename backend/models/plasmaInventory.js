import mongoose from "mongoose";

const plasmaInventorySchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], required: true },
  unitsAvailable: { type: Number, default: 0 },
  expiryDate: { type: Date, required: true },
  lastUpdated: { type: Date, default: Date.now },
  sourceBloodUnitId: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodInventory' }, // Reference to original blood unit
  separatedDate: { type: Date, default: Date.now } // When plasma was separated from blood
});

const PlasmaInventory = mongoose.model('PlasmaInventory', plasmaInventorySchema);

export default PlasmaInventory;
