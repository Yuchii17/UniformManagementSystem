const Uniform = require('../models/Uniform');
const UniformRequest = require('../models/UniformRequest');
const { sendUniformRequestNotification } = require('../utils/emailService');

exports.requestUniform = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Please log in to request a uniform.' });
    }

    const userId = req.session.user._id;
    const { uniformId } = req.body;

    const uniform = await Uniform.findById(uniformId);
    if (!uniform) {
      return res.status(404).json({ success: false, message: 'Uniform not found.' });
    }

    const existingRequest = await UniformRequest.findOne({
      user: userId,
      uniform: uniformId,
      status: { $in: ['Pending', 'Approved'] }
    });

    if (existingRequest) {
      return res.status(400).json({ success: false, message: 'You already requested this uniform.' });
    }

    const newRequest = new UniformRequest({
      user: userId,
      uniform: uniformId,
      status: 'Pending',
      orfImage: req.file ? `/uploads/orf/${req.file.filename}` : null
    });

    await newRequest.save();

    await sendUniformRequestNotification(req.session.user.email, uniform);

    return res.status(200).json({ success: true, message: `Your request for ${uniform.category} - ${uniform.type} has been submitted successfully.` });
  } catch (error) {
    console.error('Error requesting uniform:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.cancelUniformRequest = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Please log in to cancel a request.' });
    }

    const userId = req.session.user._id;
    const { requestId } = req.body;

    const request = await UniformRequest.findOne({ _id: requestId, user: userId });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Uniform request not found.' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Only pending requests can be cancelled.' });
    }

    request.status = 'Cancelled';
    await request.save();

    return res.status(200).json({ success: true, message: 'Uniform request cancelled successfully.' });
  } catch (error) {
    console.error('Error cancelling uniform request:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
