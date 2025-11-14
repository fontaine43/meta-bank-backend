const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.META_BANK_EMAIL,
    pass: process.env.META_BANK_EMAIL_PASS
  }
});

const sendVerificationEmail = async (to, name, token) => {
  const link = `https://meta-bank-frontend.onrender.com/verify?token=${token}`;
  const mailOptions = {
    from: '"Meta Bank" <no-reply@metabank.com>',
    to,
    subject: 'Verify Your Meta Bank Account',
    html: `
      <h2>Hello ${name},</h2>
      <p>Thank you for registering with Meta Bank. Please verify your account by clicking the link below:</p>
      <a href="${link}">Verify My Account</a>
      <p>This link will expire in 24 hours.</p>
    `
  };
  await transporter.sendMail(mailOptions);
};

const notifyAdminOfNewUser = async (user) => {
  const mailOptions = {
    from: '"Meta Bank" <no-reply@metabank.com>',
    to: 'admin@metabank.com',
    subject: 'New User Registration Alert',
    html: `
      <h3>New User Registered</h3>
      <p><strong>Name:</strong> ${user.fullName}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Username:</strong> ${user.username}</p>
      <p><strong>Phone:</strong> ${user.phone}</p>
    `
  };
  await transporter.sendMail(mailOptions);
};

module.exports = { sendVerificationEmail, notifyAdminOfNewUser };
