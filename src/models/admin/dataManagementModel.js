const crypto = require("crypto");
const { pool, startConnection, connectionRelease } = require("../../config/db");

// Function to hash the password using MD5
const hashPassword = (password) =>
  crypto.createHash("md5").update(password).digest("hex");

const Customer = {
  list: (filter_status, callback) => {
    let customers_id = [];

    startConnection((err, connection) => {
      if (err) {
        console.error("Connection error:", err);
        return callback(err, null);
      }

      // If no filter_status is provided, proceed with the final SQL query without filters
      const finalSql = `
          WITH BranchesCTE AS (
              SELECT 
                  b.id AS branch_id,
                  b.customer_id
              FROM 
                  branches b
          )
          SELECT 
              customers.client_unique_id,
              customers.name,
              customer_metas.client_spoc_id,
              customer_metas.tat_days,
              customer_metas.single_point_of_contact,
              customers.id AS main_id,
              COALESCE(branch_counts.branch_count, 0) AS branch_count,
              COALESCE(application_counts.application_count, 0) AS application_count
          FROM 
              customers
          LEFT JOIN 
              customer_metas ON customers.id = customer_metas.customer_id
          LEFT JOIN (
              SELECT 
                  customer_id, 
                  COUNT(*) AS branch_count
              FROM 
                  branches
              GROUP BY 
                  customer_id
          ) AS branch_counts ON customers.id = branch_counts.customer_id
          LEFT JOIN (
              SELECT 
                  b.customer_id, 
                  COUNT(ca.id) AS application_count,
                  MAX(ca.created_at) AS latest_application_date
              FROM 
                  BranchesCTE b
              INNER JOIN 
                  client_applications ca ON b.branch_id = ca.branch_id
              WHERE ca.is_data_qc = 0
              GROUP BY 
                  b.customer_id
          ) AS application_counts ON customers.id = application_counts.customer_id
          WHERE 
              customers.status = 1
              AND COALESCE(application_counts.application_count, 0) > 0
          ORDER BY 
              application_counts.latest_application_date DESC;
        `;
      connection.query(finalSql, async (err, results) => {
        connectionRelease(connection); // Always release the connection
        if (err) {
          console.error("Database query error:16", err);
          return callback(err, null);
        }

        // Process each result to fetch client_spoc names
        for (const result of results) {
          const spocIdString = result.client_spoc_id;
          if (spocIdString) {
            // Ensure client_spoc_id is treated as a string and split by commas
            const spocIds = spocIdString
              .toString()
              .split(",")
              .map((id) => id.trim());

            // Query client_spoc table to fetch names for these IDs
            const spocQuery = `
                SELECT name 
                FROM client_spocs
                WHERE id IN (${spocIds.map(() => "?").join(",")});
              `;

            try {
              const spocNames = await new Promise((resolve, reject) => {
                connection.query(spocQuery, spocIds, (spocErr, spocResults) => {
                  if (spocErr) {
                    return reject(spocErr);
                  }
                  resolve(spocResults.map((spoc) => spoc.name || "N/A"));
                });
              });

              // Attach spoc names to the current result
              result.client_spoc_name = spocNames;
            } catch (spocErr) {
              console.error("Error fetching client_spoc names:", spocErr);
              result.client_spoc_name = null; // Default to null if error occurs
            }
          } else {
            // If client_spoc_id is null or empty
            result.client_spoc_name = null;
          }

          if (result.branch_count === 1) {
            // Query client_spoc table to fetch names for these IDs
            const headBranchQuery = `SELECT id, is_head FROM \`branches\` WHERE \`customer_id\` = ? AND \`is_head\` = ?`;

            try {
              const headBranchID = await new Promise((resolve, reject) => {
                connection.query(
                  headBranchQuery,
                  [result.main_id, 1], // Properly pass query parameters as an array
                  (headBranchErr, headBranchResults) => {
                    if (headBranchErr) {
                      return reject(headBranchErr);
                    }
                    resolve(
                      headBranchResults.length > 0
                        ? headBranchResults[0].id
                        : null
                    );
                  }
                );
              });

              // Attach spoc names to the current result
              result.head_branch_id = headBranchID;
            } catch (headBranchErr) {
              console.error("Error fetching head branch id:", headBranchErr);
              result.head_branch_id = null; // Default to null if an error occurs
            }
          }
        }

        callback(null, results);
      });
    });
  },

  listByCustomerID: (customer_id, filter_status, callback) => {
    startConnection((err, connection) => {
      if (err) {
        console.error("Connection error:", err);
        return callback(err, null);
      }

      // Base SQL query with mandatory condition for status
      let sql = `
        SELECT b.id AS branch_id, 
               b.name AS branch_name, 
               COUNT(ca.id) AS application_count,
               MAX(ca.created_at) AS latest_application_date
        FROM client_applications ca
        INNER JOIN branches b ON ca.branch_id = b.id
        WHERE b.customer_id = ? AND ca.is_data_qc = 0`;

      // Array to hold query parameters
      const queryParams = [customer_id];

      // Check if filter_status is provided
      if (filter_status && filter_status !== null && filter_status !== "") {
        sql += ` AND ca.status = ?`;
        queryParams.push(filter_status);
      }

      sql += ` GROUP BY b.id, b.name 
                ORDER BY latest_application_date DESC;`;

      // Execute the query
      connection.query(sql, queryParams, (err, results) => {
        connectionRelease(connection); // Always release the connection
        if (err) {
          console.error("Database query error: 17", err);
          return callback(err, null);
        }
        callback(null, results);
      });
    });
  },

  applicationListByBranch: (filter_status, branch_id, status, callback) => {
    // Start a connection
    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      // Base SQL query with JOINs to fetch client_spoc_name and cmt_applications data if it exists
      let sql = `
        SELECT 
          ca.*, 
          ca.id AS main_id, 
          cs.name AS client_spoc_name,
          cmt.first_insufficiency_marks,
          cmt.first_insuff_date,
          cmt.first_insuff_reopened_date,
          cmt.second_insufficiency_marks,
          cmt.second_insuff_date,
          cmt.second_insuff_reopened_date,
          cmt.third_insufficiency_marks,
          cmt.third_insuff_date,
          cmt.third_insuff_reopened_date,
          cmt.overall_status,
          cmt.is_verify,
          cmt.report_date,
          cmt.report_status,
          cmt.report_type,
          cmt.qc_done_by,
          qc_admin.name AS qc_done_by_name,
          cmt.delay_reason,
          cmt.report_generate_by,
          report_admin.name AS report_generated_by_name,
          cmt.case_upload
        FROM 
          \`client_applications\` ca
        LEFT JOIN 
          \`client_spocs\` cs 
        ON 
          ca.client_spoc_id = cs.id
        LEFT JOIN 
          \`cmt_applications\` cmt 
        ON 
          ca.id = cmt.client_application_id
        LEFT JOIN 
          \`admins\` AS qc_admin 
        ON 
          qc_admin.id = cmt.qc_done_by
        LEFT JOIN 
          \`admins\` AS report_admin 
        ON 
          report_admin.id = cmt.report_generate_by
        WHERE 
          ca.\`branch_id\` = ? AND ca.\`is_data_qc\` = 0`;

      const params = [branch_id]; // Start with branch_id

      // Check if filter_status is provided
      if (filter_status && filter_status.trim() !== "") {
        sql += ` AND ca.\`status\` = ?`; // Add filter for filter_status
        params.push(filter_status);
      }

      // Check if status is provided and add the corresponding condition
      if (typeof status === "string" && status.trim() !== "") {
        sql += ` AND ca.\`status\` = ?`; // Add filter for status
        params.push(status);
      }

      sql += ` ORDER BY ca.\`created_at\` DESC;`;

      // Execute the query using the connection
      connection.query(sql, params, (err, results) => {
        connectionRelease(connection); // Release the connection
        if (err) {
          console.error("Database query error: 18", err);
          return callback(err, null);
        }
        callback(null, results);
      });
    });
  },

  applicationByID: (application_id, branch_id, callback) => {
    // Start a connection
    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      // Use a parameterized query to prevent SQL injection
      const sql =
        "SELECT * FROM `client_applications` WHERE `id` = ? AND `branch_id` = ? AND `is_data_qc` = 0 ORDER BY `created_at` DESC";

      connection.query(sql, [application_id, branch_id], (err, results) => {
        connectionRelease(connection); // Release the connection
        if (err) {
          console.error("Database query error: 19", err);
          return callback(err, null);
        }
        // Assuming `results` is an array, and we want the first result
        callback(null, results[0] || null); // Return single application or null if not found
      });
    });
  },

  getCMTApplicationById: (client_application_id, callback) => {
    // Start a connection
    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      const sql =
        "SELECT `month_year`,`initiation_date`,`organization_name`,`verification_purpose`,`employee_id`,`client_code`,`applicant_name`,`contact_number`,`contact_number2`,`father_name`,`dob`,`gender`,`marital_status`,`address`,`landmark`,`residence_mobile_number`,`state`,`permanent_address`,`permanent_sender_name`,`permanent_receiver_name`,`permanent_landmark`,`permanent_pin_code`,`permanent_state`,`spouse_name`,`Nationality`,`QC_Date`,`QC_Analyst_Name`,`Data_Entry_Analyst_Name`,`Date_of_Data`,`insuff`,`address_house_no`,`address_floor`,`address_cross`,`address_street`,`address_main`,`address_area`,`address_locality`,`address_city`,`address_landmark`,`address_taluk`,`address_district`,`address_state`,`address_pin_code`,`permanent_address_house_no`,`permanent_address_floor`,`permanent_address_cross`,`permanent_address_street`,`permanent_address_main`,`permanent_address_area`,`permanent_address_locality`,`permanent_address_city`,`permanent_address_landmark`,`permanent_address_taluk`,`permanent_address_district`,`permanent_address_state`,`permanent_address_pin_code` FROM `cmt_applications` WHERE `client_application_id` = ?";
      connection.query(sql, [`${client_application_id}`], (err, results) => {
        connectionRelease(connection); // Release connection
        if (err) {
          console.error("Database query error: 23", err);
          return callback(err, null);
        }
        callback(null, results[0] || null); // Return the first result or null if not found
      });
    });
  },

  getCustomerById: (id, callback) => {
    const sql = "SELECT * FROM `customers` WHERE `id` = ?";
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      connection.query(sql, [id], (err, results) => {
        connectionRelease(connection);
        if (err) {
          console.error("Database query error: 60", err);
          return callback(err, null);
        }
        if (results.length === 0) {
          connectionRelease(connection);
          return callback(null, { message: "No customer data found" });
        }

        const customerData = results[0];

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
            callback(null, customerData);
          }
        };

        updateServiceTitles();
      });
    });
  },

  getCMTAnnexureByApplicationId: (
    client_application_id,
    db_table,
    callback
  ) => {
    // Start a connection
    startConnection((err, connection) => {
      if (err) {
        return callback(err);
      }

      // 1. Check if the table exists
      const checkTableSql = `
        SELECT COUNT(*) AS count 
        FROM information_schema.tables 
        WHERE table_schema = ? AND table_name = ?`;

      connection.query(
        checkTableSql,
        [process.env.DB_NAME, db_table],
        (tableErr, tableResults) => {
          if (tableErr) {
            console.error("Error checking table existence:", tableErr);
            connectionRelease(connection); // Release connection
            return callback(tableErr);
          }
          if (tableResults[0].count === 0) {
            const createTableSql = `
              CREATE TABLE \`${db_table}\` (
                \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
                \`cmt_id\` bigint(20) DEFAULT NULL,
                \`client_application_id\` bigint(20) NOT NULL,
                \`branch_id\` int(11) NOT NULL,
                \`customer_id\` int(11) NOT NULL,
                \`status\` VARCHAR(100) NOT NULL,
                \`team_management_docs\` LONGTEXT NOT NULL,
                \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`),
                KEY \`client_application_id\` (\`client_application_id\`),
                KEY \`cmt_application_customer_id\` (\`customer_id\`),
                KEY \`cmt_application_cmt_id\` (\`cmt_id\`),
                CONSTRAINT \`fk_${db_table}_client_application_id\` FOREIGN KEY (\`client_application_id\`) REFERENCES \`client_applications\` (\`id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_${db_table}_customer_id\` FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\` (\`id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_${db_table}_cmt_id\` FOREIGN KEY (\`cmt_id\`) REFERENCES \`cmt_applications\` (\`id\`) ON DELETE CASCADE
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

            connection.query(createTableSql, (createErr) => {
              if (createErr) {
                console.error(`Error creating table "${db_table}":`, createErr);
                connectionRelease(connection); // Release connection
                return callback(createErr);
              }
              fetchData();
            });
          } else {
            fetchData();
          }

          function fetchData() {
            const sql = `SELECT * FROM \`${db_table}\` WHERE \`client_application_id\` = ?`;
            connection.query(
              sql,
              [client_application_id],
              (queryErr, results) => {
                connectionRelease(connection); // Release connection
                if (queryErr) {
                  console.error("Error executing query:", queryErr);
                  return callback(queryErr);
                }
                const response = results.length > 0 ? results[0] : null;
                callback(null, response);
              }
            );
          }
        }
      );
    });
  },

  updateDataQC: (data, callback) => {
    const { application_id, data_qc } = data;

    // If no duplicates are found, proceed with updating the admin record
    const sql = `
        UPDATE \`client_applications\` 
        SET 
          \`is_data_qc\` = ?
        WHERE \`id\` = ?
      `;

    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(sql, [data_qc, application_id], (queryErr, results) => {
        connectionRelease(connection); // Release the connection

        if (queryErr) {
          console.error("Database query error: 51", queryErr);
          return callback(queryErr, null);
        }
        callback(null, results);
      });
    });
  },

  submit: (
    mainJson,
    client_application_id,
    branch_id,
    customer_id,
    callback
  ) => {
    const fields = Object.keys(mainJson).map((field) => field.toLowerCase());

    // Start a connection
    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      // 1. Check for existing columns in cmt_applications
      const checkColumnsSql = `SHOW COLUMNS FROM \`cmt_applications\``;

      connection.query(checkColumnsSql, (err, results) => {
        if (err) {
          console.error("Error checking columns:", err);
          connectionRelease(connection); // Release connection
          return callback(err, null);
        }

        // Extract column names from the results (use 'Field' instead of 'COLUMN_NAME')
        const existingColumns = results.map((row) => row.Field);

        // Filter out missing columns
        const missingColumns = fields.filter(
          (field) => !existingColumns.includes(field)
        );
        // 2. Add missing columns if any
        const addMissingColumns = () => {
          if (missingColumns.length > 0) {
            const alterQueries = missingColumns.map((column) => {
              return `ALTER TABLE cmt_applications ADD COLUMN \`${column}\` LONGTEXT`;
            });

            // Run all ALTER statements sequentially
            const alterPromises = alterQueries.map(
              (query) =>
                new Promise((resolve, reject) => {
                  connection.query(query, (alterErr) => {
                    if (alterErr) {
                      console.error("Error adding column:", alterErr);
                      return reject(alterErr);
                    }
                    resolve();
                  });
                })
            );

            return Promise.all(alterPromises);
          }
          return Promise.resolve(); // No missing columns, resolve immediately
        };

        // 3. Check if entry exists by client_application_id and insert/update accordingly
        const checkAndUpsertEntry = () => {
          const checkEntrySql =
            "SELECT * FROM cmt_applications WHERE client_application_id = ?";

          connection.query(
            checkEntrySql,
            [client_application_id],
            (entryErr, entryResults) => {
              if (entryErr) {
                console.error("Error checking entry existence:", entryErr);
                connectionRelease(connection); // Release connection
                return callback(entryErr, null);
              }

              // Add branch_id and customer_id to mainJson
              mainJson.branch_id = branch_id;
              mainJson.customer_id = customer_id;

              if (entryResults.length > 0) {
                // Update existing entry
                const updateSql =
                  "UPDATE cmt_applications SET ? WHERE client_application_id = ?";
                connection.query(
                  updateSql,
                  [mainJson, client_application_id],
                  (updateErr, updateResult) => {
                    connectionRelease(connection); // Release connection
                    if (updateErr) {
                      console.error("Error updating application:", updateErr);
                      return callback(updateErr, null);
                    }
                    callback(null, updateResult);
                  }
                );
              } else {
                // Insert new entry
                const insertSql = "INSERT INTO cmt_applications SET ?";
                connection.query(
                  insertSql,
                  {
                    ...mainJson,
                    client_application_id,
                    branch_id,
                    customer_id,
                  },
                  (insertErr, insertResult) => {
                    connectionRelease(connection); // Release connection
                    if (insertErr) {
                      console.error("Error inserting application:", insertErr);
                      return callback(insertErr, null);
                    }
                    callback(null, insertResult);
                  }
                );
              }
            }
          );
        };

        // Execute the operations in sequence
        addMissingColumns()
          .then(() => checkAndUpsertEntry())
          .catch((err) => {
            console.error("Error during ALTER or entry check:", err);
            connectionRelease(connection); // Release connection
            callback(err, null);
          });
      });
    });
  },

  createOrUpdateAnnexure: (
    cmt_id,
    client_application_id,
    branch_id,
    customer_id,
    db_table,
    mainJson,
    callback
  ) => {
    const fields = Object.keys(mainJson).map((field) => field.toLowerCase());
    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      const checkTableSql = `
        SELECT COUNT(*) AS count 
        FROM information_schema.tables 
        WHERE table_schema = ? AND table_name = ?`;

      connection.query(
        checkTableSql,
        [process.env.DB_NAME, db_table],
        (tableErr, tableResults) => {
          if (tableErr) {
            connectionRelease(connection);
            console.error("Error checking table existence:", tableErr);
            return callback(tableErr, null);
          }

          if (tableResults[0].count === 0) {
            const createTableSql = `
              CREATE TABLE \`${db_table}\` (
                \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
                \`cmt_id\` bigint(20) DEFAULT NULL,
                \`client_application_id\` bigint(20) NOT NULL,
                \`branch_id\` int(11) NOT NULL,
                \`customer_id\` int(11) NOT NULL,
                \`status\` VARCHAR(100) NOT NULL,
                \`team_management_docs\` LONGTEXT NOT NULL,
                \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`),
                KEY \`client_application_id\` (\`client_application_id\`),
                KEY \`cmt_application_customer_id\` (\`customer_id\`),
                KEY \`cmt_application_cmt_id\` (\`cmt_id\`),
                CONSTRAINT \`fk_${db_table}_client_application_id\` FOREIGN KEY (\`client_application_id\`) REFERENCES \`client_applications\` (\`id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_${db_table}_customer_id\` FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\` (\`id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_${db_table}_cmt_id\` FOREIGN KEY (\`cmt_id\`) REFERENCES \`cmt_applications\` (\`id\`) ON DELETE CASCADE
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

            connection.query(createTableSql, (createErr) => {
              if (createErr) {
                connectionRelease(connection);
                console.error("Error creating table:", createErr);
                return callback(createErr, null);
              }
              proceedToCheckColumns();
            });
          } else {
            proceedToCheckColumns();
          }

          function proceedToCheckColumns() {
            const checkColumnsSql = `SHOW COLUMNS FROM \`${db_table}\``;

            connection.query(checkColumnsSql, (err, results) => {
              if (err) {
                connectionRelease(connection);
                console.error("Error checking columns:", err);
                return callback(err, null);
              }

              // Extract column names from the results (use 'Field' instead of 'COLUMN_NAME')
              const existingColumns = results.map((row) => row.Field);

              // Filter out missing columns
              const missingColumns = fields.filter(
                (field) => !existingColumns.includes(field)
              );

              if (missingColumns.length > 0) {
                const alterQueries = missingColumns.map((column) => {
                  return `ALTER TABLE \`${db_table}\` ADD COLUMN \`${column}\` LONGTEXT`; // Adjust data type as necessary
                });

                const alterPromises = alterQueries.map(
                  (query) =>
                    new Promise((resolve, reject) => {
                      connection.query(query, (alterErr) => {
                        if (alterErr) {
                          console.error("Error adding column:", alterErr);
                          return reject(alterErr);
                        }
                        resolve();
                      });
                    })
                );

                Promise.all(alterPromises)
                  .then(() => checkAndUpdateEntry())
                  .catch((err) => {
                    connectionRelease(connection);
                    console.error("Error executing ALTER statements:", err);
                    callback(err, null);
                  });
              } else {
                checkAndUpdateEntry();
              }
            });
          }

          function checkAndUpdateEntry() {
            const checkEntrySql = `SELECT * FROM \`${db_table}\` WHERE client_application_id = ?`;
            connection.query(
              checkEntrySql,
              [client_application_id],
              (entryErr, entryResults) => {
                if (entryErr) {
                  connectionRelease(connection);
                  console.error("Error checking entry existence:", entryErr);
                  return callback(entryErr, null);
                }

                if (entryResults.length > 0) {
                  const updateSql = `UPDATE \`${db_table}\` SET ? WHERE client_application_id = ?`;
                  connection.query(
                    updateSql,
                    [mainJson, client_application_id],
                    (updateErr, updateResult) => {
                      connectionRelease(connection);
                      if (updateErr) {
                        console.error("Error updating application:", updateErr);
                        return callback(updateErr, null);
                      }
                      callback(null, updateResult);
                    }
                  );
                } else {
                  const insertSql = `INSERT INTO \`${db_table}\` SET ?`;
                  connection.query(
                    insertSql,
                    {
                      ...mainJson,
                      client_application_id,
                      branch_id,
                      customer_id,
                      cmt_id,
                    },
                    (insertErr, insertResult) => {
                      connectionRelease(connection);
                      if (insertErr) {
                        console.error(
                          "Error inserting application:",
                          insertErr
                        );
                        return callback(insertErr, null);
                      }
                      callback(null, insertResult);
                    }
                  );
                }
              }
            );
          }
        }
      );
    });
  },

  getAttachmentsByClientAppID: (client_application_id, callback) => {
    startConnection((err, connection) => {
      if (err) {
        console.error("Error starting connection:", err);
        return callback(err, null);
      }

      const sql = "SELECT `services` FROM `client_applications` WHERE `id` = ?";
      connection.query(sql, [client_application_id], (err, results) => {
        if (err) {
          console.error("Database query error: 26", err);
          connectionRelease(connection);
          return callback(err, null);
        }

        if (results.length > 0) {
          const services = results[0].services.split(","); // Split services by comma
          const dbTableFileInputs = {}; // Object to store db_table and its file inputs
          let completedQueries = 0; // To track completed queries

          // Step 1: Loop through each service and perform actions
          services.forEach((service) => {
            const query = "SELECT `json` FROM `report_forms` WHERE `id` = ?";
            connection.query(query, [service], (err, result) => {
              completedQueries++;

              if (err) {
                console.error("Error fetching JSON for service:", service, err);
              } else if (result.length > 0) {
                try {
                  // Parse the JSON data
                  const jsonData = JSON.parse(result[0].json);
                  const dbTable = jsonData.db_table;

                  // Initialize an array for the dbTable if not already present
                  if (!dbTableFileInputs[dbTable]) {
                    dbTableFileInputs[dbTable] = [];
                  }

                  // Extract inputs with type 'file' and add to the db_table array
                  jsonData.rows.forEach((row) => {
                    row.inputs.forEach((input) => {
                      if (input.type === "file") {
                        dbTableFileInputs[dbTable].push(input.name);
                      }
                    });
                  });
                } catch (parseErr) {
                  console.error(
                    "Error parsing JSON for service:",
                    service,
                    parseErr
                  );
                }
              }

              // When all services have been processed
              if (completedQueries === services.length) {
                // Fetch the host from the database
                const hostSql = `SELECT \`host\` FROM \`app_info\` WHERE \`status\` = 1 AND \`interface_type\` = ? ORDER BY \`updated_at\` DESC LIMIT 1`;
                connection.query(hostSql, ["backend"], (err, hostResults) => {
                  if (err) {
                    console.error("Database query error: 27", err);
                    connectionRelease(connection);
                    return callback(err, null);
                  }

                  // Check if an entry was found for the host
                  const host =
                    hostResults.length > 0
                      ? hostResults[0].host
                      : "www.example.com"; // Fallback host

                  let finalAttachments = [];
                  let tableQueries = 0;
                  const totalTables = Object.keys(dbTableFileInputs).length;

                  // Loop through each db_table and perform a query
                  for (const [dbTable, fileInputNames] of Object.entries(
                    dbTableFileInputs
                  )) {
                    const selectQuery = `SELECT ${
                      fileInputNames && fileInputNames.length > 0
                        ? fileInputNames.join(", ")
                        : "*"
                    } FROM ${dbTable} WHERE client_application_id = ?`;

                    connection.query(
                      selectQuery,
                      [client_application_id],
                      (err, rows) => {
                        tableQueries++;

                        if (err) {
                          console.error(
                            `Error querying table ${dbTable}:`,
                            err
                          );
                        } else {
                          // Combine values from each row into a single string
                          rows.forEach((row) => {
                            const attachments = Object.values(row)
                              .filter((value) => value) // Remove any falsy values
                              .join(","); // Join values by comma

                            // Split and concatenate the URL with each attachment
                            attachments.split(",").forEach((attachment) => {
                              finalAttachments.push(`${host}/${attachment}`);
                            });
                          });
                        }

                        // Step 3: When all db_table queries are completed, return finalAttachments
                        if (tableQueries === totalTables) {
                          connectionRelease(connection); // Release connection before callback
                          callback(null, finalAttachments.join(", "));
                        }
                      }
                    );
                  }
                });
              }
            });
          });
        } else {
          connectionRelease(connection); // Release connection if no results found
          callback(null, []); // Return an empty array if no results found
        }
      });
    });
  },
};

module.exports = Customer;
