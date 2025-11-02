const mongoose = require('mongoose');
const { Schema } = mongoose;

const NotificationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  uniform: { type: Schema.Types.ObjectId, ref: 'Uniform' },
  createdAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now, expires: '24h' }
});

module.exports = mongoose.model('Notification', NotificationSchema);
