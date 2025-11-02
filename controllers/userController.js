const Uniform = require('../models/Uniform');
const UniformRequest = require('../models/UniformRequest');
const Notification = require('../models/Notification');
const User = require('../models/User');
const emailService = require('../utils/emailService');

exports.requestUniform = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Please log in to request a uniform.' });
    }

    const userId = req.session.user._id;
    const { uniformId } = req.body;

    const uniform = await Uniform.findById(uniformId);
    if (!uniform) return res.status(404).json({ success: false, message: 'Uniform not found.' });

    const existingActiveRequest = await UniformRequest.findOne({
      user: userId,
      status: { $in: ['Pending', 'Approved'] }
    }).populate('uniform');

    if (
      existingActiveRequest &&
      existingActiveRequest.uniform.category === uniform.category &&
      existingActiveRequest.uniform.type === uniform.type
    ) {
      return res.status(400).json({
        success: false,
        message: `You already have a ${uniform.type} request for ${uniform.category}.`
      });
    }

    const completedRequests = await UniformRequest.find({ user: userId, status: 'Completed' }).populate('uniform');
    const completedInCategory = completedRequests.filter(r => r.uniform.category === uniform.category);
    if (completedInCategory.some(r => r.uniform.type === 'Top') && completedInCategory.some(r => r.uniform.type === 'Bottom')) {
      return res.status(400).json({
        success: false,
        message: `You have already completed both Top and Bottom for ${uniform.category}.`
      });
    }

    const newRequest = new UniformRequest({
      user: userId,
      uniform: uniformId,
      status: 'Pending',
      orfImage: req.file ? `/uploads/orf/${req.file.filename}` : null
    });
    await newRequest.save();

    await emailService.sendUniformRequestNotification(req.session.user.email, uniform);

    const admins = await User.find({ role: 'Admin' });

    const notifications = admins.map(admin => ({
      user: admin._id,
      message: `New uniform request from ${req.session.user.firstName} ${req.session.user.lastName} for ${uniform.category} - ${uniform.type}`,
      uniform: uniform._id
    }));

    const insertedNotifications = await Notification.insertMany(notifications);

    const recentNotifications = await Notification.find({ _id: { $in: insertedNotifications.map(n => n._id) } })
      .populate({ path: 'uniform', select: 'image' });

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await Notification.deleteMany({ createdAt: { $lt: yesterday } });

    res.status(200).json({
      success: true,
      message: `Your request for ${uniform.category} - ${uniform.type} has been submitted successfully.`,
      notifications: recentNotifications
    });

  } catch (error) {
    console.error('Error requesting uniform:', error);
    res.status(500).json({ success: false, message: 'Server error while processing uniform request.' });
  }
};

exports.cancelUniformRequest = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Please log in to cancel a request.' });
    }

    const userId = req.session.user._id;
    const { requestId } = req.body;

    const request = await UniformRequest.findOne({ _id: requestId, user: userId }).populate('uniform');
    if (!request) return res.status(404).json({ success: false, message: 'Uniform request not found.' });
    if (request.status !== 'Pending') return res.status(400).json({ success: false, message: 'Only pending requests can be cancelled.' });

    request.status = 'Cancelled';
    await request.save();

    const admins = await User.find({ role: 'Admin' });

    const notifications = admins.map(admin => ({
      user: admin._id,
      message: `${req.session.user.firstName} ${req.session.user.lastName} cancelled their uniform request for ${request.uniform.category} - ${request.uniform.type}`,
      uniform: request.uniform._id
    }));

    const insertedNotifications = await Notification.insertMany(notifications);

    const recentNotifications = await Notification.find({ _id: { $in: insertedNotifications.map(n => n._id) } })
      .populate({ path: 'uniform', select: 'image' });

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await Notification.deleteMany({ createdAt: { $lt: yesterday } });

    res.status(200).json({
      success: true,
      message: 'Uniform request cancelled successfully.',
      notifications: recentNotifications
    });

  } catch (error) {
    console.error('Error cancelling uniform request:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate({ path: 'uniform', select: 'image', strictPopulate: false });

    const formatted = notifications.map(n => ({
      _id: n._id,
      message: n.message,
      isRead: n.isRead,
      uniformImage: n.uniform?.image || '/images/uniform.jpg',
      createdAt: n.createdAt
    }));

    res.json({ success: true, notifications: formatted });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
