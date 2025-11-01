const mongoose = require('mongoose');

const UniformRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uniform: { type: mongoose.Schema.Types.ObjectId, ref: 'Uniform', required: true },
  orfImage: { type: String, default: null },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled'], 
    default: 'Pending' 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UniformRequest', UniformRequestSchema);
