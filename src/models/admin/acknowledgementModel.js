const crypto = require("crypto");
const pool = require("../../config/db");

// Function to hash the password using MD5
const hashPassword = (password) =>
  crypto.createHash("md5").update(password).digest("hex");

const Acknowledgement = {
  list: (callback) => {
    const sql = `
      SELECT DISTINCT \`ack_sent\`, \`branch_id\`, \`customer_id\`, COUNT(*) AS application_count
      FROM \`client_applications\`
      WHERE ack_sent = 0
      GROUP BY \`ack_sent\`, \`branch_id\`, \`customer_id\`
    `;

    pool.query(sql, (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }

      // Prepare to fetch customer and branch details
      const finalResult = [];
      let remaining = results.length;

      if (remaining === 0) {
        return callback(null, finalResult); // Return an empty array if no results
      }

      results.forEach((result) => {
        const { branch_id, customer_id, application_count } = result;
        const customerSql = `SELECT * FROM \`customers\` WHERE \`id\` = ?`;
        const branchSql = `SELECT * FROM \`branches\` WHERE \`id\` = ?`;

        // Fetch customer details
        pool.query(
          customerSql,
          [customer_id],
          (customerErr, customerResult) => {
            if (customerErr) {
              console.error("Error fetching customer:", customerErr);
              return callback(customerErr, null);
            }

            // Fetch branch details
            pool.query(branchSql, [branch_id], (branchErr, branchResult) => {
              if (branchErr) {
                console.error("Error fetching branch:", branchErr);
                return callback(branchErr, null);
              }

              // Construct the final object
              finalResult.push({
                customer: customerResult[0] || {},
                branch: branchResult[0] || {},
                applicationCount: application_count,
              });

              remaining--;

              // Once all are processed, return the final result
              if (remaining === 0) {
                callback(null, finalResult);
              }
            });
          }
        );
      });
    });
  },
};

module.exports = Acknowledgement;
