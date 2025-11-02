const User = require('../models/User');
const { generateOTP, sendRegisterOTP, resendOTP, sendForgotPasswordOTP } = require('../utils/emailService');
const bcrypt = require('bcryptjs');
const Uniform = require('../models/Uniform')
const UniformRequest = require('../models/UniformRequest');
const Notification = require('../models/Notification');

const OTP_EXPIRATION = 5 * 60 * 1000;

exports.landingPage = async (req, res) => {
  res.render('index');
};

exports.showLogin = async (req, res) => {
  res.render('login');
};

exports.showRegister = async (req, res) => {
  res.render('register');
};

exports.showDashboard = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");

    const userId = req.session.user._id;

    const totalRequests = await UniformRequest.countDocuments({ user: userId });
    const pending = await UniformRequest.countDocuments({ user: userId, status: "Pending" });
    const approved = await UniformRequest.countDocuments({ user: userId, status: "Approved" });
    const completed = await UniformRequest.countDocuments({ user: userId, status: "Completed" });

    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('uniform', 'image');

    const notificationsWithImage = notifications.map(n => ({
      _id: n._id,
      message: n.message,
      isRead: n.isRead,
      createdAt: n.createdAt,
      uniformImage: n.uniform ? n.uniform.image : '/images/uniform.jpg'
    }));

    res.render("user/index", {
      session: req.session,
      stats: { totalRequests, pending, approved, completed },
      notifications: notificationsWithImage
    });
  } catch (error) {
    console.error("Error loading dashboard:", error);
    res.status(500).send("Failed to load user dashboard.");
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, gender } = req.body;
    const userId = req.session.user._id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, phone, gender },
      { new: true }
    );

    req.session.user = updatedUser;

    res.redirect("/user/profile?updated=true");
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.showProfilePage = (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  res.render('user/profile', {
    session: req.session
  });
};

exports.showRequestPage = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");

    const userGender = req.session.user.gender;
    const userYearLevel = req.session.user.yearLevel;

    const uniforms = await Uniform.find({
      $and: [
        {
          $or: [
            { gender: userGender },
            { gender: "Unisex" },
            { gender: { $exists: false } }
          ]
        },
        {
          $or: [
            { category: "PE" },
            { category: "Academic" },
            {
              $and: [
                { category: { $in: ["Corporate", "Department Shirt"] } },
                { yearLevel: userYearLevel }
              ]
            }
          ]
        },
        { availability: "Available" },
        { status: "Active" }
      ]
    }).sort({ category: 1, type: 1, size: 1, yearLevel: 1 });

    res.render("user/request", {
      session: req.session,
      uniforms
    });
  } catch (error) {
    console.error("Error loading uniforms:", error);
    res.status(500).send("Error loading uniforms.");
  }
};

exports.viewRequests = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect('/login');

    const userId = req.session.user._id;

    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const search = req.query.search ? req.query.search.trim() : '';
    const statusFilter = req.query.status ? req.query.status.trim().toLowerCase() : '';

    let filter = { user: userId };

    if (statusFilter) {
      if (statusFilter === 'rejected') {
        filter.status = { $in: ['Rejected', 'Processed'] };
      } else {
        filter.status = new RegExp(`^${statusFilter}$`, 'i');
      }
    }

    if (search) {
      filter.$or = [
        { 'uniform.category': { $regex: search, $options: 'i' } },
        { 'uniform.type': { $regex: search, $options: 'i' } },
        { 'uniform.size': { $regex: search, $options: 'i' } },
        { 'uniform.gender': { $regex: search, $options: 'i' } },
      ];
    }

    const totalRequests = await UniformRequest.countDocuments(filter);

    const totalPages = Math.ceil(totalRequests / limit);

    const requests = await UniformRequest.find(filter)
      .populate('uniform')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.render('user/requests', {
      title: 'My Uniform Requests',
      user: req.session.user,
      requests,
      currentPage: page,
      totalPages,
      search,
      statusFilter
    });

  } catch (error) {
    console.error('Error fetching uniform requests:', error);
    res.status(500).send('Server Error');
  }
};

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, yearLevel, course, gender } = req.body;
    let existingUser = await User.findOne({ email });

    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ message: 'Email is already registered and verified.' });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + OTP_EXPIRATION);

    if (existingUser && !existingUser.isVerified) {
      existingUser.verifyOTP = otp;
      existingUser.verifyOTPExpires = otpExpires;
      existingUser.firstName = firstName;
      existingUser.lastName = lastName;
      existingUser.phone = phone;
      existingUser.yearLevel = yearLevel;
      existingUser.course = course;
      existingUser.gender = gender;
      await existingUser.save();
      await resendOTP(email, otp, 'register');
      return res.status(200).json({ message: 'A new OTP has been sent to your email.' });
    }

    const user = new User({
      firstName,
      lastName,
      email,
      password,
      phone,
      yearLevel,
      course,
      gender,
      verifyOTP: otp,
      verifyOTPExpires: otpExpires,
      isVerified: false
    });

    await user.save();
    await sendRegisterOTP(email, otp);
    res.status(200).json({ message: 'OTP sent to your email. Please verify within 5 minutes.' });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.isVerified) return res.status(400).json({ message: 'Account already verified.' });
    if (user.verifyOTP !== otp) return res.status(400).json({ message: 'Invalid OTP.' });
    if (user.verifyOTPExpires < Date.now()) return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    user.isVerified = true;
    user.verifyOTP = undefined;
    user.verifyOTPExpires = undefined;
    await user.save();
    res.status(200).json({ message: 'Account successfully verified. You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: 'Verification failed. Please try again.' });
  }
};

exports.resendRegisterOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.isVerified) return res.status(400).json({ message: 'Account already verified.' });
    const otp = generateOTP();
    user.verifyOTP = otp;
    user.verifyOTPExpires = new Date(Date.now() + OTP_EXPIRATION);
    await user.save();
    await resendOTP(email, otp, 'register');
    res.status(200).json({ message: 'New OTP sent. Please verify within 5 minutes.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to resend OTP.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (email === 'superadmin@school.com' && password === 'superadmin123') {
      req.session.user = { role: 'admin', email };
      return res.status(200).json({ message: 'Welcome Super Admin!', redirect: '/admin/index' });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (!user.isVerified) return res.status(403).json({ message: 'Please verify your email before logging in.' });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password.' });
    req.session.user = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      yearLevel: user.yearLevel,
      course: user.course,
      gender: user.gender,
      role: user.role
    };
    res.status(200).json({
      message: 'Login successful.',
      redirect: '/user/index',
      user: req.session.user
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

exports.logout = async (req, res) => {
  try {
    req.session.destroy(err => {
      if (err) {
        console.error("Logout Error:", err);
        return res.status(500).json({ message: "Failed to logout." });
      }
      res.clearCookie("connect.sid");
      res.status(200).json({ message: "Logged out successfully.", redirect: "/login" });
    });
  } catch (error) {
    console.error("Logout Catch Error:", error);
    res.status(500).json({ message: "Logout failed. Please try again." });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    const otp = generateOTP();
    user.resetOTP = otp.toString();
    user.resetOTPExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();
    await sendForgotPasswordOTP(email, otp);
    res.status(200).json({ message: 'Password reset OTP sent. It expires in 5 minutes.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send password reset OTP.' });
  }
};

exports.verifyForgotOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (!user.resetOTP || !user.resetOTPExpires)
      return res.status(400).json({ message: 'No OTP request found.' });
    if (user.resetOTP.toString() !== otp.toString())
      return res.status(400).json({ message: 'Invalid OTP.' });
    if (user.resetOTPExpires < Date.now())
      return res.status(400).json({ message: 'OTP expired.' });
    res.status(200).json({ message: 'OTP verified. You can now reset your password.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error verifying OTP.' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.resetOTP !== otp) return res.status(400).json({ message: 'Invalid or expired OTP.' });
    user.password = newPassword;
    user.resetOTP = undefined;
    user.resetOTPExpires = undefined;
    await user.save();
    res.status(200).json({ message: 'Password reset successful. You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reset password.' });
  }
};
