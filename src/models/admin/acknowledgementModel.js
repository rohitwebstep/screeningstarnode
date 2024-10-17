const crypto = require("crypto");
const pool = require("../../config/db");

// Function to hash the password using MD5
const hashPassword = (password) =>
  crypto.createHash("md5").update(password).digest("hex");

const Acknowledgement = {
  list: (callback) => {
    const sql = `
      SELECT \`ack_sent\`, \`branch_id\`, \`customer_id\`, COUNT(*) AS application_count
      FROM \`client_applications\`
      WHERE ack_sent = 0
      GROUP BY \`branch_id\`, \`customer_id\`
    `;

    pool.query(sql, (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }

      // Create a mapping of customers to group their branches
      const customerMap = new Map();
      let totalResults = 0;

      const processResults = (result) => {
        const { branch_id, customer_id, application_count } = result;
        const customerSql = `SELECT \`id\`, \`admin_id\`, \`client_unique_id\`, \`name\` FROM \`customers\` WHERE \`id\` = ? AND \`status\` = 1`;
        const branchSql = `SELECT \`id\`, \`customer_id\`, \`name\`, \`is_head\`, \`head_id\` FROM \`branches\` WHERE \`id\` = ? AND \`status\` = 1`;

        // Fetch customer details
        pool.query(
          customerSql,
          [customer_id],
          (customerErr, customerResult) => {
            if (customerErr || customerResult.length === 0) {
              console.error("Error fetching customer:", customerErr);
              return callback(
                customerErr || new Error("Customer not found"),
                null
              );
            }

            // Fetch branch details
            pool.query(branchSql, [branch_id], (branchErr, branchResult) => {
              if (branchErr || branchResult.length === 0) {
                console.error("Error fetching branch:", branchErr);
                return callback(
                  branchErr || new Error("Branch not found"),
                  null
                );
              }

              const branchData = {
                id: branchResult[0].id,
                customer_id: branchResult[0].customer_id,
                name: branchResult[0].name,
                is_head: branchResult[0].is_head,
                head_id: branchResult[0].head_id,
                applicationCount: application_count,
              };

              // Group data under the customer ID
              if (!customerMap.has(customer_id)) {
                const customerData = {
                  ...customerResult[0],
                  applicationCount: 0, // Initialize total application count
                  branches: [], // Initialize branches array
                };
                customerMap.set(customer_id, customerData);
              }

              // Add branch data and update counts
              const customerData = customerMap.get(customer_id);
              customerData.branches.push(branchData);
              customerData.applicationCount += application_count; // Update total for customer
              totalResults += application_count; // Update overall total

              // Resolve when all queries are done
              if (--remainingQueries === 0) {
                const finalResult = Array.from(customerMap.values());
                callback(null, { data: finalResult, totalResults });
              }
            });
          }
        );
      };

      // Track number of remaining results to process
      let remainingQueries = results.length;

      // Early return if no results
      if (remainingQueries === 0) {
        return callback(null, { data: [], totalResults: 0 });
      }

      // Process each result
      results.forEach(processResults);
    });
  },
};

module.exports = Acknowledgement;
