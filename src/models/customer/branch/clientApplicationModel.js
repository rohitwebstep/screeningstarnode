const {
  pool,
  startConnection,
  connectionRelease,
} = require("../../../config/db");

const clientApplication = {
  generateApplicationID: (branch_id, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      // Step 1: Fetch customer_id from branches using branch_id
      const getCustomerIdSql = `
        SELECT \`customer_id\`
        FROM \`branches\`
        WHERE \`id\` = ?
      `;

      connection.query(getCustomerIdSql, [branch_id], (err, branchResults) => {
        if (err) {
          console.error("Error fetching customer_id from branches:", err);
          connectionRelease(connection);
          return callback(err, null);
        }

        if (branchResults.length === 0) {
          connectionRelease(connection);
          return callback(new Error("Branch not found"), null);
        }

        const customer_id = branchResults[0].customer_id;

        // Step 2: Fetch client_unique_id from customers using customer_id
        const getClientUniqueIdSql = `
          SELECT \`client_unique_id\`
          FROM \`customers\`
          WHERE \`id\` = ?
        `;

        connection.query(
          getClientUniqueIdSql,
          [customer_id],
          (err, customerResults) => {
            if (err) {
              console.error(
                "Error fetching client_unique_id from customers:",
                err
              );
              connectionRelease(connection);
              return callback(err, null);
            }

            if (customerResults.length === 0) {
              connectionRelease(connection);
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

            const applicationIdParam = `${client_unique_id}%`;

            // Execute the query
            connection.query(
              getApplicationIdSql,
              [applicationIdParam],
              (err, applicationResults) => {
                connectionRelease(connection);
                if (err) {
                  console.error("Error fetching application ID:", err);
                  return callback(err, null);
                }

                let new_application_id;

                if (applicationResults.length === 0) {
                  new_application_id = `${client_unique_id}-1`;
                } else {
                  const latest_application_id =
                    applicationResults[0].application_id;
                  const parts = latest_application_id.split("-");

                  if (parts.length === 3) {
                    const numberPart = parseInt(parts[2], 10);
                    new_application_id = `${parts[0]}-${parts[1]}-${
                      numberPart + 1
                    }`;
                  } else {
                    new_application_id = `${client_unique_id}-1`;
                  }
                }

                callback(null, new_application_id);
              }
            );
          }
        );
      });
    });
  },

  create: (data, callback) => {
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

    // Generate a new application ID
    clientApplication.generateApplicationID(
      branch_id,
      (err, new_application_id) => {
        if (err) {
          console.error("Error generating new application ID:", err);
          return callback(err, null);
        }

        startConnection((err, connection) => {
          if (err) {
            return callback(
              { message: "Failed to connect to the database", error: err },
              null
            );
          }
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

          connection.query(sql, values, (err, results) => {
            connectionRelease(connection);
            if (err) {
              console.error("Database query error:", err);
              return callback(err, null);
            }

            console.log("Database query successful. Results:", results);
            callback(null, { results, new_application_id });
          });
        });
      }
    );
  },

  // Other methods remain unchanged, but should include startConnection and connectionRelease
  list: (branch_id, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      const sqlClient =
        "SELECT * FROM client_applications WHERE branch_id = ? ORDER BY created_at DESC";

      connection.query(sqlClient, [branch_id], (err, clientResults) => {
        if (err) {
          console.error("Database query error:", err);
          connectionRelease(connection);
          return callback(err, null);
        }

        const finalResults = [];
        const cmtPromises = clientResults.map((clientApp) => {
          return new Promise((resolve, reject) => {
            const sqlCmt =
              "SELECT * FROM cmt_applications WHERE client_application_id = ?";
            connection.query(sqlCmt, [clientApp.id], (err, cmtResults) => {
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

              finalResults.push({
                ...clientApp,
                cmtApplications: cmtData.length > 0 ? cmtData : [],
              });
              resolve();
            });
          });
        });

        Promise.all(cmtPromises)
          .then(() => {
            connectionRelease(connection);
            callback(null, finalResults);
          })
          .catch((err) => {
            connectionRelease(connection);
            callback(err, null);
          });
      });
    });
  },

  checkUniqueEmpId: (clientUniqueEmpId, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      const sql = `
      SELECT COUNT(*) AS count
      FROM \`client_applications\`
      WHERE \`employee_id\` = ?
    `;
      connection.query(sql, [clientUniqueEmpId], (err, results) => {
        connectionRelease(connection); // Ensure the connection is released

        if (err) {
          console.error("Database query error:", err);
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

  checkUniqueEmpIdByClientApplicationID: (
    application_id,
    clientUniqueEmpId,
    callback
  ) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      const sql = `
      SELECT COUNT(*) AS count
      FROM \`client_applications\`
      WHERE \`employee_id\` = ? AND id = ?
    `;
      connection.query(
        sql,
        [clientUniqueEmpId, application_id],
        (err, results) => {
          connectionRelease(connection); // Ensure the connection is released

          if (err) {
            console.error("Database query error:", err);
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

  getClientApplicationById: (id, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      const sql = "SELECT * FROM `client_applications` WHERE id = ?";
      connection.query(sql, [id], (err, results) => {
        connectionRelease(connection); // Ensure the connection is released

        if (err) {
          console.error("Database query error:", err);
          return callback(err, null);
        }
        callback(null, results[0]);
      });
    });
  },

  upload: (client_application_id, db_column, savedImagePaths, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      const sqlUpdateCustomer = `
      UPDATE client_applications 
      SET ${db_column} = ?
      WHERE id = ?
    `;

      // Prepare the parameters for the query
      const queryParams = [savedImagePaths, client_application_id];

      connection.query(sqlUpdateCustomer, queryParams, (err, results) => {
        connectionRelease(connection); // Ensure the connection is released

        if (err) {
          // Return error details and the final query with parameters
          return callback(false, {
            error: "Database error occurred.",
            details: err, // Include error details for debugging
            query: sqlUpdateCustomer,
            params: queryParams, // Return the parameters used in the query
          });
        }

        // Check if any rows were affected by the update
        if (results.affectedRows > 0) {
          return callback(true, results); // Success with results
        } else {
          // No rows updated, return a specific message along with the query details
          return callback(false, {
            error: "No rows updated. Please check the client application ID.",
            details: results,
            query: sqlUpdateCustomer,
            params: queryParams, // Return the parameters used in the query
          });
        }
      });
    });
  },

  update: (data, client_application_id, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      const {
        name,
        employee_id,
        spoc,
        location,
        batch_number,
        sub_client,
        services,
        package,
      } = data;

      const sql = `
      UPDATE \`client_applications\`
      SET
        \`name\` = ?,
        \`employee_id\` = ?,
        \`spoc\` = ?,
        \`location\` = ?,
        \`batch_number\` = ?,
        \`sub_client\` = ?,
        \`services\` = ?,
        \`package\` = ?
      WHERE
        \`id\` = ?
    `;

      const values = [
        name,
        employee_id,
        spoc,
        location,
        batch_number,
        sub_client,
        services,
        package,
        client_application_id,
      ];

      connection.query(sql, values, (err, results) => {
        connectionRelease(connection); // Ensure the connection is released

        if (err) {
          console.error("Database query error:", err);
          return callback(err, null);
        }
        callback(null, results);
      });
    });
  },

  updateStatus: (status, client_application_id, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      const sql = `
      UPDATE \`client_applications\`
      SET
        \`status\` = ?
      WHERE
        \`id\` = ?
    `;

      connection.query(sql, [status, client_application_id], (err, results) => {
        connectionRelease(connection); // Ensure the connection is released

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

      // Step 1: Retrieve services from client_applications where id = id
      const sqlGetServices =
        "SELECT services FROM `client_applications` WHERE `id` = ?";
      connection.query(sqlGetServices, [id], (err, results) => {
        if (err) {
          connectionRelease(connection); // Ensure the connection is released
          console.error("Database query error:", err);
          return callback(err, null);
        }

        if (results.length === 0) {
          connectionRelease(connection); // Ensure the connection is released
          return callback(
            { message: "No client application found with the given ID" },
            null
          );
        }

        // Get the services string and split it into an array
        const services = results[0].services;
        const servicesArray = services
          .split(",")
          .map((service) => parseInt(service.trim())); // Parse to integers

        const jsonResults = []; // Array to hold JSON results
        let completedQueries = 0; // Counter to track completed queries

        // Step 2: Loop through each service ID and query the report_forms table
        servicesArray.forEach((serviceId) => {
          const sqlGetJson =
            "SELECT json FROM report_forms WHERE service_id = ?";
          connection.query(sqlGetJson, [serviceId], (err, jsonQueryResults) => {
            if (err) {
              console.error(
                "Database query error for service ID",
                serviceId,
                ":",
                err
              );
            } else if (jsonQueryResults.length > 0) {
              jsonResults.push(jsonQueryResults[0].json); // Store the JSON result
            }
            const jsonData = JSON.parse(jsonResults);
            const dbTable = jsonData.db_table;
            console.log(`dbTable - `,dbTable);
            return;
            // Increment the counter and check if all queries are done
            completedQueries++;
            if (completedQueries === servicesArray.length) {
              // Step 3: Now delete the client_application entry
              const sqlDelete =
                "DELETE FROM `client_applications` WHERE `id` = ?";
              connection.query(sqlDelete, [id], (err, deleteResults) => {
                connectionRelease(connection); // Ensure the connection is released

                if (err) {
                  console.error("Database query error during deletion:", err);
                  return callback(err, null);
                }

                // Return both the deleted services and the results from json queries
                callback(null, {
                  deletedServices: servicesArray,
                  jsonResults,
                  deleteResults,
                });
              });
            }
          });
        });
      });
    });
  },
};

module.exports = clientApplication;
