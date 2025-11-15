const nodemailer = require('nodemailer');

// Create reusable transporter using Gmail service
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.META_BANK_EMAIL,       // your Gmail address from env
    pass: process.env.META_BANK_EMAIL_PASS   // your Gmail app password from env
  }
});

/**
 * Send verification email to a new user
 * @param {string} to - recipient email
 * @param {string} name - recipient name
 * @param {string} token - verification token
 */
const sendVerificationEmail = async (to, name, token) => {
  const link = `https://meta-bank-frontend.onrender.com/verify.html?token=${token}`;
  const mailOptions = {
    from: `"Meta Bank" <${process.env.META_BANK_EMAIL}>`,
    to,
    subject: 'Verify Your Meta Bank Account',
    html: `
      <h2>Hello ${name},</h2>
      <p>Thank you for registering with Meta Bank.</p>
      <p>Please verify your account by clicking the link below:</p>
      <p><a href="${link}" style="color:#006644;font-weight:bold;">Verify My Account</a></p>
      <p>This link will expire in 24 hours.</p>
      <br/>
      <p>If you did not register, please ignore this email.</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Notify admin when a new user registers
 * @param {object} user - user object containing details
 */
const notifyAdminOfNewUser = async (user) => {
  const mailOptions = {
    from: `"Meta Bank" <${process.env.META_BANK_EMAIL}>`,
    to: 'admin@metabank.com',
    subject: 'New User Registration Alert',
    html: `
      <h3>New User Registered</h3>
      <p><strong>Name:</strong> ${user.fullName}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Username:</strong> ${user.username}</p>
      <p><strong>Phone:</strong> ${user.phone}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendVerificationEmail, notifyAdminOfNewUser };
