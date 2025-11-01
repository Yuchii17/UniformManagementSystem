const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');

exports.generateOTP = () => {
  return otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false
  });
};

const generateEmailTemplate = (otp, title, message) => {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #ffffff; max-width: 500px; margin: auto; border-radius: 10px; overflow: hidden; border: 1px solid #e0e0e0;">
      <div style="background-color: #1055C9; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0;">Uniform Management System</h2>
      </div>
      <div style="padding: 25px;">
        <h3 style="color: #000; text-align: center; margin-bottom: 10px;">${title}</h3>
        <p style="color: #000; font-size: 15px; text-align: center;">${message}</p>
        <div style="text-align: center; margin: 25px 0;">
          <span style="display: inline-block; background-color: #1055C9; color: white; font-size: 30px; font-weight: bold; letter-spacing: 5px; padding: 10px 20px; border-radius: 8px;">${otp}</span>
        </div>
        <p style="color: #000; font-size: 13px; text-align: center;">This code will expire in 5 minutes.</p>
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

exports.sendRegisterOTP = async (to, otp) => {
  const mailOptions = {
    from: `"Uniform Management System" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Account Verification - Uniform Management System',
    html: generateEmailTemplate(
      otp,
      'Account Verification Code',
      'Please use the following One-Time Password (OTP) to complete your registration.'
    )
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Registration OTP sent to ${to}`);
  } catch (error) {
    console.error('Error sending registration OTP:', error);
    throw new Error('Failed to send registration OTP email');
  }
};

exports.sendForgotPasswordOTP = async (to, otp) => {
  const mailOptions = {
    from: `"Uniform Management System" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Password Reset Code - Uniform Management System',
    html: generateEmailTemplate(
      otp,
      'Password Reset Code',
      'Use the following OTP to reset your password.'
    )
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Forgot Password OTP sent to ${to}`);
  } catch (error) {
    console.error('Error sending forgot password OTP:', error);
    throw new Error('Failed to send forgot password OTP email');
  }
};

exports.resendOTP = async (to, otp, type = 'register') => {
  let subject, title, message;

  if (type === 'forgot') {
    subject = 'Resend Password Reset Code - Uniform Management System';
    title = 'Password Reset Code (Resent)';
    message = 'Here is your new OTP to reset your password.';
  } else {
    subject = 'Resend Account Verification Code - Uniform Management System';
    title = 'Account Verification Code (Resent)';
    message = 'Here is your new OTP to complete your registration.';
  }

  const mailOptions = {
    from: `"Uniform Management System" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: generateEmailTemplate(otp, title, message)
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Resent OTP (${type}) sent to ${to}`);
  } catch (error) {
    console.error('Error resending OTP:', error);
    throw new Error('Failed to resend OTP email');
  }
};

exports.sendUniformRequestNotification = async (to, uniform) => {
  const uniformName = `${uniform.category} - ${uniform.type} (${uniform.size}, ${uniform.gender})`;

  const mailOptions = {
    from: `"Uniform Management System" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Uniform Request Submitted - Uniform Management System',
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #ffffff; max-width: 500px; margin: auto; border-radius: 10px; overflow: hidden; border: 1px solid #e0e0e0;">
        <div style="background-color: #1055C9; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">Uniform Management System</h2>
        </div>
        <div style="padding: 25px;">
          <h3 style="color: #000; text-align: center; margin-bottom: 10px;">Uniform Request Submitted</h3>
          <p style="color: #000; font-size: 15px; text-align: center;">
            Your request for <strong>${uniformName}</strong> has been submitted successfully.
          </p>
          <p style="color: #000; font-size: 14px; text-align: center; margin-top: 15px;">
            Our staff will review your request and notify you once it's approved or processed.
          </p>
        </div>
        <div style="background-color: #f7f7f7; padding: 10px; text-align: center; color: #000; font-size: 12px;">
          © ${new Date().getFullYear()} Uniform Management System. All rights reserved.
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Uniform request notification sent to ${to}`);
  } catch (error) {
    console.error('Error sending uniform request notification:', error);
  }
};

exports.sendRequestApprovedEmail = async (to, uniform) => {
  if (!to) throw new Error('No recipients defined');

  const uniformName = `${uniform.category} - ${uniform.type} (${uniform.size}, ${uniform.gender})`;

  const mailOptions = {
    from: `"Uniform Management System" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Uniform Request Approved - Uniform Management System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin:auto; border:1px solid #e0e0e0; border-radius:10px; overflow:hidden;">
        <div style="background-color:#1055C9; padding:20px; text-align:center;">
          <h2 style="color:white; margin:0;">Uniform Management System</h2>
        </div>
        <div style="padding:25px;">
          <h3 style="text-align:center;">Uniform Request Approved</h3>
          <p style="text-align:center;">Your request for <strong>${uniformName}</strong> has been approved.</p>
          <p style="text-align:center;">Please wait for further instructions regarding collection.</p>
        </div>
        <div style="background-color:#f7f7f7; padding:10px; text-align:center; font-size:12px;">
          © ${new Date().getFullYear()} Uniform Management System. All rights reserved.
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Approved request email sent to ${to}`);
  } catch (error) {
    console.error('Error sending approved request email:', error);
    throw error;
  }
};

exports.sendRequestRejectedEmail = async (to, uniform, reason = 'No reason provided') => {
  if (!to) throw new Error('No recipients defined');

  const uniformName = `${uniform.category} - ${uniform.type} (${uniform.size}, ${uniform.gender})`;

  const mailOptions = {
    from: `"Uniform Management System" <${process.env.EMAIL_USER}>`,
    to, 
    subject: 'Uniform Request Rejected - Uniform Management System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin:auto; border:1px solid #e0e0e0; border-radius:10px; overflow:hidden;">
        <div style="background-color:#1055C9; padding:20px; text-align:center;">
          <h2 style="color:white; margin:0;">Uniform Management System</h2>
        </div>
        <div style="padding:25px;">
          <h3 style="text-align:center;">Uniform Request Rejected</h3>
          <p style="text-align:center;">Your request for <strong>${uniformName}</strong> has been rejected.</p>
          <p style="text-align:center; font-weight:bold;">Reason: ${reason}</p>
        </div>
        <div style="background-color:#f7f7f7; padding:10px; text-align:center; font-size:12px;">
          © ${new Date().getFullYear()} Uniform Management System. All rights reserved.
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Rejected request email sent to ${to}`);
  } catch (error) {
    console.error('Error sending rejected request email:', error);
    throw error;
  }
};

exports.sendRequestCompletedEmail = async (to, uniform) => {
  const uniformName = `${uniform.category} - ${uniform.type} (${uniform.size}, ${uniform.gender})`;
  const mailOptions = {
    from: `"Uniform Management System" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Uniform Request Completed - Uniform Management System',
    html: generateEmailTemplate(
      'Request Completed',
      `Your request for <strong>${uniformName}</strong> has been <strong>completed</strong>. Thank you!`
    )
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Completed request email sent to ${to}`);
  } catch (error) {
    console.error('Error sending completed request email:', error);
  }
};