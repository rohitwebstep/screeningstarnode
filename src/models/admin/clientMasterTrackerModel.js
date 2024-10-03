const crypto = require("crypto");
const pool = require("../../config/db");

// Function to hash the password using MD5
const hashPassword = (password) =>
  crypto.createHash("md5").update(password).digest("hex");

const Customer = {
  list: (callback) => {
    const sql = `WITH BranchesCTE AS (
  SELECT 
    b.id AS branch_id,
    b.customer_id
  FROM 
    branches b
)
SELECT 
  customers.client_unique_id,
  customers.name,
  customer_metas.single_point_of_contact,
  customers.id AS main_id,
  COALESCE(branch_counts.branch_count, 0) AS branch_count,
  COALESCE(application_counts.application_count, 0) AS application_count
FROM 
  customers
LEFT JOIN 
  customer_metas 
ON 
  customers.id = customer_metas.customer_id
LEFT JOIN 
  (
    SELECT 
      customer_id, 
      COUNT(*) AS branch_count
    FROM 
      branches
    GROUP BY 
      customer_id
  ) AS branch_counts
ON 
  customers.id = branch_counts.customer_id
LEFT JOIN 
  (
    SELECT 
      b.customer_id, 
      COUNT(ca.id) AS application_count
    FROM 
      BranchesCTE b
    INNER JOIN 
      client_applications ca ON b.branch_id = ca.branch_id
    WHERE 
      ca.status != 'closed'
    GROUP BY 
      b.customer_id
  ) AS application_counts
ON 
  customers.id = application_counts.customer_id
WHERE 
  COALESCE(application_counts.application_count, 0) > 0;
    `;

    pool.query(sql, (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  listByCustomerID: (customer_id, callback) => {
    const sql = `SELECT b.id AS branch_id, b.name AS branch_name, COUNT(ca.id) AS application_count
FROM client_applications ca
INNER JOIN branches b ON ca.branch_id = b.id
WHERE ca.status != 'closed'
AND b.customer_id = ?
GROUP BY b.name;
`;
    pool.query(sql, [customer_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  applicationListByBranch: (branch_id, status, callback) => {
    let sql = `SELECT * FROM \`client_applications\` WHERE \`branch_id\` = ? AND \`status\` != 'closed'`;
    const params = [branch_id];

    // Check if status is not null and add the corresponding condition
    if (status !== null) {
      sql += ` AND \`status\` = ?`;
      params.push(status);
    }

    pool.query(sql, params, (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  applicationByID: (application_id, branch_id, callback) => {
    // Use a parameterized query to prevent SQL injection
    const sql =
      "SELECT * FROM `client_applications` WHERE `id` = ? AND `branch_id` = ?";
    pool.query(sql, [application_id, branch_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      // Assuming `results` is an array, and we want the first result
      callback(null, results[0] || null); // Return single application or null if not found
    });
  },

  annexureData: (client_application_id, db_table, callback) => {
    // Check if the table exists in the information schema
    const checkTableSql = `
      SELECT COUNT(*) AS count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = ?`;

    pool.query(checkTableSql, [db_table], (err, results) => {
      if (err) {
        console.error("Database error while checking table existence:", err);
        return callback(err, null);
      }

      // If the table does not exist, return an error
      if (results[0].count === 0) {
        return callback(new Error("Table does not exist"), null);
      }

      // Now that we know the table exists, run the original query
      const sql = `SELECT * FROM \`${db_table}\` WHERE \`client_application_id\` = ?`;
      pool.query(sql, [client_application_id], (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return callback(err, null);
        }
        // Return the first result or null if not found
        callback(null, results[0] || null);
      });
    });
  },

  filterOptions: (callback) => {
    const sql = `SELECT DISTINCT \`status\` FROM \`cmt_applications\``;
    pool.query(sql, (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  getCMTApplicationById: (client_application_id, callback) => {
    const sql =
      "SELECT * FROM `cmt_applications` WHERE `client_application_id` = ?";
    pool.query(sql, [client_application_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results[0]);
    });
  },

  getCMTApplicationIDByClientApplicationId: (
    client_application_id,
    callback
  ) => {
    if (!client_application_id) {
      return callback(null, false);
    }

    const sql =
      "SELECT `id` FROM `cmt_applications` WHERE `client_application_id` = ?";

    pool.query(sql, [client_application_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }

      if (results.length > 0) {
        return callback(null, results[0].id);
      }
      callback(null, false);
    });
  },

  getCMTAnnexureByApplicationId: (
    client_application_id,
    db_table,
    callback
  ) => {
    // 1. Check if the table exists
    const checkTableSql = `
      SELECT COUNT(*) AS count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = ?`;

    pool.query(
      checkTableSql,
      [process.env.DB_NAME, db_table],
      (tableErr, tableResults) => {
        if (tableErr) {
          console.error("Error checking table existence:", tableErr);
          return callback(tableErr);
        }
        if (tableResults[0].count === 0) {
          const createTableSql = `
          CREATE TABLE \`${db_table}\` (
            \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
            \`cmt_id\` bigint(20) NOT NULL,
            \`client_application_id\` bigint(20) NOT NULL,
            \`branch_id\` int(11) NOT NULL,
            \`customer_id\` int(11) NOT NULL,
            \`status\` VARCHAR(100) NOT NULL,
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

          pool.query(createTableSql, (createErr) => {
            if (createErr) {
              console.error(`Error creating table "${db_table}":`, createErr);
              return callback(createErr);
            }
            fetchData();
          });
        } else {
          fetchData();
        }

        function fetchData() {
          const sql = `SELECT * FROM \`${db_table}\` WHERE \`client_application_id\` = ?`;
          pool.query(sql, [client_application_id], (queryErr, results) => {
            if (queryErr) {
              console.error("Error executing query:", queryErr);
              return callback(queryErr);
            }
            const response = results.length > 0 ? results[0] : null;
            callback(null, response);
          });
        }
      }
    );
  },

  reportFormJsonByServiceID: (service_id, callback) => {
    // Use a parameterized query to prevent SQL injection
    const sql = "SELECT `json` FROM `report_forms` WHERE `id` = ?";
    pool.query(sql, [service_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      // Assuming `results` is an array, and we want the first result
      callback(null, results[0] || null); // Return single application or null if not found
    });
  },

  generateReport: (
    mainJson,
    client_application_id,
    branch_id,
    customer_id,
    callback
  ) => {
    const fields = Object.keys(mainJson);

    // 1. Check for existing columns in cmt_applications
    const checkColumnsSql = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'cmt_applications' AND COLUMN_NAME IN (?)`;

    pool.query(checkColumnsSql, [fields], (err, results) => {
      if (err) {
        console.error("Error checking columns:", err);
        return callback(err, null);
      }

      const existingColumns = results.map((row) => row.COLUMN_NAME);
      const missingColumns = fields.filter(
        (field) => !existingColumns.includes(field)
      );

      // 2. Add missing columns
      if (missingColumns.length > 0) {
        const alterQueries = missingColumns.map((column) => {
          return `ALTER TABLE cmt_applications ADD COLUMN ${column} VARCHAR(255)`; // Adjust data type as necessary
        });

        // Run all ALTER statements in sequence
        const alterPromises = alterQueries.map(
          (query) =>
            new Promise((resolve, reject) => {
              pool.query(query, (alterErr) => {
                if (alterErr) {
                  console.error("Error adding column:", alterErr);
                  return reject(alterErr);
                }
                resolve();
              });
            })
        );

        Promise.all(alterPromises)
          .then(() => {
            // 3. Check if entry exists by client_application_id
            const checkEntrySql =
              "SELECT * FROM cmt_applications WHERE client_application_id = ?";
            pool.query(
              checkEntrySql,
              [client_application_id],
              (entryErr, entryResults) => {
                if (entryErr) {
                  console.error("Error checking entry existence:", entryErr);
                  return callback(entryErr, null);
                }

                // 4. Insert or update the entry
                if (entryResults.length > 0) {
                  // Add branch_id and customer_id to mainJson
                  mainJson.branch_id = branch_id;
                  mainJson.customer_id = customer_id;

                  // Update existing entry
                  const updateSql =
                    "UPDATE cmt_applications SET ? WHERE client_application_id = ?";
                  pool.query(
                    updateSql,
                    [mainJson, client_application_id],
                    (updateErr, updateResult) => {
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
                  pool.query(
                    insertSql,
                    {
                      ...mainJson,
                      client_application_id,
                      branch_id,
                      customer_id,
                    },
                    (insertErr, insertResult) => {
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
          })
          .catch((err) => {
            console.error("Error executing ALTER statements:", err);
            callback(err, null);
          });
      } else {
        // If no columns are missing, proceed to check the entry
        const checkEntrySql =
          "SELECT * FROM cmt_applications WHERE client_application_id = ?";
        pool.query(
          checkEntrySql,
          [client_application_id],
          (entryErr, entryResults) => {
            if (entryErr) {
              console.error("Error checking entry existence:", entryErr);
              return callback(entryErr, null);
            }

            // 4. Insert or update the entry
            if (entryResults.length > 0) {
              // Add branch_id and customer_id to mainJson
              mainJson.branch_id = branch_id;
              mainJson.customer_id = customer_id;

              // Update existing entry
              const updateSql =
                "UPDATE cmt_applications SET ? WHERE client_application_id = ?";
              pool.query(
                updateSql,
                [mainJson, client_application_id],
                (updateErr, updateResult) => {
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
              pool.query(
                insertSql,
                { ...mainJson, client_application_id, branch_id, customer_id },
                (insertErr, insertResult) => {
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
      }
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
    const fields = Object.keys(mainJson);

    // 1. Check if the table exists
    const checkTableSql = `
      SELECT COUNT(*) AS count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = ?`;

    pool.query(
      checkTableSql,
      [process.env.DB_NAME, db_table],
      (tableErr, tableResults) => {
        if (tableErr) {
          console.error("Error checking table existence:", tableErr);
          return callback(tableErr, null);
        }

        if (tableResults[0].count === 0) {
          const createTableSql = `
          CREATE TABLE \`${db_table}\` (
            \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
            \`cmt_id\` bigint(20) NOT NULL,
            \`client_application_id\` bigint(20) NOT NULL,
            \`branch_id\` int(11) NOT NULL,
            \`customer_id\` int(11) NOT NULL,
            \`status\` VARCHAR(100) NOT NULL,
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

          pool.query(createTableSql, (createErr) => {
            if (createErr) {
              console.error("Error creating table:", createErr);
              return callback(createErr, null);
            }
            proceedToCheckColumns();
          });
        } else {
          proceedToCheckColumns();
        }

        function proceedToCheckColumns() {
          const checkColumnsSql = `
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = ? AND COLUMN_NAME IN (?)`;

          pool.query(checkColumnsSql, [db_table, fields], (err, results) => {
            if (err) {
              console.error("Error checking columns:", err);
              return callback(err, null);
            }

            const existingColumns = results.map((row) => row.COLUMN_NAME);
            const missingColumns = fields.filter(
              (field) => !existingColumns.includes(field)
            );

            // 4. Add missing columns
            if (missingColumns.length > 0) {
              const alterQueries = missingColumns.map((column) => {
                return `ALTER TABLE \`${db_table}\` ADD COLUMN \`${column}\` VARCHAR(255)`; // Adjust data type as necessary
              });

              // Run all ALTER statements in sequence
              const alterPromises = alterQueries.map(
                (query) =>
                  new Promise((resolve, reject) => {
                    pool.query(query, (alterErr) => {
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
                  console.error("Error executing ALTER statements:", err);
                  callback(err, null);
                });
            } else {
              checkAndUpdateEntry();
            }
          });
        }

        function checkAndUpdateEntry() {
          // 5. Check if entry exists by client_application_id
          const checkEntrySql = `SELECT * FROM \`${db_table}\` WHERE client_application_id = ?`;
          pool.query(
            checkEntrySql,
            [client_application_id],
            (entryErr, entryResults) => {
              if (entryErr) {
                console.error("Error checking entry existence:", entryErr);
                return callback(entryErr, null);
              }

              // 6. Insert or update the entry
              if (entryResults.length > 0) {
                const updateSql = `UPDATE \`${db_table}\` SET ? WHERE client_application_id = ?`;
                pool.query(
                  updateSql,
                  [mainJson, client_application_id],
                  (updateErr, updateResult) => {
                    if (updateErr) {
                      console.error("Error updating application:", updateErr);
                      return callback(updateErr, null);
                    }
                    callback(null, updateResult);
                  }
                );
              } else {
                const insertSql = `INSERT INTO \`${db_table}\` SET ?`;
                pool.query(
                  insertSql,
                  {
                    ...mainJson,
                    client_application_id,
                    branch_id,
                    customer_id,
                    cmt_id, // Include cmt_id in the insert statement
                  },
                  (insertErr, insertResult) => {
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
        }
      }
    );
  },
};

module.exports = Customer;
