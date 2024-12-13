const crypto = require("crypto");
const { pool, startConnection, connectionRelease } = require("../../config/db");

// Function to hash the password using MD5
const hashPassword = (password) =>
  crypto.createHash("md5").update(password).digest("hex");

const recordTrackerModel = {
  recordTracker: (customerId, month, year, callback) => {
    // Start connection to the database
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      // Select only necessary customer details
      const customerQuery = `
      SELECT 
        c.id, 
        c.client_unique_id, 
        c.name, 
        c.emails, 
        c.mobile, 
        c.services, 
        cm.address, 
        cm.contact_person_name, 
        cm.escalation_point_contact, 
        cm.single_point_of_contact, 
        cm.gst_number,
        cm.payment_contact_person,
        cm.state,
        cm.state_code
      FROM customers c
      LEFT JOIN customer_metas cm ON cm.customer_id = c.id
      WHERE c.id = ?;
    `;

      connection.query(customerQuery, [customerId], (err, customerResults) => {
        if (err) {
          connectionRelease(connection);
          console.error(
            "Database query error while fetching customer information:",
            err
          );
          return callback(err, null);
        }

        // Check if customer exists
        if (customerResults.length === 0) {
          connectionRelease(connection);
          return callback(new Error("Customer not found."), null);
        }

        const customerData = customerResults[0];

        let servicesData;
        try {
          servicesData = JSON.parse(customerData.services);
        } catch (parseError) {
          connectionRelease(connection);
          return callback(parseError, null);
        }

        const updateServiceTitles = async () => {
          try {
            for (const group of servicesData) {
              for (const service of group.services) {
                const serviceSql = `SELECT title FROM services WHERE id = ?`;

                const [rows] = await new Promise((resolve, reject) => {
                  connection.query(
                    serviceSql,
                    [service.serviceId],
                    (err, results) => {
                      if (err) {
                        console.error("Error querying service title:", err);
                        return reject(err);
                      }
                      resolve(results);
                    }
                  );
                });
                if (rows && rows.title) {
                  service.serviceTitle = rows.title;
                }
              }
            }
          } catch (err) {
            console.error("Error updating service titles:", err);
          } finally {
            connectionRelease(connection);

            customerData.services = JSON.stringify(servicesData);
            const applicationQuery = `
            SELECT
              ca.id,
              ca.branch_id,
              ca.application_id,
              ca.employee_id,
              ca.name,
              ca.services,
              ca.status,
              ca.created_at,
              cmt.report_date
            FROM 
              client_applications ca
            LEFT JOIN 
              cmt_applications cmt ON cmt.client_application_id = ca.id
            WHERE 
              (ca.status = 'completed' OR ca.status = 'closed') 
              AND ca.customer_id = ?
              AND MONTH(cmt.report_date) = ?
              AND YEAR(cmt.report_date) = ? 
            ORDER BY ca.branch_id;
          `;

            connection.query(
              applicationQuery,
              [customerId, month, year],
              (err, applicationResults) => {
                if (err) {
                  connectionRelease(connection);
                  console.error(
                    "Database query error while fetching applications:",
                    err
                  );
                  return callback(err, null);
                }

                // Map to group applications by branch ID
                const branchApplicationsMap = {};

                // Organize applications by branch
                applicationResults.forEach((application) => {
                  const branchId = application.branch_id;
                  // Initialize the branch entry if it does not exist
                  if (!branchApplicationsMap[branchId]) {
                    branchApplicationsMap[branchId] = {
                      id: branchId,
                      applications: [],
                    };
                  }

                  // Initialize statusDetails if not already initialized
                  application.statusDetails = application.statusDetails || [];

                  // Push the application into the corresponding branch's array
                  branchApplicationsMap[branchId].applications.push(
                    application
                  );
                });

                // Prepare to fetch branch details for each unique branch ID
                const branchesWithApplications = [];
                const branchIds = Object.keys(branchApplicationsMap);
                const branchPromises = branchIds.map((branchId) => {
                  return new Promise((resolve, reject) => {
                    const branchQuery = `
                  SELECT id, name 
                  FROM branches 
                  WHERE id = ?;
                `;

                    connection.query(
                      branchQuery,
                      [branchId],
                      (err, branchResults) => {
                        if (err) {
                          return reject(err);
                        }
                        if (branchResults.length > 0) {
                          const branch = branchResults[0];
                          branchesWithApplications.push({
                            id: branch.id,
                            name: branch.name,
                            applications:
                              branchApplicationsMap[branchId].applications,
                          });
                        }
                        resolve();
                      }
                    );
                  });
                });

                // Process each application's services and fetch status from the appropriate table
                const applicationServicePromises = applicationResults.map(
                  (application) => {
                    const services = application.services.split(",");
                    const servicePromises = services.map((serviceId) => {
                      return new Promise((resolve, reject) => {
                        const reportFormQuery = `
                        SELECT json
                        FROM report_forms
                        WHERE service_id = ?;
                      `;
                        connection.query(
                          reportFormQuery,
                          [serviceId],
                          (err, reportFormResults) => {
                            if (err) {
                              return reject(err);
                            }

                            if (reportFormResults.length > 0) {
                              // Parse JSON to extract db_table
                              const reportFormJson = JSON.parse(
                                reportFormResults[0].json
                              );
                              const dbTable = reportFormJson.db_table;

                              // Query to find the column that starts with "additional_fee"
                              const additionalFeeColumnQuery = `
                              SELECT COLUMN_NAME 
                              FROM INFORMATION_SCHEMA.COLUMNS 
                              WHERE TABLE_NAME = '${dbTable}' AND COLUMN_NAME LIKE 'additional_fee%';
                            `;

                              connection.query(
                                additionalFeeColumnQuery,
                                (err, columnResults) => {
                                  if (err) {
                                    console.error(
                                      `Error fetching additional_fee column: ${err.message}`
                                    );
                                    return reject(err);
                                  }

                                  // Identify the additional_fee column
                                  const additionalFeeColumn =
                                    columnResults.length > 0
                                      ? columnResults[0].COLUMN_NAME
                                      : null;

                                  // Construct the query with a fixed "status" column and dynamic "additional_fee" column
                                  const statusQuery = `
                                SELECT status${additionalFeeColumn
                                      ? `, ${additionalFeeColumn}`
                                      : ""
                                    }
                                FROM ${dbTable}
                                WHERE client_application_id = ?;
                              `;

                                  connection.query(
                                    statusQuery,
                                    [application.id],
                                    (err, statusResults) => {
                                      console.warn(
                                        `SELECT status${additionalFeeColumn
                                          ? `, ${additionalFeeColumn}`
                                          : ""
                                        } FROM ${dbTable} WHERE client_application_id = ${application.id
                                        };`
                                      );
                                      if (err) {
                                        if (err.code === "ER_NO_SUCH_TABLE") {
                                          console.warn(
                                            `Table ${dbTable} does not exist. Skipping...`
                                          );
                                          return resolve();
                                        }
                                        return reject(err);
                                      }

                                      // Append the status and additional_fee to the application object
                                      application.statusDetails.push({
                                        serviceId,
                                        status:
                                          statusResults.length > 0
                                            ? statusResults[0].status
                                            : null,
                                        additionalFee:
                                          additionalFeeColumn &&
                                            statusResults.length > 0
                                            ? statusResults[0][
                                            additionalFeeColumn
                                            ]
                                            : null,
                                      });

                                      resolve();
                                    }
                                  );
                                }
                              );
                            } else {
                              resolve();
                            }
                          }
                        );
                      });
                    });

                    return Promise.all(servicePromises);
                  }
                );

                // Wait for all service-related queries to complete
                Promise.all(applicationServicePromises)
                  .then(() => Promise.all(branchPromises))
                  .then(() => {
                    // Compile the final results
                    const finalResults = {
                      customerInfo: customerData,
                      applicationsByBranch: branchesWithApplications,
                    };
                    connectionRelease(connection);
                    callback(null, finalResults);
                  })
                  .catch((err) => {
                    connectionRelease(connection);
                    console.error(
                      "Error while fetching branch or service details:",
                      err
                    );
                    callback(err, null);
                  });
              }
            );
          }
        };

        updateServiceTitles();
      });
    });
  },
};

module.exports = recordTrackerModel;
