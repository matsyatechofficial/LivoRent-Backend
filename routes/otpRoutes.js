const express = require("express");
const router = express.Router();
// Use shared mailer (provides dev fallback when no creds)
const transporter = require("../config/mailer");

const otpEmailTemplate = require("../templates/otpEmailTemplate");

// =======================
// OTP STORE (IN-MEMORY)
// =======================
let otpStore = {}; 
// { email: { otp, expiresAt, lastSentAt, requestCount, blockedUntil } }

// transporter is provided by config/mailer.js

// =======================
// SEND OTP
// =======================
router.post("/send-otp", (req, res) => {
  const { email, name } = req.body;

  if (!email)
    return res.status(400).json({ success: false, error: "Email is required" });

  const now = Date.now();
  const user = otpStore[email] || {};

  // 🚫 BLOCK CHECK (10 minutes)
  if (user.blockedUntil && now < user.blockedUntil) {
    return res.status(429).json({
      error:
        "Please wait 10 minutes. Too many OTP requests or failed attempts.",
    });
  }

  // ⏱️ RESEND GAP CHECK (1 minute)
  if (user.lastSentAt && now - user.lastSentAt < 1 * 60 * 1000) {
    return res.status(429).json({
      error: "Please wait before requesting another OTP",
    });
  }

  // 🔢 REQUEST COUNT
  user.requestCount = (user.requestCount || 0) + 1;

  if (user.requestCount > 5) {
    user.blockedUntil = now + 10 * 60 * 1000;
    user.requestCount = 0;
    otpStore[email] = user;

    return res.status(429).json({
      error:
        "Please wait 10 minutes. Too many OTP requests or failed attempts.",
    });
  }

  // ✅ GENERATE OTP
  const otp = Math.floor(100000 + Math.random() * 900000);

  user.otp = otp;
  user.expiresAt = now + 3 * 60 * 1000; // 3 minutes
  user.lastSentAt = now;

  otpStore[email] = user;

  const mailOptions = {
    from: '"LivoRent" livorent@gmail.com',
    to: email,
    subject: "Your LivoRent Verification Code",
    html: otpEmailTemplate(otp, name || "User"),
  };

  transporter.sendMail(mailOptions, (err) => {
    if (err)
      return res
        .status(500)
        .json({ success: false, error: err.message });

    res.json({ success: true, message: "OTP sent successfully" });
  });
});

// =======================
// VERIFY OTP
// =======================
router.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp)
    return res
      .status(400)
      .json({ success: false, error: "Email and OTP are required" });

  const record = otpStore[email];
  if (!record)
    return res
      .status(400)
      .json({ success: false, error: "No OTP sent for this email" });

  if (Date.now() > record.expiresAt) {
    delete otpStore[email];
    return res
      .status(400)
      .json({ success: false, error: "OTP expired" });
  }

  if (parseInt(otp) !== record.otp) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid OTP" });
  }

  delete otpStore[email];
  res.json({ success: true, message: "Email verified successfully!" });
});

module.exports = router;
