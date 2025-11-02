const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');

exports.generateOTP = () => {
  return otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false
  });
};

const generateEmailTemplate = (title, message, otp = '') => {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #ffffff; max-width: 500px; margin: auto; border-radius: 10px; overflow: hidden; border: 1px solid #e0e0e0;">
      <div style="background-color: #1055C9; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0;">Uniform Management System</h2>
      </div>
      <div style="padding: 25px;">
        <h3 style="color: #000; text-align: center; margin-bottom: 10px;">${title}</h3>
        <div style="color: #000; font-size: 15px; text-align: center;">${message}</div>
        ${otp ? `
          <div style="text-align: center; margin: 25px 0;">
            <span style="display: inline-block; background-color: #1055C9; color: white; font-size: 30px; font-weight: bold; letter-spacing: 5px; padding: 10px 20px; border-radius: 8px;">${otp}</span>
          </div>
          <p style="color: #000; font-size: 13px; text-align: center;">This code will expire in 5 minutes.</p>
        ` : ''}
      </div>
      <div style="background-color: #f7f7f7; padding: 10px; text-align: center; color: #000; font-size: 12px;">
        © ${new Date().getFullYear()} Uniform Management System. All rights reserved.
      </div>
    </div>
  `;
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 📩 Send OTP for registration
exports.sendRegisterOTP = async (to, otp) => {
  const mailOptions = {
    from: `"Uniform Management System" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Account Verification - Uniform Management System',
    html: generateEmailTemplate(
      'Account Verification Code',
      'Please use the following One-Time Password (OTP) to complete your registration:',
      otp
    )
  };

  await transporter.sendMail(mailOptions);
  console.log(`Registration OTP sent to ${to}`);
};

// 📩 Send OTP for forgot password
exports.sendForgotPasswordOTP = async (to, otp) => {
  const mailOptions = {
    from: `"Uniform Management System" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Password Reset Code - Uniform Management System',
    html: generateEmailTemplate(
      'Password Reset Code',
      'Use the following OTP to reset your password:',
      otp
    )
  };

  await transporter.sendMail(mailOptions);
  console.log(`Forgot Password OTP sent to ${to}`);
};

// 📩 Resend OTP (either register or forgot)
exports.resendOTP = async (to, otp, type = 'register') => {
  const isForgot = type === 'forgot';
  const subject = isForgot
    ? 'Resend Password Reset Code - Uniform Management System'
    : 'Resend Account Verification Code - Uniform Management System';

  const title = isForgot
    ? 'Password Reset Code (Resent)'
    : 'Account Verification Code (Resent)';

  const message = isForgot
    ? 'Here is your new OTP to reset your password:'
    : 'Here is your new OTP to complete your registration:';

  const mailOptions = {
    from: `"Uniform Management System" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: generateEmailTemplate(title, message, otp)
  };

  await transporter.sendMail(mailOptions);
  console.log(`Resent OTP (${type}) sent to ${to}`);
};

// 📩 Notify user that uniform request was submitted
exports.sendUniformRequestNotification = async (to, uniform) => {
  const uniformName = `${uniform.category} - ${uniform.type} (${uniform.size}, ${uniform.gender})`;
  const html = generateEmailTemplate(
    'Uniform Request Submitted',
    `Your request for <strong>${uniformName}</strong> has been submitted successfully. Our staff will review your request and notify you once it’s approved.`
  );

  await transporter.sendMail({
    from: `"Uniform Management System" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Uniform Request Submitted - Uniform Management System',
    html
  });

  console.log(`Uniform request notification sent to ${to}`);
};

// 📩 Notify user that their request was approved
exports.sendRequestApprovedEmail = async (to, uniform) => {
  if (!to) throw new Error('No recipients defined');

  const uniformName = `${uniform.category} - ${uniform.type} (${uniform.size}, ${uniform.gender})`;
  const html = generateEmailTemplate(
    'Uniform Request Approved',
    `Your request for <strong>${uniformName}</strong> has been approved. You may now claim your uniform at the designated collection area.`
  );

  await transporter.sendMail({
    from: `"Uniform Management System" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Uniform Request Approved - Uniform Management System',
    html
  });

  console.log(`Approved request email sent to ${to}`);
};

// 📩 Notify user that their request was rejected
exports.sendRequestRejectedEmail = async (to, uniform, reason = 'No reason provided') => {
  if (!to) throw new Error('No recipients defined');

  const uniformName = `${uniform.category} - ${uniform.type} (${uniform.size}, ${uniform.gender})`;
  const html = generateEmailTemplate(
    'Uniform Request Rejected',
    `Your request for <strong>${uniformName}</strong> has been rejected.<br><br><strong>Reason:</strong> ${reason}`
  );

  await transporter.sendMail({
    from: `"Uniform Management System" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Uniform Request Rejected - Uniform Management System',
    html
  });

  console.log(`Rejected request email sent to ${to}`);
};

// 📩 Notify user that they successfully claimed the uniform
exports.sendRequestCompletedEmail = async (to, uniform) => {
  if (!to) throw new Error('No recipients defined');

  const uniformName = `${uniform.category} - ${uniform.type} (${uniform.size}, ${uniform.gender})`;
  const html = generateEmailTemplate(
    'Uniform Claimed Successfully',
    `
      Your request for <strong>${uniformName}</strong> has been successfully <strong>completed</strong>.<br><br>
      Thank you for claiming your uniform! We appreciate your cooperation and hope you’re satisfied with your new uniform.<br><br>
      <span style="font-size: 14px; color: #555;">If you have any questions or feedback, please contact the administration office.</span>
    `
  );

  await transporter.sendMail({
    from: `"Uniform Management System" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Uniform Claimed Successfully - Uniform Management System',
    html
  });

  console.log(`Completed request email sent to ${to}`);
};
