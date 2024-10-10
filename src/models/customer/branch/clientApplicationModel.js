const pool = require("../../../config/db");

const clientApplication = {
  generateApplicationID: (branch_id, callback) => {
    // Step 1: Fetch customer_id from branches using branch_id
    const getCustomerIdSql = `
      SELECT \`customer_id\`
      FROM \`branches\`
      WHERE \`id\` = ?
    `;

    pool.query(getCustomerIdSql, [branch_id], (err, branchResults) => {
      if (err) {
        console.error("Error fetching customer_id from branches:", err);
        return callback(err, null);
      }

      if (branchResults.length === 0) {
        return callback(new Error("Branch not found"), null);
      }

      const customer_id = branchResults[0].customer_id;

      // Step 2: Fetch client_unique_id from customers using customer_id
      const getClientUniqueIdSql = `
        SELECT \`client_unique_id\`
        FROM \`customers\`
        WHERE \`id\` = ?
      `;

      pool.query(
        getClientUniqueIdSql,
        [customer_id],
        (err, customerResults) => {
          if (err) {
            console.error(
              "Error fetching client_unique_id from customers:",
              err
            );
            return callback(err, null);
          }

          if (customerResults.length === 0) {
            return callback(new Error("Customer not found"), null);
          }

          const client_unique_id = customerResults[0].client_unique_id;

          // Step 3: Fetch the most recent application_id based on client_unique_id
          const getApplicationIdSql = `
          SELECT \`application_id\`
          FROM \`client_applications\`
          WHERE \`application_id\` LIKE ?
          ORDER BY \`created_at\` DESC
          LIMIT 1
        `;

          // Assuming `client_unique_id` is defined and holds the unique identifier
          const applicationIdParam = `${client_unique_id}%`;

          // Execute the query
          pool.query(
            getApplicationIdSql,
            [applicationIdParam],
            (err, applicationResults) => {
              if (err) {
                console.error("Error fetching application ID:", err);
                return callback(err, null);
              }

              let new_application_id;

              if (applicationResults.length === 0) {
                // If no applications exist, start with the client_unique_id and '-1'
                new_application_id = `${client_unique_id}-1`;
              } else {
                // Increment the number in the most recent application_id
                const latest_application_id =
                  applicationResults[0].application_id;
                const parts = latest_application_id.split("-");

                // Ensure parts array has at least three elements and increment the number part
                if (parts.length === 3) {
                  const numberPart = parseInt(parts[2], 10);
                  new_application_id = `${parts[0]}-${parts[1]}-${
                    numberPart + 1
                  }`;
                } else {
                  // Fallback if the format is not as expected
                  new_application_id = `${client_unique_id}-1`;
                }
              }

              callback(null, new_application_id);
            }
          );
        }
      );
    });
  },

  // Method to create a new client application
  create: (data, callback) => {
    const {
      name,
      attach_documents,
      employee_id,
      spoc,
      location,
      batch_number,
      sub_client,
      photo,
      branch_id,
      services,
      package,
      customer_id,
    } = data;

    // Generate a new application ID
    clientApplication.generateApplicationID(
      branch_id,
      (err, new_application_id) => {
        if (err) {
          return callback(err, null);
        }

        const sql = `
        INSERT INTO \`client_applications\` (
          \`application_id\`,
          \`name\`,
          \`attach_documents\`,
          \`employee_id\`,
          \`spoc\`,
          \`location\`,
          \`batch_number\`,
          \`sub_client\`,
          \`photo\`,
          \`branch_id\`,
          \`services\`,
          \`package\`,
          \`customer_id\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

        const values = [
          new_application_id,
          name,
          attach_documents,
          employee_id,
          spoc,
          location,
          batch_number,
          sub_client,
          photo,
          branch_id,
          services || "",
          package || "",
          customer_id,
        ];

        pool.query(sql, values, (err, results) => {
          if (err) {
            console.error("Database query error:", err);
            return callback(err, null);
          }
          callback(null, { results, new_application_id });
        });
      }
    );
  },

  list: (branch_id, callback) => {
    const sql = "SELECT * FROM `client_applications` WHERE `branch_id` = ?";
    pool.query(sql, [branch_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  checkUniqueEmpId: (clientUniqueEmpId, callback) => {
    const sql = `
      SELECT COUNT(*) AS count
      FROM \`client_applications\`
      WHERE \`employee_id\` = ?
    `;
    pool.query(sql, [clientUniqueEmpId], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ message: "Database query error", error: err }, null);
      }

      const count = results[0].count;
      callback(null, count > 0);
    });
  },

  checkUniqueEmpIdByClientApplicationID: (
    application_id,
    clientUniqueEmpId,
    callback
  ) => {
    const sql = `
      SELECT COUNT(*) AS count
      FROM \`client_applications\`
      WHERE \`employee_id\` = ? AND id = ?
    `;
    pool.query(sql, [clientUniqueEmpId, application_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ message: "Database query error", error: err }, null);
      }

      const count = results[0].count;
      callback(null, count > 0);
    });
  },

  getClientApplicationById: (id, callback) => {
    const sql = "SELECT * FROM `client_applications` WHERE id = ?";
    pool.query(sql, [id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results[0]);
    });
  },

  update: (data, client_application_id, callback) => {
    const {
      name,
      attach_documents,
      employee_id,
      spoc,
      location,
      batch_number,
      sub_client,
      photo,
      services,
      package,
    } = data;

    const sql = `
      UPDATE \`client_applications\`
      SET
        \`name\` = ?,
        \`attach_documents\` = ?,
        \`employee_id\` = ?,
        \`spoc\` = ?,
        \`location\` = ?,
        \`batch_number\` = ?,
        \`sub_client\` = ?,
        \`photo\` = ?,
        \`services\` = ?,
        \`package\` = ?
      WHERE
        \`id\` = ?
    `;

    const values = [
      name,
      attach_documents,
      employee_id,
      spoc,
      location,
      batch_number,
      sub_client,
      photo,
      services,
      package,
      client_application_id,
    ];

    pool.query(sql, values, (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  updateStatus: (status, client_application_id, callback) => {
    const sql = `
      UPDATE \`client_applications\`
      SET
        \`status\` = ?
      WHERE
        \`id\` = ?
    `;

    pool.query(sql, [status, client_application_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  delete: (id, callback) => {
    const sql = "DELETE FROM `client_applications` WHERE `id` = ?";
    pool.query(sql, [id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },
};

module.exports = clientApplication;
