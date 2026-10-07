const mongoose = require('mongoose');

const complaintSupportSchema = new mongoose.Schema({
  complaintId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Complaint', 
    required: true, 
    index: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  }
}, { timestamps: true });

// Unique compound index: a citizen can support a complaint only once
complaintSupportSchema.index({ complaintId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('ComplaintSupport', complaintSupportSchema);
