const {
  pool,
  startConnection,
  connectionRelease,
} = require("../../../config/db");

const candidateApplication = {
  // Method to check if an email has been used before
  isEmailUsedBefore: (email, branch_id, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      const emailCheckSql = `
        SELECT COUNT(*) as count
        FROM \`candidate_applications\`
        WHERE \`email\` = ? AND \`branch_id\` = ?
      `;

      connection.query(
        emailCheckSql,
        [email, branch_id],
        (err, emailCheckResults) => {
          connectionRelease(connection); // Ensure connection is released

          if (err) {
            console.error(
              "Error checking email in candidate_applications:",
              err
            );
            return callback(err, null);
          }

          const emailExists = emailCheckResults[0].count > 0;
          return callback(null, emailExists);
        }
      );
    });
  },

  // Method to create a new candidate application
  create: (data, callback) => {
    const {
      sub_user_id,
      branch_id,
      name,
      employee_id,
      mobile_number,
      email,
      services,
      package,
      customer_id,
    } = data;

    let sql = `
      INSERT INTO \`candidate_applications\` (
        \`branch_id\`,
        \`name\`,
        \`employee_id\`,
        \`mobile_number\`,
        \`email\`,
        \`services\`,
        \`package\`,
        \`customer_id\`
  `;

    let values = [
      branch_id,
      name,
      employee_id,
      mobile_number,
      email,
      services || "",
      package || "",
      customer_id,
    ];

    // Conditionally add sub_user_id to the SQL query and values array
    if (sub_user_id != null) {
      sql += `, \`sub_user_id\``;
      values.push(sub_user_id);
    }

    sql += `) VALUES (${new Array(values.length).fill("?").join(", ")})`;

    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      connection.query(sql, values, (err, results) => {
        connectionRelease(connection); // Ensure connection is released

        if (err) {
          console.error("Database query error: 99", err);
          return callback(err, null);
        }
        callback(null, results);
      });
    });
  },

  list: (branch_id, callback) => {
    const sql =
      "SELECT * FROM `candidate_applications` WHERE `branch_id` = ? ORDER BY created_at DESC";

    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      connection.query(sql, [branch_id], (err, results) => {
        if (err) {
          console.error("Database query error: 100", err);
          connectionRelease(connection); // Ensure connection is released
          return callback(err, null);
        }

        const finalResults = [];
        const servicePromises = results.map((application) => {
          return new Promise((resolve, reject) => {
            // Extract service IDs
            const servicesIds = application.services
              ? application.services.split(",")
              : [];

            if (servicesIds.length === 0) {
              finalResults.push({ ...application, serviceNames: [] }); // No services to fetch
              return resolve(); // Resolve for applications with no services
            }

            // Query for service titles
            const servicesQuery =
              "SELECT title FROM `services` WHERE id IN (?)";
            connection.query(
              servicesQuery,
              [servicesIds],
              (err, servicesResults) => {
                if (err) {
                  console.error("Database query error for services:", err);
                  return reject(err);
                }

                const servicesTitles = servicesResults.map(
                  (service) => service.title
                );

                // Push the application with the corresponding service titles
                finalResults.push({
                  ...application,
                  serviceNames: servicesTitles, // Add services titles to the result
                });
                resolve();
              }
            );
          });
        });

        Promise.all(servicePromises)
          .then(() => {
            connectionRelease(connection); // Ensure connection is released after all promises resolve
            callback(null, finalResults);
          })
          .catch((err) => {
            connectionRelease(connection); // Ensure connection is released on error
            callback(err, null);
          });
      });
    });
  },

  checkUniqueEmpId: (candidateUniqueEmpId, callback) => {
    const sql = `
      SELECT COUNT(*) AS count
      FROM \`candidate_applications\`
      WHERE \`employee_id\` = ?
    `;

    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      connection.query(sql, [candidateUniqueEmpId], (err, results) => {
        connectionRelease(connection); // Ensure connection is released

        if (err) {
          console.error("Database query error: 101", err);
          return callback(
            { message: "Database query error", error: err },
            null
          );
        }

        const count = results[0].count;
        callback(null, count > 0);
      });
    });
  },

  checkUniqueEmpIdByCandidateApplicationID: (
    application_id,
    candidateUniqueEmpId,
    callback
  ) => {
    const sql = `
      SELECT COUNT(*) AS count
      FROM \`candidate_applications\`
      WHERE \`employee_id\` = ? AND id = ?
    `;

    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      connection.query(
        sql,
        [candidateUniqueEmpId, application_id],
        (err, results) => {
          connectionRelease(connection); // Ensure connection is released

          if (err) {
            console.error("Database query error: 102", err);
            return callback(
              { message: "Database query error", error: err },
              null
            );
          }

          const count = results[0].count;
          callback(null, count > 0);
        }
      );
    });
  },

  getCandidateApplicationById: (id, callback) => {
    const sql = "SELECT * FROM `candidate_applications` WHERE id = ?";

    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      connection.query(sql, [id], (err, results) => {
        connectionRelease(connection); // Ensure connection is released

        if (err) {
          console.error("Database query error: 103", err);
          return callback(err, null);
        }
        callback(null, results[0]);
      });
    });
  },

  update: (data, candidate_application_id, callback) => {
    const { name, employee_id, mobile_number, email, services, package } = data;

    const sql = `
      UPDATE \`candidate_applications\`
      SET
        \`name\` = ?,
        \`employee_id\` = ?,
        \`mobile_number\` = ?,
        \`email\` = ?,
        \`services\` = ?,
        \`package\` = ?
      WHERE
        \`id\` = ?
    `;

    const values = [
      name,
      employee_id,
      mobile_number,
      email,
      services,
      package,
      candidate_application_id,
    ];

    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      connection.query(sql, values, (err, results) => {
        connectionRelease(connection); // Ensure connection is released

        if (err) {
          console.error("Database query error: 104", err);
          return callback(err, null);
        }
        callback(null, results);
      });
    });
  },

  delete: (id, callback) => {
    const sql = "DELETE FROM `candidate_applications` WHERE `id` = ?";

    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      connection.query(sql, [id], (err, results) => {
        connectionRelease(connection); // Ensure connection is released

        if (err) {
          console.error("Database query error: 105", err);
          return callback(err, null);
        }
        callback(null, results);
      });
    });
  },

  isApplicationExist: (app_id, branch_id, customer_id, callback) => {
    const sql =
      "SELECT * FROM `candidate_applications` WHERE `id` = ? AND `branch_id` = ? AND `customer_id` = ? AND `is_submitted` = 0";

    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      connection.query(
        sql,
        [app_id, branch_id, customer_id],
        (err, results) => {
          connectionRelease(connection); // Ensure connection is released

          if (err) {
            console.error("Database query error: 106", err);
            return callback(err, null);
          }

          // Return the entry if it exists, or false otherwise
          const entry = results.length > 0 ? results[0] : false;
          callback(null, entry);
        }
      );
    });
  },
};

module.exports = candidateApplication;
