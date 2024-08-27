const nodemailer = require("nodemailer");
const connection = require("../../config/db"); // Import the existing MySQL connection

// Function to generate HTML table from branch details
const generateTable = (branches, password) => {
  let table =
    '<table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse;">';
  table +=
    "<tr><th>Sr. No.</th><th>Email</th><th>Name</th><th>Password</th></tr>";

  branches.forEach((branch, index) => {
    table += `<tr>
                <td>${index + 1}</td>
                <td>${branch.branch_email}</td>
                <td>${branch.branch_name}</td>
                <td>${password}</td>
              </tr>`;
  });

  table += "</table>";
  return table;
};

// Function to send email
async function sendEmail(module, action, name, branches, password) {
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
    console.log("Email template fetched:", email);

    // Fetch SMTP credentials
    const [smtpRows] = await connection
      .promise()
      .query(
        "SELECT * FROM smtp_credentials WHERE module = ? AND action = ? AND status = 1",
        [module, action]
      );
    if (smtpRows.length === 0) throw new Error("SMTP credentials not found");
    const smtp = smtpRows[0];
    console.log("SMTP credentials fetched:", smtp);

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
    console.log("Transporter created.");

    // Generate the HTML table from branch details
    const table = generateTable(branches, password);
    console.log("Generated HTML table:", table);

    // Replace placeholders in the email template
    let template = email.template;
    template = template
      .replace(/{{dynamic_name}}/g, name)
      .replace(/{{table}}/g, table);

    // Send email to all branch emails
    const recipientList = branches
      .map((branch) => `"${branch.branch_name}" <${branch.branch_email}>`)
      .join(", ");
    console.log("Sending email to:", recipientList);

    const info = await transporter.sendMail({
      from: smtp.username,
      to: recipientList,
      subject: email.title,
      html: template,
    });

    console.log("Email sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

module.exports = { sendEmail };
