const crypto = require("crypto");
const { pool, startConnection, connectionRelease } = require("../../config/db");

// Function to hash the password using MD5
const hashPassword = (password) =>
  crypto.createHash("md5").update(password).digest("hex");

const TeamManagement = {
  updateStatusOfAnnexureByDBTable: (
    client_application_id,
    branch_id,
    customer_id,
    status,
    db_table,
    callback
  ) => {
    // Start the database connection
    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      // SQL query to check if the table exists
      const checkTableSql = `
        SELECT COUNT(*) AS count 
        FROM information_schema.tables 
        WHERE table_schema = ? AND table_name = ?`;

      connection.query(
        checkTableSql,
        [process.env.DB_NAME, db_table],
        (tableErr, tableResults) => {
          if (tableErr) {
            connectionRelease(connection); // Release the connection on error
            console.error("Error checking table existence:", tableErr);
            return callback(tableErr, null);
          }

          // If table does not exist, create it
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
                connectionRelease(connection); // Release the connection on error
                console.error("Error creating table:", createErr);
                return callback(createErr, null);
              }
              proceedToCheckColumns();
            });
          } else {
            // If table exists, proceed to check columns
            proceedToCheckColumns();
          }

          // Function to check if the entry exists and then insert or update
          function proceedToCheckColumns() {
            const checkEntrySql = `
            SELECT COUNT(*) AS count
            FROM \`${db_table}\`
            WHERE \`client_application_id\` = ? 
              AND \`branch_id\` = ? 
              AND \`customer_id\` = ?`;

            connection.query(
              checkEntrySql,
              [client_application_id, branch_id, customer_id],
              (err, results) => {
                if (err) {
                  connectionRelease(connection); // Release the connection on error
                  console.error("Error checking entry existence:", err);
                  return callback(err, null);
                }

                // If the entry exists, update it
                if (results[0].count > 0) {
                  const updateSql = `
                UPDATE \`${db_table}\` 
                SET status = ? 
                WHERE \`client_application_id\` = ? 
                  AND \`branch_id\` = ? 
                  AND \`customer_id\` = ?`;

                  connection.query(
                    updateSql,
                    [status, client_application_id, branch_id, customer_id],
                    (updateErr, updateResults) => {
                      connectionRelease(connection); // Release the connection after query execution

                      if (updateErr) {
                        console.error(
                          "Database query error (update):",
                          updateErr
                        );
                        return callback(updateErr, null);
                      }

                      callback(null, updateResults); // Return update results
                    }
                  );
                } else {
                  // If the entry does not exist, insert it
                  const insertSql = `
                INSERT INTO \`${db_table}\` (\`client_application_id\`, \`branch_id\`, \`customer_id\`, \`status\`) 
                VALUES (?, ?, ?, ?)`;

                  connection.query(
                    insertSql,
                    [client_application_id, branch_id, customer_id, status],
                    (insertErr, insertResults) => {
                      connectionRelease(connection); // Release the connection after query execution

                      if (insertErr) {
                        console.error(
                          "Database query error (insert):",
                          insertErr
                        );
                        return callback(insertErr, null);
                      }

                      callback(null, insertResults); // Return insert results
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

  upload: (
    client_application_id,
    db_table,
    db_column,
    savedImagePaths,
    callback
  ) => {
    startConnection((err, connection) => {
      if (err) {
        console.error("Error starting connection:", err);
        return callback(false, {
          error: "Error starting database connection.",
          details: err,
        });
      }

      const checkTableSql = `
        SELECT COUNT(*) AS count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = ?`;

      connection.query(checkTableSql, [db_table], (tableErr, tableResults) => {
        if (tableErr) {
          connectionRelease(connection);
          console.error("Error checking table existence:", tableErr);
          return callback(false, {
            error: "Error checking table existence.",
            details: tableErr,
          });
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
              return callback(false, {
                error: "Error creating table.",
                details: createErr,
              });
            }
            proceedToCheckColumns();
          });
        } else {
          proceedToCheckColumns();
        }

        function proceedToCheckColumns() {
          const currentColumnsSql = `
            SELECT COLUMN_NAME 
            FROM information_schema.columns 
            WHERE table_schema = DATABASE() 
            AND table_name = ?`;

          connection.query(currentColumnsSql, [db_table], (err, results) => {
            if (err) {
              connectionRelease(connection);
              return callback(false, {
                error: "Error fetching current columns.",
                details: err,
              });
            }

            const existingColumns = results.map((row) => row.COLUMN_NAME);
            const expectedColumns = [db_column];
            const missingColumns = expectedColumns.filter(
              (column) => !existingColumns.includes(column)
            );

            const addColumnPromises = missingColumns.map((column) => {
              return new Promise((resolve, reject) => {
                const alterTableSql = `ALTER TABLE \`${db_table}\` ADD COLUMN \`${column}\` LONGTEXT`;
                connection.query(alterTableSql, (alterErr) => {
                  if (alterErr) {
                    reject(alterErr);
                  } else {
                    resolve();
                  }
                });
              });
            });

            Promise.all(addColumnPromises)
              .then(() => {
                const insertSql = `UPDATE \`${db_table}\` SET \`${db_column}\` = ? WHERE \`client_application_id\` = ?`;
                const joinedPaths = savedImagePaths.join(", ");
                console.log(insertSql, [joinedPaths, client_application_id]);
                connection.query(
                  insertSql,
                  [joinedPaths, client_application_id],
                  (queryErr, results) => {
                    connectionRelease(connection);

                    if (queryErr) {
                      console.error("Error updating records:", queryErr);
                      return callback(false, {
                        error: "Error updating records.",
                        details: queryErr,
                      });
                    }
                    callback(true, results);
                  }
                );
              })
              .catch((columnErr) => {
                connectionRelease(connection);
                console.error("Error adding columns:", columnErr);
                callback(false, {
                  error: "Error adding columns.",
                  details: columnErr,
                });
              });
          });
        }
      });
    });
  },
};

module.exports = TeamManagement;
