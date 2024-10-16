const nodemailer = require("nodemailer");
const connection = require("../../config/db"); // Import the existing MySQL connection

// Function to check if a file exists
const checkFileExists = async (url) => {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok; // Returns true if the status is in the range 200-299
  } catch {
    return false; // Return false if there was an error (e.g., network issue)
  }
};

// Function to create attachments from URLs
const createAttachments = async (attachments_url) => {
  const urls =
    attachments_url && typeof attachments_url === "string"
      ? attachments_url.split(",")
      : [""];
  const attachments = [];

  for (const url of urls) {
    if (await checkFileExists(url)) {
      const filename = url.split("/").pop(); // Extract the filename from the URL
      attachments.push({
        filename: filename,
        path: url,
      });
    }
  }

  return attachments;
};

// Function to send email
async function finalReportMail(
  module,
  action,
  company_name,
  gender_title,
  client_name,
  application_id,
  attachments_url,
  toArr,
  ccArr
) {
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

    // Create attachments
    const attachments = await createAttachments(attachments_url);

    // Replace placeholders in the email template
    let template = email.template;
    template = template
      .replace(/{{company_name}}/g, company_name)
      .replace(/{{gender_title}}/g, gender_title)
      .replace(/{{client_name}}/g, client_name)
      .replace(/{{application_id}}/g, application_id);

    // Prepare CC list
    const ccList = ccArr
      .map((entry) => {
        let emails = [];

        try {
          // Case 1: If it's already an array, use it
          if (Array.isArray(entry.email)) {
            emails = entry.email;
          } else if (typeof entry.email === "string") {
            // Case 2: If it's a JSON string (with brackets and quotes), clean and parse it
            let cleanedEmail = entry.email.trim();

            // Remove extra quotes and backslashes from the string
            cleanedEmail = cleanedEmail
              .replace(/\\"/g, '"')
              .replace(/^"|"$/g, "");

            // Check if the cleaned email is a JSON array
            if (cleanedEmail.startsWith("[") && cleanedEmail.endsWith("]")) {
              emails = JSON.parse(cleanedEmail);
            } else {
              // Case 3: If it's a plain string email, use it directly
              emails = [cleanedEmail];
            }
          }
        } catch (e) {
          console.error("Error parsing email JSON:", entry.email, e);
          return ""; // Skip this entry if parsing fails
        }

        // Ensure that emails array contains valid items, and format them
        return emails
          .filter((email) => email) // Ensure it's a valid non-empty string
          .map((email) => `"${entry.name}" <${email}>`)
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

    // Debugging: Log the email lists
    console.log("Recipient List:", toList);
    console.log("CC List:", ccList);

    // Send email
    const mailOptions = {
      from: smtp.username,
      to: toList,
      cc: ccList,
      subject: email.title,
      html: template,
      ...(attachments.length > 0 && { attachments }), // Only include attachments if present
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

module.exports = { finalReportMail };
