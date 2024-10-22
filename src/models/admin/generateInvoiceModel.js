const crypto = require("crypto");
const pool = require("../../config/db");

// Function to hash the password using MD5
const hashPassword = (password) =>
  crypto.createHash("md5").update(password).digest("hex");

const generateInvoiceModel = {
  generateInvoice: (customer_id, callback) => {
    const customerInfo = `
      SELECT * 
      FROM customers
      WHERE id = ?;
    `;

    pool.query(customerInfo, [customer_id], (err, customerResults) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }

      const finalSql = `
        SELECT * 
        FROM client_applications
        WHERE (status = 'completed' OR status = 'closed') 
        AND customer_id = ? 
        ORDER BY branch_id;
      `;

      pool.query(finalSql, [customer_id], (err, applicationResults) => {
        if (err) {
          console.error("Database query error:", err);
          return callback(err, null);
        }

        // Combine results if needed or pass them separately
        const results = {
          customerInfo: customerResults,
          applications: applicationResults,
        };

        callback(null, results);
      });
    });
  },
};

module.exports = generateInvoiceModel;
