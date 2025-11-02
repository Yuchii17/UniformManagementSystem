const Notification = require('../models/Notification');
const User = require('../models/User');

exports.notifyNewUniform = async (uniform) => {
  try {
    const users = await User.find({
      $or: [
        { gender: uniform.gender },
        { gender: 'Unisex' }
      ],
      yearLevel: uniform.yearLevel || { $exists: true }
    });

    for (const user of users) {
      await Notification.create({
        user: user._id,
        message: `A new ${uniform.category} - ${uniform.type} (${uniform.size}) uniform is now available!`,
        uniform: uniform._id
      });
    }

    console.log(`Notifications created for ${users.length} users`);
  } catch (error) {
    console.error('Error creating uniform notifications:', error);
  }
};

exports.getUserNotifications = async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const userId = req.session.user._id;

    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate({ path: 'uniform', select: 'image', strictPopulate: false });

    const formattedNotifications = notifications.map(n => ({
      _id: n._id,
      message: n.message,
      isRead: n.isRead,
      uniformImage: n.uniform ? n.uniform.image : '/images/uniform.jpg',
      createdAt: n.createdAt
    }));

    res.json({ success: true, notifications: formattedNotifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications', error: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { isRead: true });
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.notifyAdmins = async (message, uniformId = null) => {
  try {
    const admins = await User.find({ role: 'admin' });
    const superAdmin = { _id: 'superadmin', email: 'superadmin@school.com' };
    admins.push(superAdmin);

    const notifications = admins.map(admin => ({
      user: admin._id,
      message,
      uniform: uniformId
    }));

    if (notifications.length > 0) await Notification.insertMany(notifications);
  } catch (err) {
    console.error('Error notifying admins:', err);
  }
};

exports.getAdminNotifications = async (req, res) => {
  try {
    const userId = req.session.user._id || 'superadmin';
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate({ path: 'uniform', select: 'image', strictPopulate: false });

    const formatted = notifications.map(n => ({
      _id: n._id,
      message: n.message,
      isRead: n.isRead,
      uniformImage: n.uniform?.image || '/images/uniform.jpg',
      createdAt: n.createdAt
    }));

    res.json({ success: true, notifications: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, notifications: [] });
  }
};

exports.cleanOldNotifications = async () => {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await Notification.deleteMany({ createdAt: { $lt: cutoff } });
  } catch (err) {
    console.error('Error cleaning old notifications:', err);
  }
};