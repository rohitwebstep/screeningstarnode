const nodemailer = require("nodemailer");
const { startConnection, connectionRelease } = require("../../config/db"); // Import the existing MySQL connection

// Function to generate an HTML table from branch details
const generateTable = (branches, password) => {
  let table =
    '<table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse;">';
  table +=
    "<tr><th>Sr. No.</th><th>Email</th><th>Name</th><th>Password</th></tr>";

  branches.forEach((branch, index) => {
    table += `<tr>
                <td>${index + 1}</td>
                <td style="text-decoration: none; color: inherit; background-color: inherit; user-select: none;">${
                  branch.email
                }</td>
                <td>${branch.name}</td>
                <td>${password}</td>
              </tr>`;
  });

  table += "</table>";
  return table;
};

// Function to send email
async function createMail(
  module,
  action,
  client_name,
  branches,
  password,
  is_head,
  customerData
) {
  let connection;

  try {
    // Use a promise to handle the callback-based startConnection function
    connection = await new Promise((resolve, reject) => {
      startConnection((err, conn) => {
        if (err) {
          return reject(err);
        }
        resolve(conn);
      });
    });

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
        "SELECT * FROM smtp_credentials WHERE module = ? AND action = ? AND status = '1'",
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

    // Generate the HTML table from branch details
    const table = generateTable(branches, password);

    // Replace placeholders in the email template
    let template = email.template
      .replace(/{{dynamic_name}}/g, client_name)
      .replace(/{{table}}/g, table);

    // Prepare recipient list based on whether the branch is a head branch
    let recipientList;
    if (is_head === 1) {
      // Include all customers in the recipient list for head branches
      recipientList = customerData.map(
        (customer) => `"${customer.name}" <${customer.email}>`
      );
    } else {
      // If not a head branch, only include the specific branches
      recipientList = branches.map(
        (branch) => `"${branch.name}" <${branch.email}>`
      );
    }

    // Send email to the prepared recipient list
    const info = await transporter.sendMail({
      from: smtp.username,
      to: recipientList.join(", "), // Join the recipient list into a string
      subject: email.title,
      html: template,
    });

    console.log("Email sent successfully:", info.response);
  } catch (error) {
    console.error("Error sending email:", error.message);
  } finally {
    if (connection) {
      connectionRelease(connection); // Ensure the connection is released
    }
  }
}

module.exports = { createMail };
