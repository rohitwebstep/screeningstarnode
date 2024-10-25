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

      connection.query(query, [branch_id], (err, results) => {
        if (err) {
          connectionRelease(connection);
          console.error(
            "Database query error while fetching applications by status:",
            err
          );
          return callback(err, null);
        }

        const cmtPromises = results.map((app) => {
          return new Promise((resolve, reject) => {
            const sqlCmt =
              "SELECT * FROM cmt_applications WHERE client_application_id = ?";
            connection.query(
              sqlCmt,
              [app.application_id],
              (err, cmtResults) => {
                if (err) {
                  console.error(
                    "Database query error for cmt_applications:",
                    err
                  );
                  return reject(err);
                }

                const cmtData = cmtResults.map((cmtApp) => {
                  return Object.fromEntries(
                    Object.entries(cmtApp).map(([key, value]) => [
                      `cmt_${key}`,
                      value,
                    ])
                  );
                });

                app.cmtApplications = cmtData.length > 0 ? cmtData : []; // Use empty array if no cmt records

                resolve(app); // Resolve with the updated application object
              }
            );
          });
        });

        Promise.all(cmtPromises)
          .then((updatedResults) => {
            const applicationsByStatus = updatedResults.reduce(
              (grouped, row) => {
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
              },
              {}
            );
            connectionRelease(connection);
            return callback(null, applicationsByStatus);
          })
          .catch((err) => {
            connectionRelease(connection);
            callback(err, null);
          });
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
          console.error("Database query error:", err);
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
          console.error("Database query error:", err);
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
          console.error("Database query error:", err);
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
          return callback(err, null);
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
          console.error("Database query error:", err);
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
          console.error("Database query error:", err);
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
          console.error("Database query error:", err);
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
                console.error("Database query error:", err);
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
          console.error("Database query error:", err);
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
                console.error("Database query error:", err);
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
          console.error("Database query error:", err);
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
          console.error("Database query error:", err);
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
          console.error("Database query error:", err);
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
          console.error("Database query error:", err);
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

      const sql = `DELETE FROM \`branches\` WHERE \`id\` = ?`;
      connection.query(sql, [id], (err, results) => {
        connectionRelease(connection); // Ensure connection is released

        if (err) {
          console.error("Database query error:", err);
          return callback(err, null);
        }
        callback(null, results);
      });
    });
  },
};

module.exports = Branch;
