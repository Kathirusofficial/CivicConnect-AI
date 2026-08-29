const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Citizen', 'Admin', 'Government', 'Worker'], default: 'Citizen' },
  mobile: { type: String },
  avatar: { type: String },
  state: { type: String },
  city: { type: String },
  address: { type: String },
  pinCode: { type: String },
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
}, { timestamps: true });

// Pre-save hashing (Mongoose v9 style - no next() needed)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (err) {
    return enteredPassword === this.password;
  }
};

module.exports = mongoose.model('User', userSchema);
