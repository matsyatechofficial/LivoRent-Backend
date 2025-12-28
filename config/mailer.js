const nodemailer = require("nodemailer");

let transporter;

const host = process.env.BREVO_SMTP_HOST;
const port = process.env.BREVO_SMTP_PORT;
const user = process.env.BREVO_SMTP_USER;
const pass = process.env.BREVO_SMTP_PASS;

if (user && pass) {
  transporter = nodemailer.createTransport({
    host: host || 'smtp-relay.brevo.com',
    port: port ? parseInt(port, 10) : 587,
    secure: false,
    auth: {
      user,
      pass,
    },
  });
} else {
  // Development fallback: simple logger transporter to avoid crashes when credentials missing
  transporter = {
    sendMail: (mailOptions, callback) => {
      console.warn('\n[DEV MAILER] No SMTP credentials provided — logging email instead of sending:\n');
      console.log('To:', mailOptions.to);
      console.log('Subject:', mailOptions.subject);
      console.log('HTML:', mailOptions.html);
      console.warn('\n[DEV MAILER] Email logged. In production, set BREVO_SMTP_USER and BREVO_SMTP_PASS.\n');
      if (typeof callback === 'function') {
        // emulate nodemailer success response
        return callback(null, { accepted: [mailOptions.to], messageId: `dev-${Date.now()}` });
      }
      return Promise.resolve({ accepted: [mailOptions.to], messageId: `dev-${Date.now()}` });
    },
  };
}

module.exports = transporter;
