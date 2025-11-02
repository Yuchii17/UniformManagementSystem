const User = require('../models/User');
const Uniform = require('../models/Uniform');
const fs = require('fs');
const path = require('path');
const UniformRequest = require('../models/UniformRequest');
const emailService = require('../utils/emailService');
const Notification = require('../models/Notification');
const { notifyNewUniform } = require('./notificationController');

exports.dashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalUniforms = await Uniform.countDocuments();
    const totalRequests = await UniformRequest.countDocuments();

    const pendingRequests = await UniformRequest.countDocuments({ status: { $regex: /^pending$/i } });
    const approvedRequests = await UniformRequest.countDocuments({ status: { $regex: /^approved$/i } });
    const rejectedRequests = await UniformRequest.countDocuments({ status: { $regex: /^(rejected|processed)$/i } });
    const completedRequests = await UniformRequest.countDocuments({ status: { $regex: /^completed$/i } });
    const cancelledRequests = await UniformRequest.countDocuments({ status: { $regex: /^cancelled$/i } });

    const kpis = {
      totalUsers,
      totalUniforms,
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      completedRequests,
      cancelledRequests
    };

    const usersPerCourse = await User.aggregate([
      { $group: { _id: "$course", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const usersPerYear = await User.aggregate([
      { $group: { _id: "$yearLevel", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.render('admin/index', { 
      session: req.session, 
      kpis, 
      usersPerCourse, 
      usersPerYear 
    });

  } catch (error) {
    console.error('❌ Error loading dashboard:', error);
    res.status(500).send('Server Error');
  }
};

exports.collections = async (req, res) => {
  try {
    const uniforms = await Uniform.find().sort({ createdAt: -1 });
    res.render("admin/collection", {
      uniforms,
      user: req.session.user || null
    });
  } catch (err) {
    console.error("Error fetching uniforms:", err);
    res.status(500).send("Server Error");
  }
};

exports.uniformPage = async (req, res) => {
  try {
    const uniforms = await Uniform.find();
    res.render('admin/uniform', { uniforms, session: req.session });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading uniforms.');
  }
};

exports.toggleAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { availability } = req.body;
    const uniform = await Uniform.findByIdAndUpdate(id, { availability }, { new: true });
    if (!uniform) return res.status(404).json({ success: false, message: "Uniform not found" });
    res.json({ success: true, message: `Uniform is now ${availability}`, newAvailability: uniform.availability });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.editUniform = async (req, res) => {
  try {
    const { id, category, type, availability } = req.body;
    const updateData = { category, type, availability };
    if (req.file) updateData.image = `/uploads/${req.file.filename}`;
    await Uniform.findByIdAndUpdate(id, updateData);
    res.json({ success: true, message: "Uniform updated successfully!" });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Failed to update uniform." });
  }
};

exports.deleteUniform = async (req, res) => {
  try {
    const uniformId = req.params.id;
    const uniform = await Uniform.findById(uniformId);
    if (!uniform) return res.status(404).json({ success: false, message: 'Uniform not found.' });
    if (uniform.image) {
      const imgPath = path.join(__dirname, '../public', uniform.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    await Uniform.findByIdAndDelete(uniformId);
    res.status(200).json({ success: true, message: 'Uniform deleted successfully!', deletedId: uniformId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createUniform = async (req, res) => {
  try {
    const { category, type, size, gender, yearLevel, availability, status } = req.body;

    const finalYearLevel = (category === 'PE' || category === 'Academic') ? null : yearLevel;
    const image = req.file ? `/uploads/${req.file.filename}` : '';

    const newUniform = new Uniform({
      category,
      type,
      size,
      gender,
      yearLevel: finalYearLevel,
      availability,
      status,
      image
    });

    await newUniform.save();

    await notifyNewUniform(newUniform);

    res.status(201).json({
      success: true,
      message: 'Uniform added successfully and notifications sent!',
      data: newUniform
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A uniform with this category, type, gender, year level, and size already exists.'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

exports.usersPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const searchQuery = req.query.search || '';

    const query = searchQuery
      ? {
          $or: [
            { firstName: { $regex: searchQuery, $options: 'i' } },
            { lastName: { $regex: searchQuery, $options: 'i' } },
            { email: { $regex: searchQuery, $options: 'i' } },
            { phone: { $regex: searchQuery, $options: 'i' } },
            { course: { $regex: searchQuery, $options: 'i' } },
            { yearLevel: { $regex: searchQuery, $options: 'i' } },
            { role: { $regex: searchQuery, $options: 'i' } }
          ]
        }
      : {};

    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);

    const users = await User.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.render('admin/users', {
      users,
      currentPage: page,
      totalPages,
      searchQuery
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.requestPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; 
    const limit = 5;
    const skip = (page - 1) * limit;

    const filter = { status: { $in: ['Pending', 'Approved'] } };

    const totalRequests = await UniformRequest.countDocuments(filter);

    const requests = await UniformRequest.find(filter)
      .populate('user', 'firstName lastName email yearLevel')
      .populate('uniform')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalRequests / limit);

    res.render('admin/request', { 
      requests, 
      totalPages, 
      currentPage: page 
    });
  } catch (err) {
    console.error('Error fetching uniform requests:', err);
    res.status(500).send('Server Error');
  }
};

exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await UniformRequest.findById(id)
      .populate('user')
      .populate('uniform');
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    if (!request.user || !request.user.email) {
      return res.status(400).json({ success: false, message: 'User email not found' });
    }

    request.status = 'Approved';
    await request.save();

    await emailService.sendRequestApprovedEmail(request.user.email, request.uniform);

    await Notification.create({
      user: request.user._id,
      message: `Your uniform request for ${request.uniform.category} - ${request.uniform.type} has been approved.`,
    });

    res.json({ success: true, message: 'Request approved successfully' });
  } catch (err) {
    console.error('Error approving request:', err);
    res.status(500).json({ success: false, message: 'Something went wrong' });
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const request = await UniformRequest.findById(id)
      .populate('user')
      .populate('uniform');

    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (!request.user || !request.user.email) {
      return res.status(400).json({ success: false, message: 'User email not found' });
    }

    request.status = 'Rejected';
    await request.save();

    await emailService.sendRequestRejectedEmail(request.user.email, request.uniform, reason);

    await Notification.create({
      user: request.user._id,
      message: `Your uniform request for ${request.uniform.category} - ${request.uniform.type} was rejected. Reason: ${reason || 'No reason provided.'}`,
      status: 'Rejected'
    });

    res.json({ success: true, message: 'Request rejected successfully' });
  } catch (err) {
    console.error('Error rejecting request:', err);
    res.status(500).json({ success: false, message: 'Something went wrong' });
  }
};

exports.completeRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await UniformRequest.findById(id)
      .populate('user', 'email firstName lastName')
      .populate('uniform');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    request.status = 'Completed';
    await request.save();

    const userEmail = request.user?.email;
    if (userEmail) {
      await emailService.sendRequestCompletedEmail(userEmail, request.uniform);
    }

    await Notification.create({
      user: request.user._id,
      message: `Your uniform request for ${request.uniform.category} - ${request.uniform.type} has been marked as completed.`,
    });

    res.json({ success: true, message: 'Request marked as completed successfully' });

  } catch (error) {
    console.error('Error completing request:', error);
    res.status(500).json({ success: false, message: 'Server error while completing request' });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    const statusFilter = req.query.status || 'All';
    const search = req.query.search ? req.query.search.trim() : '';

    const baseFilter = statusFilter === 'All'
      ? { status: { $in: ['Completed', 'Rejected', 'Cancelled'] } }
      : { status: statusFilter };

    const searchFilter = search
      ? {
          $or: [
            { 'user.firstName': { $regex: search, $options: 'i' } },
            { 'user.lastName': { $regex: search, $options: 'i' } },
            { 'user.email': { $regex: search, $options: 'i' } },
            { 'uniform.category': { $regex: search, $options: 'i' } },
            { 'uniform.type': { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const filter = { ...baseFilter, ...searchFilter };

    const totalRequests = await UniformRequest.countDocuments(filter);

    const requests = await UniformRequest.find(filter)
      .populate('user', 'firstName lastName email')
      .populate('uniform')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalRequests / limit);

    res.render('admin/history', {
      requests,
      totalPages,
      currentPage: page,
      statusFilter,
      search,
    });
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).send('Server Error');
  }
};

exports.logout = async (req, res) => {
  try {
    req.session.destroy(err => {
      if (err) return res.status(500).json({ message: "Failed to logout." });
      res.clearCookie("connect.sid");
      res.status(200).json({ message: "Logged out successfully.", redirect: "/login" });
    });
  } catch (error) {
    res.status(500).json({ message: "Logout failed. Please try again." });
  }
};
