const otpEmailTemplate = (otp, name) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>OTP Verification</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:12px;">
        <table width="420" cellpadding="0" cellspacing="0"
          style="background:#e4f1f0; border-radius:8px; padding:18px;">
          
          <tr>
            <td align="center">
              <h1 style="color:#2f5b87;margin:0 0 12px;font-size:22px;letter-spacing:2px;">
                Email Verification
              </h1>
            </td>
          </tr>

          <tr>
            <td>
              <h2 style="color:#00BFA5;margin:0 0 8px;font-size:16px;letter-spacing:2px;">
                Hello <br>${name} 👋,
              </h2>
              <p style="margin:0 0 10px;font-size:14px;">
                Your One-Time Password (OTP) for account verification is:
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:6px 0;">
              <div style="font-size:26px;font-weight:bold;letter-spacing:4px;color:#2f5b87;">
                ${otp}
              </div>
            </td>
          </tr>

          <tr>
            <td style="font-size:13px;color:#1A2B3C;">
              <p style="margin:8px 0;">
                This OTP is valid for
                <b style="font-size:16px;color:#00BFA5;">3 minutes</b>.
                Please do not share this code with anyone.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding-top:8px;font-size:12px;color:#777;">
              <p style="margin:4px 0;font-size:13px;color:#333;">
                Thank you for choosing our service!
              </p>
              This is an automated email, please do not reply.
              <br><br>
              &copy; 2024 LivoRent. All rights reserved.
              <p style="margin:8px 0 0;font-size:20px;letter-spacing:2px;font-weight:bold;color:#00BFA5;">
                LivoRent
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

module.exports = otpEmailTemplate;
