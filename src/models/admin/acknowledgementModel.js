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
        const customerSql = `SELECT \`id\`, \`admin_id\`, \`client_unique_id\`, \`name\` FROM \`customers\` WHERE \`id\` = ? AND \`status\` = ?`;
        const branchSql = `SELECT \`id\`, \`customer_id\`, \`name\`, \`is_head\`, \`head_id\` FROM \`branches\` WHERE \`id\` = ? AND \`status\` = ?`;

        // Fetch customer details
        pool.query(
          customerSql,
          [customer_id, "1"],
          (customerErr, customerResult) => {
            if (customerErr || !customerResult.length) {
              console.error(
                "Error fetching customer:",
                customerErr || "Customer not found"
              );
              remainingQueries--;
              if (remainingQueries === 0) {
                const finalResult = Array.from(customerMap.values());
                return callback(null, { data: finalResult, totalResults });
              }
              return;
            }

            // Fetch branch details
            pool.query(
              branchSql,
              [branch_id, "1"],
              (branchErr, branchResult) => {
                if (branchErr || !branchResult.length) {
                  console.error(
                    "Error fetching branch:",
                    branchErr || "Branch not found"
                  );
                  remainingQueries--;
                  if (remainingQueries === 0) {
                    const finalResult = Array.from(customerMap.values());
                    return callback(null, { data: finalResult, totalResults });
                  }
                  return;
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
                  const customerData = customerResult[0];
                  customerData.applicationCount = 0; // Initialize total application count
                  customerData.branches = []; // Initialize branches array
                  customerMap.set(customer_id, customerData);
                }

                // Add branch data and update counts
                const customerData = customerMap.get(customer_id);
                customerData.branches.push(branchData);
                customerData.applicationCount += application_count; // Update total for customer
                totalResults += application_count; // Update overall total

                // Resolve when all queries are done
                remainingQueries--;
                if (remainingQueries === 0) {
                  const finalResult = Array.from(customerMap.values());
                  callback(null, { data: finalResult, totalResults });
                }
              }
            );
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

  listByCustomerID: (customer_id, callback) => {
    const sql = `
      SELECT id, application_id, name, services, ack_sent, branch_id, customer_id
      FROM client_applications
      WHERE ack_sent = 0 AND customer_id = ?
    `;

    pool.query(sql, [customer_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }

      const customerMap = new Map();
      let totalResults = 0;

      // Early return if no results
      if (results.length === 0) {
        return callback(null, { data: [], totalResults: 0 });
      }

      let remainingQueries = results.length; // Track number of remaining results to process

      const processResults = (result) => {
        const { branch_id, application_id, name, services } = result; // Include application details

        const customerSql = `SELECT id, admin_id, client_unique_id, name FROM customers WHERE id = ? AND status = ?`;
        const branchSql = `SELECT id, customer_id, name, is_head, head_id FROM branches WHERE id = ? AND status = ?`;

        // Fetch customer details
        pool.query(
          customerSql,
          [customer_id, "1"],
          (customerErr, customerResult) => {
            if (customerErr || !customerResult.length) {
              console.error(
                "Error fetching customer:",
                customerErr || "Customer not found"
              );
              remainingQueries--;
              checkRemainingQueries();
              return;
            }

            // Fetch branch details
            pool.query(
              branchSql,
              [branch_id, "1"],
              (branchErr, branchResult) => {
                if (branchErr || !branchResult.length) {
                  console.error(
                    "Error fetching branch:",
                    branchErr || "Branch not found"
                  );
                  remainingQueries--;
                  checkRemainingQueries();
                  return;
                }

                const branchData = {
                  id: branchResult[0].id,
                  customer_id: branchResult[0].customer_id,
                  name: branchResult[0].name,
                  is_head: branchResult[0].is_head,
                  head_id: branchResult[0].head_id,
                  applications: [], // Initialize applications array
                  applicationCount: 0, // Initialize application count for the branch
                };

                // Add application details to the branch
                const applicationDetails = {
                  application_id: application_id,
                  name: name,
                  services: services,
                };
                branchData.applications.push(applicationDetails);
                branchData.applicationCount += 1; // Increment count for this application

                // Group data under the customer ID
                if (!customerMap.has(customer_id)) {
                  const customerData = customerResult[0];
                  customerData.applicationCount = 0; // Initialize total application count
                  customerData.branches = []; // Initialize branches array
                  customerMap.set(customer_id, customerData);
                }

                // Add branch data and update counts
                const customerData = customerMap.get(customer_id);
                const existingBranch = customerData.branches.find(
                  (branch) => branch.id === branchData.id
                );
                if (existingBranch) {
                  // If branch exists, push the application to the existing branch
                  existingBranch.applications.push(applicationDetails);
                  existingBranch.applicationCount += 1; // Update count for this branch
                } else {
                  // If branch doesn't exist, push the new branch data
                  customerData.branches.push(branchData);
                }
                customerData.applicationCount += 1; // Update total for customer
                totalResults += 1; // Update overall total

                // Resolve when all queries are done
                remainingQueries--;
                checkRemainingQueries();
              }
            );
          }
        );
      };

      const checkRemainingQueries = () => {
        if (remainingQueries === 0) {
          const finalResult = Array.from(customerMap.values());
          callback(null, { data: finalResult, totalResults });
        }
      };

      // Process each result
      results.forEach(processResults);
    });
  },

  getClientApplicationByBranchIDForAckEmail: (branchId, callback) => {
    const sql = `
      SELECT \`id\`, \`application_id\`, \`name\`, \`services\` 
      FROM \`client_applications\` 
      WHERE \`branch_id\` = ?
    `;

    pool.query(sql, [branchId], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err);
      }

      // Return an empty array if no results
      const data = results.length ? results : [];
      callback(null, { data, totalResults: data.length });
    });
  },
};

module.exports = Acknowledgement;
