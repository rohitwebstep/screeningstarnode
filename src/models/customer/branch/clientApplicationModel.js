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
    console.log("Create function initiated with data:", data);

    const {
      name,
      employee_id,
      spoc,
      location,
      batch_number,
      sub_client,
      branch_id,
      services,
      package,
      customer_id,
    } = data;

    const serviceIds =
      Array.isArray(services) && services.length > 0
        ? services.map((id) => id.trim()).join(",")
        : "";

    const packageIds =
      Array.isArray(package) && package.length > 0
        ? package.map((id) => id.trim()).join(",")
        : "";
    console.log("Processed Services:", serviceIds);
    console.log("Processed Package:", packageIds);

    // Generate a new application ID
    console.log("Generating new application ID for branch:", branch_id);
    clientApplication.generateApplicationID(
      branch_id,
      (err, new_application_id) => {
        if (err) {
          console.error("Error generating new application ID:", err);
          return callback(err, null);
        }

        console.log("Generated new application ID:", new_application_id);

        const sql = `
        INSERT INTO \`client_applications\` (
          \`application_id\`,
          \`name\`,
          \`employee_id\`,
          \`spoc\`,
          \`location\`,
          \`batch_number\`,
          \`sub_client\`,
          \`branch_id\`,
          \`services\`,
          \`package\`,
          \`customer_id\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

        const values = [
          new_application_id,
          name,
          employee_id,
          spoc,
          location,
          batch_number,
          sub_client,
          branch_id,
          serviceIds,
          packageIds,
          customer_id,
        ];

        console.log("SQL Query:", sql);
        console.log("Query Values:", values);

        pool.query(sql, values, (err, results) => {
          if (err) {
            console.error("Database query error:", err);
            return callback(err, null);
          }

          console.log("Database query successful. Results:", results);
          callback(null, { results, new_application_id });
        });
      }
    );
  },

  list: (branch_id, callback) => {
    // First query to fetch data from client_applications
    const sqlClient = "SELECT * FROM client_applications WHERE branch_id = ?";

    pool.query(sqlClient, [branch_id], (err, clientResults) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }

      // Array to hold the final results
      const finalResults = [];

      // Loop through clientResults to fetch data from cmt_applications
      const cmtPromises = clientResults.map((clientApp) => {
        return new Promise((resolve, reject) => {
          const sqlCmt =
            "SELECT * FROM cmt_applications WHERE client_application_id = ?";
          pool.query(sqlCmt, [clientApp.id], (err, cmtResults) => {
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

            // Combine client application with cmt data, ensuring cmtApplications is an array
            finalResults.push({
              ...clientApp, // Include all client application fields
              cmtApplications: cmtData.length > 0 ? cmtData : [], // Use empty array if no cmt records
            });
            resolve();
          });
        });
      });

      // Wait for all cmt application queries to complete
      Promise.all(cmtPromises)
        .then(() => {
          callback(null, finalResults);
        })
        .catch((err) => {
          callback(err, null);
        });
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

  upload: (client_application_id, db_column, savedImagePaths, callback) => {
    console.log("Upload function initiated");
    console.log("Client Application ID:", client_application_id);
    console.log("Database Column:", db_column);
    console.log("Saved Image Paths:", savedImagePaths);

    const sqlUpdateCustomer = `
      UPDATE client_applications 
      SET ${db_column} = ?
      WHERE id = ?
    `;

    console.log("SQL Update Query:", sqlUpdateCustomer);
    console.log("Query Parameters:", [savedImagePaths, client_application_id]);

    pool.query(
      sqlUpdateCustomer,
      [savedImagePaths, client_application_id],
      (err, results) => {
        if (err) {
          console.error("Error updating customer meta:", err);
          return callback(false); // Return false if there's an error
        }

        // Check if any rows were affected by the update
        if (results.affectedRows > 0) {
          console.log("Database update successful. Results:", results);
          return callback(true); // Return true if the update was successful
        } else {
          console.log(
            "No rows were updated. Client Application ID may not exist."
          );
          return callback(false); // Return false if no rows were updated
        }
      }
    );
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
