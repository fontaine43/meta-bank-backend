const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Routing number from .env or fallback
const ROUTING_NUMBER = process.env.ROUTING_NUMBER || '231386894';

// Configure mail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.META_BANK_EMAIL,
    pass: process.env.META_BANK_EMAIL_PASS
  }
});

/**
 * Send verification email to a new user
 */
const sendVerificationEmail = async (to, name, token) => {
  const link = `${process.env.FRONTEND_URL || 'https://metabankamerica.com'}/verify.html?token=${token}`;
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
  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${to}`);
  } catch (err) {
    console.error('❌ Email error:', err.message);
  }
};

/**
 * Notify admin when a new user registers
 */
const notifyAdminOfNewUser = async (user) => {
  const mailOptions = {
    from: `"Meta Bank" <${process.env.META_BANK_EMAIL}>`,
    to: 'support@metabankamerica.com',
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
  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Admin notified of new user: ${user.username}`);
  } catch (err) {
    console.error('❌ Admin notify error:', err.message);
  }
};

/**
 * Generate a random 12-digit account number
 */
const generateAccountNumber = (prefix = '') => {
  const buf = crypto.randomBytes(8).toString('hex');
  const num = (BigInt('0x' + buf) % BigInt(9_000_000_000_00)) + BigInt(100_000_000_000);
  return `${prefix}${num.toString()}`;
};

/**
 * Provide default display balances for seeded accounts
 */
const seedDisplayBalance = (type) => {
  switch ((type || '').toLowerCase()) {
    case 'business': return 3240000.00; // from .env DEFAULT_BUSINESS_BALANCE
    case 'savings': return 2760.00;     // from .env DEFAULT_SAVINGS_BALANCE
    case 'checking': return 165000.00;  // from .env DEFAULT_CHECKING_BALANCE
    default: return 0.00;
  }
};

module.exports = {
  ROUTING_NUMBER,
  sendVerificationEmail,
  notifyAdminOfNewUser,
  generateAccountNumber,
  seedDisplayBalance
};
