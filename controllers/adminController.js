const User = require('../models/User');
const Uniform = require('../models/Uniform');
const fs = require('fs');
const path = require('path');
const UniformRequest = require('../models/UniformRequest');
const emailService = require('../utils/emailService');

exports.dashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalUniforms = await Uniform.countDocuments();

    const coursesAggregation = await User.aggregate([
      { $group: { _id: '$course', count: { $sum: 1 } } }
    ]);
    const yearLevelsAggregation = await User.aggregate([
      { $group: { _id: '$yearLevel', count: { $sum: 1 } } }
    ]);

    const courses = coursesAggregation.map(c => c._id);
    const courseCounts = coursesAggregation.map(c => c.count);
    const yearLevels = yearLevelsAggregation.map(y => y._id);
    const yearCounts = yearLevelsAggregation.map(y => y.count);

    const growthAggregation = await User.aggregate([
      { 
        $group: { 
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const growthLabels = growthAggregation.map(g => g._id);
    const growthCounts = growthAggregation.map(g => g.count);

    res.render('admin/index', {
      totalUsers,
      totalUniforms,
      courses,
      courseCounts,
      yearLevels,
      yearCounts,
      growthLabels,
      growthCounts
    });

  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
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

    res.status(201).json({
      success: true,
      message: 'Uniform added successfully!',
      data: newUniform
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Failed to add: A uniform with this category, type, gender, year level, and size already exists.'
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

    const totalRequests = await UniformRequest.countDocuments();

    const requests = await UniformRequest.find()
      .populate('user', 'firstName lastName email')
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

    // Make sure to populate 'user' and 'uniform'
    const request = await UniformRequest.findById(id).populate('user').populate('uniform');
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    if (!request.user || !request.user.email) {
      return res.status(400).json({ success: false, message: 'User email not found' });
    }

    request.status = 'Approved';
    await request.save();

    // Send email notification
    await emailService.sendRequestApprovedEmail(request.user.email, request.uniform);

    res.json({ success: true, message: 'Request approved successfully' });
  } catch (err) {
    console.error('Error sending approved request email:', err);
    res.status(500).json({ success: false, message: 'Something went wrong' });
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const request = await UniformRequest.findById(id).populate('user').populate('uniform');
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    if (!request.user || !request.user.email) {
      return res.status(400).json({ success: false, message: 'User email not found' });
    }

    request.status = 'Rejected';
    await request.save();

    // Send email notification
    await emailService.sendRequestRejectedEmail(request.user.email, request.uniform, reason);

    res.json({ success: true, message: 'Request rejected successfully' });
  } catch (err) {
    console.error('Error sending rejected request email:', err);
    res.status(500).json({ success: false, message: 'Something went wrong' });
  }
};

exports.completeRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await UniformRequest.findById(id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    request.status = 'Completed';
    await request.save();

    await emailService.sendRequestCompletedEmail(request.userEmail, request.uniform);

    res.json({ success: true, message: 'Request marked as completed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.accountPage = async (req, res) => res.render('admin/account');

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
