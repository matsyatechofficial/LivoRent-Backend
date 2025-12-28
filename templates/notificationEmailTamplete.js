const notificationEmailTemplate = (title, message, name) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
  <table width="100%">
    <tr>
      <td align="center" style="padding:12px;">
        <table width="420" style="background:#ffffff;border-radius:8px;padding:18px;">
          <tr>
            <td align="center">
              <h2 style="color:#2f5b87;margin-bottom:10px;">
                ${title}
              </h2>
            </td>
          </tr>

          <tr>
            <td style="font-size:14px;color:#333;">
              <p>Hello ${name || "User"},</p>
              <p>${message}</p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding-top:12px;font-size:12px;color:#777;">
              <p>This is a system notification. Please do not reply.</p>
              <p style="font-weight:bold;color:#00BFA5;font-size:18px;">
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

module.exports = notificationEmailTemplate;
