import mongoose from "mongoose";

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  city: String,
  pincode: String,
  address: String,
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Hospital = mongoose.model('Hospital', hospitalSchema);

export default Hospital;
