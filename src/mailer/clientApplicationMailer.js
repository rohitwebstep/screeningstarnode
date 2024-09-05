const nodemailer = require("nodemailer");
const connection = require("../config/db"); // Import the existing MySQL connection

// Function to generate HTML table from service details
const generateTable = (services) => {
  let table =
    '<table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse;">';
  table += "<tr><th>Sr. No.</th><th>Service Name</th></tr>";

  services.forEach((service, index) => {
    table += `<tr>
                <td>${index + 1}</td>
                <td>${service.service_name}</td>
              </tr>`;
  });

  table += "</table>";
  return table;
};

// Function to send email
async function sendEmail(module, action, services, toArr, ccArr) {
  try {
    // Fetch email template
    const [emailRows] = await connection
      .promise()
      .query(
        "SELECT * FROM emails WHERE module = ? AND action = ? AND status = 1",
        [module, action]
      );
    if (emailRows.length === 0) throw new Error("Email template not found");
    const email = emailRows[0];

    // Fetch SMTP credentials
    const [smtpRows] = await connection
      .promise()
      .query(
        "SELECT * FROM smtp_credentials WHERE module = ? AND action = ? AND status = 1",
        [module, action]
      );
    if (smtpRows.length === 0) throw new Error("SMTP credentials not found");
    const smtp = smtpRows[0];

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure, // true for 465, false for other ports
      auth: {
        user: smtp.username,
        pass: smtp.password,
      },
    });

    // Generate the HTML table from service details
    const table = generateTable(services);

    // Replace placeholders in the email template
    let template = email.template;
    template = template
      .replace(/{{dynamic_name}}/g, name)
      .replace(/{{table}}/g, table);

    // Prepare CC list
    const ccList = ccArr
      .map((email) => `"${email.name}" <${email.email}>`)
      .join(", ");

    // Validate recipient email(s)
    if (!toArr || toArr.length === 0)
      throw new Error("No recipient email provided");

    // Prepare recipient list
    const toList = toArr
      .map((email) => `"${email.name}" <${email.email}>`)
      .join(", ");

    // Send email
    const info = await transporter.sendMail({
      from: smtp.username,
      to: toList, // Main recipient list
      cc: ccList, // CC recipient list
      subject: email.title,
      html: template,
    });

    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

module.exports = { sendEmail };
