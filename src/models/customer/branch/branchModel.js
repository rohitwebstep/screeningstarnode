const pool = require("../../../config/db");

const Branch = {
  isEmailUsedBefore: (email, callback) => {
    // Step 1: Check if the email exists in candidate_applications
    const emailCheckSql = `
      SELECT COUNT(*) as count
      FROM \`branches\`
      WHERE \`email\` = ?
    `;

    pool.query(emailCheckSql, [email], (err, emailCheckResults) => {
      if (err) {
        console.error("Error checking email in branch:", err);
        return callback(err, null);
      }

      // Check if the email exists
      const emailExists = emailCheckResults[0].count > 0;
      return callback(null, emailExists);
    });
  },

  index: (branch_id, callback) => {
    // SQL query to fetch client applications grouped by status
    const query = `
    SELECT 
        \`id\`, 
        \`application_id\`, 
        \`employee_id\`, 
        \`name\`, 
        \`status\`
    FROM 
        \`client_applications\`
    WHERE 
        \`status\` IN (
            'wip', 
            'not_ready', 
            'ready', 
            'completed', 
            'completed_green', 
            'completed_red', 
            'completed_yellow', 
            'completed_pink', 
            'completed_orange', 
            'closed'
        )
        AND \`branch_id\` = ?
    ORDER BY 
        FIELD(\`status\`, 
            'completed', 
            'completed_green', 
            'completed_red', 
            'completed_yellow', 
            'completed_pink', 
            'completed_orange', 
            'wip', 
            'not_ready', 
            'ready', 
            'closed'
        ),
        \`created_at\` DESC;
`;
    // Execute the query to retrieve the data from the database
    pool.query(query, [branch_id], (err, results) => {
      if (err) {
        console.error(
          "Database query error while fetching applications by status:",
          err
        );
        return callback(err, null);
      }

      // Array to hold promises for fetching cmt_applications data
      const cmtPromises = results.map((app) => {
        return new Promise((resolve, reject) => {
          const sqlCmt =
            "SELECT * FROM cmt_applications WHERE client_application_id = ?";
          pool.query(sqlCmt, [app.application_id], (err, cmtResults) => {
            if (err) {
              console.error("Database query error for cmt_applications:", err);
              return reject(err);
            }

            // Add cmt_ prefix to each field in cmtResults
            const cmtData = cmtResults.map((cmtApp) => {
              return Object.fromEntries(
                Object.entries(cmtApp).map(([key, value]) => [
                  `cmt_${key}`,
                  value,
                ])
              );
            });

            // Add the cmtApplications to the application object
            app.cmtApplications = cmtData.length > 0 ? cmtData : []; // Use empty array if no cmt records

            resolve(app); // Resolve with the updated application object
          });
        });
      });

      // Wait for all cmt application queries to complete
      Promise.all(cmtPromises)
        .then((updatedResults) => {
          // Group the results by 'status' field with applicationCount and applications array
          const applicationsByStatus = updatedResults.reduce((grouped, row) => {
            if (!grouped[row.status]) {
              grouped[row.status] = {
                applicationCount: 0,
                applications: [],
              };
            }

            grouped[row.status].applications.push({
              client_application_id: row.application_id,
              application_name: row.name,
              cmtApplications: row.cmtApplications, // Add cmt applications array
            });

            grouped[row.status].applicationCount += 1;

            return grouped;
          }, {});

          // Return the grouped results via callback
          return callback(null, applicationsByStatus);
        })
        .catch((err) => {
          callback(err, null);
        });
    });
  },

  create: (BranchData, callback) => {
    const sqlBranch = `
      INSERT INTO \`branches\` (
        \`customer_id\`, \`name\`, \`email\`, \`is_head\`, \`password\`, \`permissions\`, \`mobile_number\`
      ) VALUES (?, ?, ?, ?, MD5(?), ?, ?)
    `;
    const permissions = `{"index": {"view": true},"client_application": {"create": true,"update": true,"view": true,"delete": true},"candidate_application": {"create": true,"update": true,"view": true,"delete": true}}`;
    const valuesBranch = [
      BranchData.customer_id,
      BranchData.name,
      BranchData.email,
      BranchData.head,
      BranchData.password,
      permissions,
      BranchData.mobile_number || null,
    ];

    pool.query(sqlBranch, valuesBranch, (err, results) => {
      if (err) {
        console.error("Database insertion error for branches:", err);
        return callback(
          { message: "Database insertion error for branches", error: err },
          null
        );
      }

      const branchID = results.insertId;
      callback(null, { insertId: branchID });
    });
  },

  list: (callback) => {
    const sql = `SELECT * FROM \`branches\``;
    pool.query(sql, (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  filterOptionsForClientApplications: (branch_id, callback) => {
    const sql = `
      SELECT \`status\`, COUNT(*) AS \`count\` 
      FROM \`client_applications\` 
      WHERE \`branch_id\` = ?
      GROUP BY \`status\`, \`branch_id\`
    `;
    pool.query(sql, [branch_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  filterOptionsForCandidateApplications: (branch_id, callback) => {
    const sql = `
      SELECT \`status\`, COUNT(*) AS \`count\` 
      FROM \`candidate_applications\` 
      WHERE \`branch_id\` = ?
      GROUP BY \`status\`, \`branch_id\`
    `;
    pool.query(sql, [branch_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  isEmailUsed: (email, callback) => {
    const sql = `SELECT * FROM \`branches\` WHERE \`email\` = ?`;
    pool.query(sql, [email], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      // Return true if the email is found, false otherwise
      const isUsed = results.length > 0;
      callback(null, isUsed);
    });
  },

  listByCustomerID: (customer_id, callback) => {
    const sql = `SELECT * FROM \`branches\` WHERE \`customer_id\` = ?`;
    pool.query(sql, [customer_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  getBranchById: (id, callback) => {
    const sql = `SELECT * FROM \`branches\` WHERE \`id\` = ?`;

    pool.query(sql, [id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }

      if (results.length === 0) {
        return callback(null, null);
      }

      callback(null, results[0]);
    });
  },

  getClientUniqueIDByBranchId: (id, callback) => {
    const sql = "SELECT `customer_id` FROM `branches` WHERE `id` = ?";

    // First query to get customer_id from branches
    pool.query(sql, [id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }

      // Check if the result exists and customer_id is valid
      if (results.length > 0 && results[0].customer_id) {
        const customerId = results[0].customer_id;
        const uniqueIdSql =
          "SELECT `client_unique_id` FROM `customers` WHERE `id` = ?";

        // Second query to get client_unique_id using customer_id
        pool.query(uniqueIdSql, [customerId], (err, uniqueIdResults) => {
          if (err) {
            console.error("Database query error:", err);
            return callback(err, null);
          }

          // Check if the client_unique_id exists and is not null or empty
          if (
            uniqueIdResults.length > 0 &&
            uniqueIdResults[0].client_unique_id
          ) {
            return callback(null, uniqueIdResults[0].client_unique_id);
          } else {
            return callback(null, false); // Return false if not found or invalid
          }
        });
      } else {
        return callback(null, false); // Return false if no customer_id found
      }
    });
  },

  getClientNameByBranchId: (id, callback) => {
    const sql = "SELECT `customer_id` FROM `branches` WHERE `id` = ?";

    // First query to get customer_id from branches
    pool.query(sql, [id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }

      // Check if the result exists and customer_id is valid
      if (results.length > 0 && results[0].customer_id) {
        const customerId = results[0].customer_id;
        const uniqueIdSql = "SELECT `name` FROM `customers` WHERE `id` = ?";

        // Second query to get name using customer_id
        pool.query(uniqueIdSql, [customerId], (err, uniqueIdResults) => {
          if (err) {
            console.error("Database query error:", err);
            return callback(err, null);
          }

          // Check if the name exists and is not null or empty
          if (uniqueIdResults.length > 0 && uniqueIdResults[0].name) {
            return callback(null, uniqueIdResults[0].name);
          } else {
            return callback(null, false); // Return false if not found or invalid
          }
        });
      } else {
        return callback(null, false); // Return false if no customer_id found
      }
    });
  },

  update: (id, name, email, password, callback) => {
    const sql = `
      UPDATE \`branches\`
      SET \`name\` = ?, \`email\` = ?, \`password\` = ?
      WHERE \`id\` = ?
    `;
    pool.query(sql, [name, email, password, id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  updateHeadBranchEmail: (customer_id, name, email, callback) => {
    const sql = `
      UPDATE \`branches\`
      SET \`name\` = ?, \`email\` = ?
      WHERE \`is_head\` = ? AND \`customer_id\` = ?
    `;
    pool.query(sql, [name, email, "1", customer_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  active: (id, callback) => {
    const sql = `
      UPDATE \`branches\`
      SET \`status\` = ?
      WHERE \`id\` = ?
    `;
    pool.query(sql, ["1", id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  inactive: (id, callback) => {
    const sql = `
      UPDATE \`branches\`
      SET \`status\` = ?
      WHERE \`id\` = ?
    `;
    pool.query(sql, ["0", id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  delete: (id, callback) => {
    const sql = `
        DELETE FROM \`branches\`
        WHERE \`id\` = ?
      `;
    pool.query(sql, [id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },
};

module.exports = Branch;
