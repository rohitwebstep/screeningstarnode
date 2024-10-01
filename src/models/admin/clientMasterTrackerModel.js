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

  applicationListByBranch: (branch_id, callback) => {
    const sql = `SELECT * FROM \`client_applications\` WHERE \`status\` != 'closed' AND \`branch_id\` = ?;
`;
    pool.query(sql, [branch_id], (err, results) => {
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

  update: (
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
};

module.exports = Customer;
