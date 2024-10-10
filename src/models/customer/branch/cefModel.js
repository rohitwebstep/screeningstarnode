const crypto = require("crypto");
const pool = require("../../../config/db");

const cef = {
  formJson: (service_id, callback) => {
    const sql = "SELECT * FROM `cef_service_forms` WHERE `service_id` = ?";
    pool.query(sql, [service_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  getCMEFormDataByApplicationId: (
    candidate_application_id,
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
          console.log(`2 - ${db_table}`);
          const createTableSql = `
          CREATE TABLE \`${db_table}\` (
            \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
            \`cef_id\` bigint(20) NOT NULL,
            \`candidate_application_id\` bigint(20) NOT NULL,
            \`branch_id\` int(11) NOT NULL,
            \`customer_id\` int(11) NOT NULL,
            \`status\` VARCHAR(100) NOT NULL,
            \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`),
            KEY \`candidate_application_id\` (\`candidate_application_id\`),
            KEY \`cef_application_customer_id\` (\`customer_id\`),
            KEY \`cef_application_cef_id\` (\`cef_id\`),
            CONSTRAINT \`fk_${db_table}_candidate_application_id\` FOREIGN KEY (\`candidate_application_id\`) REFERENCES \`client_applications\` (\`id\`) ON DELETE CASCADE,
            CONSTRAINT \`fk_${db_table}_customer_id\` FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\` (\`id\`) ON DELETE CASCADE,
            CONSTRAINT \`fk_${db_table}_cef_id\` FOREIGN KEY (\`cef_id\`) REFERENCES \`cef_applications\` (\`id\`) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

          pool.query(createTableSql, (createErr) => {
            if (createErr) {
              console.error(`Error creating table 2 "${db_table}":`, createErr);
              return callback(createErr);
            }
            fetchData();
          });
        } else {
          fetchData();
        }

        function fetchData() {
          const sql = `SELECT * FROM \`${db_table}\` WHERE \`candidate_application_id\` = ?`;
          pool.query(sql, [candidate_application_id], (queryErr, results) => {
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

  getCEFApplicationById: (candidate_application_id, callback) => {
    const sql =
      "SELECT * FROM `cef_applications` WHERE `candidate_application_id` = ?";
    pool.query(sql, [candidate_application_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results[0]);
    });
  },

  create: (
    personal_information,
    candidate_application_id,
    branch_id,
    customer_id,
    callback
  ) => {
    const fields = Object.keys(personal_information);

    // 1. Check for existing columns in cef_applications
    const checkColumnsSql = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'cef_applications' AND COLUMN_NAME IN (?)`;

    pool.query(checkColumnsSql, [fields], (err, results) => {
      if (err) {
        console.error("Error checking columns:", err);
        return callback(err, null);
      }

      const existingColumns = results.map((row) => row.COLUMN_NAME);
      const missingColumns = fields.filter(
        (field) => !existingColumns.includes(field)
      );

      // 2. If there are missing columns, alter the table to add them
      if (missingColumns.length > 0) {
        const alterQueries = missingColumns.map((column) => {
          return `ALTER TABLE cef_applications ADD COLUMN ${column} VARCHAR(255)`; // Adjust data type as necessary
        });

        // Run all ALTER statements
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

        // After altering the table, proceed to insert or update the data
        Promise.all(alterPromises)
          .then(() => {
            // Insert or update entry after table alteration
            cef.insertOrUpdateEntry(
              personal_information,
              candidate_application_id,
              branch_id,
              customer_id,
              callback
            );
          })
          .catch((alterErr) => {
            console.error("Error executing ALTER statements:", alterErr);
            callback(alterErr, null);
          });
      } else {
        // If no columns are missing, proceed to check and insert or update the entry
        cef.insertOrUpdateEntry(
          personal_information,
          candidate_application_id,
          branch_id,
          customer_id,
          callback
        );
      }
    });
  },

  // Helper function for inserting or updating the entry
  insertOrUpdateEntry: (
    personal_information,
    candidate_application_id,
    branch_id,
    customer_id,
    callback
  ) => {
    // Check if entry exists by candidate_application_id
    const checkEntrySql =
      "SELECT * FROM cef_applications WHERE candidate_application_id = ?";
    pool.query(
      checkEntrySql,
      [candidate_application_id],
      (entryErr, entryResults) => {
        if (entryErr) {
          console.error("Error checking entry existence:", entryErr);
          return callback(entryErr, null);
        }

        if (entryResults.length > 0) {
          // Entry exists, so update it
          personal_information.branch_id = branch_id;
          personal_information.customer_id = customer_id;

          const updateSql =
            "UPDATE cef_applications SET ? WHERE candidate_application_id = ?";
          pool.query(
            updateSql,
            [personal_information, candidate_application_id],
            (updateErr, updateResult) => {
              if (updateErr) {
                console.error("Error updating application:", updateErr);
                return callback(updateErr, null);
              }
              callback(null, updateResult);
            }
          );
        } else {
          // Entry does not exist, so insert it
          const insertSql = "INSERT INTO cef_applications SET ?";
          pool.query(
            insertSql,
            {
              ...personal_information,
              candidate_application_id,
              branch_id,
              customer_id,
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
  },

  createOrUpdateAnnexure: (
    cmt_id,
    candidate_application_id,
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
          console.log(`3 - ${db_table}`);
          const createTableSql = `
          CREATE TABLE \`${db_table}\` (
            \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
            \`cmt_id\` bigint(20) NOT NULL,
            \`candidate_application_id\` bigint(20) NOT NULL,
            \`branch_id\` int(11) NOT NULL,
            \`customer_id\` int(11) NOT NULL,
            \`status\` VARCHAR(100) NOT NULL,
            \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`),
            KEY \`candidate_application_id\` (\`candidate_application_id\`),
            KEY \`branch_id\` (\`branch_id\`),
            KEY \`cmt_application_customer_id\` (\`customer_id\`),
            KEY \`cmt_application_cmt_id\` (\`cmt_id\`),
            CONSTRAINT \`fk_${db_table}_candidate_application_id\` FOREIGN KEY (\`candidate_application_id\`) REFERENCES \`candidate_applications\` (\`id\`) ON DELETE CASCADE,
            CONSTRAINT \`fk_${db_table}_branch_id\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\` (\`id\`) ON DELETE CASCADE,
            CONSTRAINT \`fk_${db_table}_customer_id\` FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\` (\`id\`) ON DELETE CASCADE,
            CONSTRAINT \`fk_${db_table}_cmt_id\` FOREIGN KEY (\`cmt_id\`) REFERENCES \`cmt_applications\` (\`id\`) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

          pool.query(createTableSql, (createErr) => {
            if (createErr) {
              console.error("Error creating table 3 :", createErr);
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
          // 5. Check if entry exists by candidate_application_id
          const checkEntrySql = `SELECT * FROM \`${db_table}\` WHERE candidate_application_id = ?`;
          pool.query(
            checkEntrySql,
            [candidate_application_id],
            (entryErr, entryResults) => {
              if (entryErr) {
                console.error("Error checking entry existence:", entryErr);
                return callback(entryErr, null);
              }

              // 6. Insert or update the entry
              if (entryResults.length > 0) {
                const updateSql = `UPDATE \`${db_table}\` SET ? WHERE candidate_application_id = ?`;
                pool.query(
                  updateSql,
                  [mainJson, candidate_application_id],
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
                    candidate_application_id,
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

module.exports = cef;
