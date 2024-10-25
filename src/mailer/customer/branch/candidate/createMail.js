const nodemailer = require("nodemailer");
const { startConnection, connectionRelease } = require("../../../../config/db"); // Import the existing MySQL connection

// Function to generate HTML table from service details
const generateTable = (services) => {
  if (!Array.isArray(services) || services.length === 0) {
    return `<tr>
              <td colspan="3" style="text-align: center;">No instructions available for the selected services.</td>
            </tr>`;
  }

  let rows = "";

  services.forEach((service, index) => {
    // Split the service into title and description
    const [title, description] = service.split(":");

    rows += `<tr>
                <td>${index + 1}</td> <!-- Serial number -->
                <td>${title}</td> <!-- Title -->
                <td>${description.trim()}</td> <!-- Description -->
              </tr>`;
  });

  return rows;
};

// Function to send email
async function createMail(
  module,
  action,
  name,
  application_id,
  href,
  services,
  toArr,
  ccArr
) {
  const connection = await new Promise((resolve, reject) => {
    startConnection((err, conn) => {
      if (err) {
        console.error("Failed to connect to the database:", err);
        return reject({
          message: "Failed to connect to the database",
          error: err,
        });
      }
      resolve(conn);
    });
  });

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

    // Generate the HTML table from service details
    const table_rows = generateTable(services);

    // Replace placeholders in the email template
    let template = email.template;
    template = template
      .replace(/{{candidate_name}}/g, name)
      .replace(/{{table_rows}}/g, table_rows)
      .replace(/{{form_href}}/g, href);

    // Prepare CC list
    const ccList = ccArr
      .map((entry) => {
        let emails = [];

        try {
          if (Array.isArray(entry.email)) {
            emails = entry.email;
          } else if (typeof entry.email === "string") {
            let cleanedEmail = entry.email
              .trim()
              .replace(/\\"/g, '"')
              .replace(/^"|"$/g, "");

            if (cleanedEmail.startsWith("[") && cleanedEmail.endsWith("]")) {
              emails = JSON.parse(cleanedEmail);
            } else {
              emails = [cleanedEmail];
            }
          }
        } catch (e) {
          console.error("Error parsing email JSON:", entry.email, e);
          return ""; // Skip this entry if parsing fails
        }

        // Ensure it's a valid non-empty string
        return emails
          .filter((email) => email) // Filter out invalid emails
          .map((email) => `"${entry.name}" <${email.trim()}>`) // Trim to remove whitespace
          .join(", ");
      })
      .filter((cc) => cc !== "") // Remove any empty CCs from failed parses
      .join(", ");

    // Validate recipient email(s)
    if (!toArr || toArr.length === 0) {
      throw new Error("No recipient email provided");
    }

    // Prepare recipient list
    const toList = toArr
      .map((email) => `"${email.name}" <${email.email}>`)
      .join(", ");

    // Send email
    const info = await transporter.sendMail({
      from: `"GoldQuest Global" <${smtp.username}>`,
      to: toList, // Main recipient list
      cc: ccList, // CC recipient list
      subject: email.title,
      html: template,
    });

    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Error sending email:", error);
  } finally {
    connectionRelease(connection); // Ensure the connection is released
  }
}

module.exports = { createMail };
