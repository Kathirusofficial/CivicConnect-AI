const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const workerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { 
    type: String, 
    unique: true, 
    sparse: true, 
    lowercase: true,
    trim: true
  },
  password: { type: String },
  employeeId: { 
    type: String, 
    unique: true, 
    sparse: true,
    trim: true
  },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  status: { type: String, enum: ['Available', 'Busy', 'Offline'], default: 'Available' },
  contact: { type: String },
  avatar: { type: String }
}, { timestamps: true });

// Pre-save password hashing
workerSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
workerSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (err) {
    return enteredPassword === this.password;
  }
};

module.exports = mongoose.model('Worker', workerSchema);
