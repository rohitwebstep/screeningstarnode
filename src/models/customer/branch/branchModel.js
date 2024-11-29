const {
  pool,
  startConnection,
  connectionRelease,
} = require("../../../config/db");

const Branch = {
  isEmailUsedBefore: (email, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      const emailCheckSql = `
        SELECT COUNT(*) as count
        FROM \`branches\`
        WHERE \`email\` = ?
      `;

      connection.query(emailCheckSql, [email], (err, emailCheckResults) => {
        connectionRelease(connection); // Ensure connection is released

        if (err) {
          console.error("Error checking email in branch:", err);
          return callback(err, null);
        }

        const emailExists = emailCheckResults[0].count > 0;
        return callback(null, emailExists);
      });
    });
  },

  index: (branch_id, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      // Optimized query to fetch client applications by status
      const query = `
        SELECT 
            ca.id AS client_application_id, 
            ca.application_id,
            ca.employee_id, 
            ca.name,
            ca.status,
            ca.created_at,
            cmt.id AS cmt_id,
            cmt.*
        FROM 
            client_applications ca
        LEFT JOIN 
            cmt_applications cmt ON ca.id = cmt.client_application_id
        WHERE 
            ca.branch_id = ?
        ORDER BY 
            ca.created_at DESC
      `;

      // Fetch client applications with related CMT data
      connection.query(query, [branch_id], (err, results) => {
        if (err) {
          connectionRelease(connection);
          console.error("Error fetching client applications:", err);
          return callback(err, null);
        }

        // Group applications by their status and add CMT data
        const applicationsByStatus = results.reduce((grouped, app) => {
          if (!grouped[app.status]) {
            grouped[app.status] = {
              applicationCount: 0,
              applications: [],
            };
          }

          grouped[app.status].applications.push({
            client_application_id: app.client_application_id,
            application_name: app.name,
            application_id: app.application_id,
            created_at: app.created_at,
            cmtApplicationId: app.cmt_id,
            cmtOtherFields: app.other_fields, // Adjust based on actual field names from cmt
          });

          grouped[app.status].applicationCount += 1;

          return grouped;
        }, {});

        // Release connection and return results
        connectionRelease(connection);
        return callback(null, applicationsByStatus);
      });
    });
  },

  create: (BranchData, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      const sqlBranch = `
        INSERT INTO \`branches\` (
          \`customer_id\`, \`name\`, \`email\`, \`is_head\`, \`password\`, \`permissions\`, \`mobile_number\`
        ) VALUES (?, ?, ?, ?, MD5(?), ?, ?)
      `;
      const permissions = `{"client_manager": true,"candidate_manager": true,"verification_status": true,"sub_user": true}`;
      const valuesBranch = [
        BranchData.customer_id,
        BranchData.name,
        BranchData.email,
        BranchData.head,
        BranchData.password,
        permissions,
        BranchData.mobile_number || null,
      ];

      connection.query(sqlBranch, valuesBranch, (err, results) => {
        connectionRelease(connection); // Ensure connection is released

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
    });
  },

  list: (callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      const sql = `SELECT * FROM \`branches\``;
      connection.query(sql, (err, results) => {
        connectionRelease(connection); // Ensure connection is released

        if (err) {
          console.error("Database query error: 84", err);
          return callback(err, null);
        }
        callback(null, results);
      });
    });
  },

  filterOptionsForClientApplications: (branch_id, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      const sql = `
        SELECT \`status\`, COUNT(*) AS \`count\` 
        FROM \`client_applications\` 
        WHERE \`branch_id\` = ?
        GROUP BY \`status\`, \`branch_id\`
      `;
      connection.query(sql, [branch_id], (err, results) => {
        connectionRelease(connection); // Ensure connection is released

        if (err) {
          console.error("Database query error: 85", err);
          return callback(err, null);
        }
        callback(null, results);
      });
    });
  },

  filterOptionsForCandidateApplications: (branch_id, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      const sql = `
        SELECT \`status\`, COUNT(*) AS \`count\` 
        FROM \`candidate_applications\` 
        WHERE \`branch_id\` = ?
        GROUP BY \`status\`, \`branch_id\`
      `;
      connection.query(sql, [branch_id], (err, results) => {
        connectionRelease(connection); // Ensure connection is released

        if (err) {
          console.error("Database query error: 86", err);
          return callback(err, null);
        }
        callback(null, results);
      });
    });
  },

  isEmailUsed: (email, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      const sql = `SELECT * FROM \`branches\` WHERE \`email\` = ?`;
      connection.query(sql, [email], (err, results) => {
        connectionRelease(connection); // Ensure connection is released

        if (err) {
          console.error("Database query error:", err);
          return callback(
            { message: "Database query error", error: err },
            null
          );
        }

        // Return true if the email is found, false otherwise
        const isUsed = results.length > 0;
        callback(null, isUsed);
      });
    });
  },

  listByCustomerID: (customer_id, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      const sql = `SELECT * FROM \`branches\` WHERE \`customer_id\` = ?`;
      connection.query(sql, [customer_id], (err, results) => {
        connectionRelease(connection); // Ensure connection is released

        if (err) {
          console.error("Database query error: 88", err);
          return callback(err, null);
        }
        callback(null, results);
      });
    });
  },

  getBranchById: (id, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      const sql = `SELECT * FROM \`branches\` WHERE \`id\` = ?`;
      connection.query(sql, [id], (err, results) => {
        connectionRelease(connection); // Ensure connection is released

        if (err) {
          console.error("Database query error: 89", err);
          return callback(err, null);
        }

        if (results.length === 0) {
          return callback(null, null);
        }

        callback(null, results[0]);
      });
    });
  },

  getClientUniqueIDByBranchId: (id, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      const sql = "SELECT `customer_id` FROM `branches` WHERE `id` = ?";
      connection.query(sql, [id], (err, results) => {
        if (err) {
          console.error("Database query error: 90", err);
          connectionRelease(connection);
          return callback(err, null);
        }

        if (results.length > 0 && results[0].customer_id) {
          const customerId = results[0].customer_id;
          const uniqueIdSql =
            "SELECT `client_unique_id` FROM `customers` WHERE `id` = ?";

          connection.query(
            uniqueIdSql,
            [customerId],
            (err, uniqueIdResults) => {
              connectionRelease(connection); // Ensure connection is released

              if (err) {
                console.error("Database query error: 91", err);
                return callback(err, null);
              }

              if (
                uniqueIdResults.length > 0 &&
                uniqueIdResults[0].client_unique_id
              ) {
                return callback(null, uniqueIdResults[0].client_unique_id);
              } else {
                return callback(null, false);
              }
            }
          );
        } else {
          connectionRelease(connection); // Ensure connection is released
          return callback(null, false);
        }
      });
    });
  },

  getClientNameByBranchId: (id, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      const sql = "SELECT `customer_id` FROM `branches` WHERE `id` = ?";
      connection.query(sql, [id], (err, results) => {
        if (err) {
          console.error("Database query error: 92", err);
          connectionRelease(connection);
          return callback(err, null);
        }

        if (results.length > 0 && results[0].customer_id) {
          const customerId = results[0].customer_id;
          const uniqueIdSql = "SELECT `name` FROM `customers` WHERE `id` = ?";

          connection.query(
            uniqueIdSql,
            [customerId],
            (err, uniqueIdResults) => {
              connectionRelease(connection); // Ensure connection is released

              if (err) {
                console.error("Database query error: 93", err);
                return callback(err, null);
              }

              if (uniqueIdResults.length > 0 && uniqueIdResults[0].name) {
                return callback(null, uniqueIdResults[0].name);
              } else {
                return callback(null, false);
              }
            }
          );
        } else {
          connectionRelease(connection); // Ensure connection is released
          return callback(null, false);
        }
      });
    });
  },

  update: (id, name, email, password, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      const sql = `
        UPDATE \`branches\`
        SET \`name\` = ?, \`email\` = ?, \`password\` = ?
        WHERE \`id\` = ?
      `;
      connection.query(sql, [name, email, password, id], (err, results) => {
        connectionRelease(connection); // Ensure connection is released

        if (err) {
          console.error("Database query error: 94", err);
          return callback(err, null);
        }
        callback(null, results);
      });
    });
  },

  updateHeadBranchEmail: (customer_id, name, email, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      const sql = `
        UPDATE \`branches\`
        SET \`name\` = ?, \`email\` = ?
        WHERE \`is_head\` = ? AND \`customer_id\` = ?
      `;
      connection.query(sql, [name, email, "1", customer_id], (err, results) => {
        connectionRelease(connection); // Ensure connection is released

        if (err) {
          console.error("Database query error: 95", err);
          return callback(err, null);
        }
        callback(null, results);
      });
    });
  },

  active: (id, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      const sql = `
        UPDATE \`branches\`
        SET \`status\` = ?
        WHERE \`id\` = ?
      `;
      connection.query(sql, ["1", id], (err, results) => {
        connectionRelease(connection); // Ensure connection is released

        if (err) {
          console.error("Database query error: 96", err);
          return callback(err, null);
        }
        callback(null, results);
      });
    });
  },

  inactive: (id, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      const sql = `
        UPDATE \`branches\`
        SET \`status\` = ?
        WHERE \`id\` = ?
      `;
      connection.query(sql, ["0", id], (err, results) => {
        connectionRelease(connection); // Ensure connection is released

        if (err) {
          console.error("Database query error: 97", err);
          return callback(err, null);
        }
        callback(null, results);
      });
    });
  },

  delete: (id, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      // Check if the branch is a head branch (is_head = 1)
      const checkSql = `SELECT \`is_head\` FROM \`branches\` WHERE \`id\` = ?`;
      connection.query(checkSql, [id], (err, results) => {
        if (err) {
          connectionRelease(connection); // Ensure connection is released
          console.error("Database query error: Checking branch status", err);
          return callback(err, null);
        }

        if (results.length === 0) {
          connectionRelease(connection);
          return callback({ message: "Branch not found" }, null);
        }

        if (results[0].is_head === 1) {
          connectionRelease(connection); // Ensure connection is released
          return callback({ message: "Can't delete head branch" }, null);
        }

        // Proceed with deletion if not a head branch
        const deleteSql = `DELETE FROM \`branches\` WHERE \`id\` = ?`;
        connection.query(deleteSql, [id], (err, deleteResults) => {
          connectionRelease(connection); // Ensure connection is released

          if (err) {
            console.error("Database query error: Deleting branch", err);
            return callback(err, null);
          }

          callback(null, deleteResults);
        });
      });
    });
  },
};

module.exports = Branch;
