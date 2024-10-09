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

  getCEFApplicationById: (candidate_application_id, callback) => {
    const sql =
      "SELECT * FROM `candidate_email_form` WHERE `candidate_application_id` = ?";
    pool.query(sql, [candidate_application_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results[0]);
    });
  },

  create: (
    resume_file,
    govt_id,
    personal_information,
    candidate_application_id,
    branch_id,
    customer_id,
    callback
  ) => {
    const fields = Object.keys(personal_information);

    // 1. Check for existing columns in candidate_email_form
    const checkColumnsSql = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'candidate_email_form' AND COLUMN_NAME IN (?)`;

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
          return `ALTER TABLE candidate_email_form ADD COLUMN ${column} VARCHAR(255)`; // Adjust data type as necessary
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
            // 3. Check if entry exists by candidate_application_id
            const checkEntrySql =
              "SELECT * FROM candidate_email_form WHERE candidate_application_id = ?";
            pool.query(
              checkEntrySql,
              [candidate_application_id],
              (entryErr, entryResults) => {
                if (entryErr) {
                  console.error("Error checking entry existence:", entryErr);
                  return callback(entryErr, null);
                }

                // 4. Insert or update the entry
                if (entryResults.length > 0) {
                  personal_information.branch_id = branch_id;
                  personal_information.customer_id = customer_id;
                  personal_information.resume_file = resume_file;
                  personal_information.govt_id = govt_id;

                  // Update existing entry
                  const updateSql =
                    "UPDATE candidate_email_form SET ? WHERE candidate_application_id = ?";
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
                  // Insert new entry
                  const insertSql = "INSERT INTO candidate_email_form SET ?";
                  pool.query(
                    insertSql,
                    {
                      ...personal_information,
                      candidate_application_id,
                      branch_id,
                      customer_id,
                      resume_file,
                      govt_id,
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
          "SELECT * FROM candidate_email_form WHERE candidate_application_id = ?";
        pool.query(
          checkEntrySql,
          [candidate_application_id],
          (entryErr, entryResults) => {
            if (entryErr) {
              console.error("Error checking entry existence:", entryErr);
              return callback(entryErr, null);
            }

            // 4. Insert or update the entry
            if (entryResults.length > 0) {
              // Add branch_id and customer_id to personal_information
              personal_information.branch_id = branch_id;
              personal_information.customer_id = customer_id;
              personal_information.resume_file = resume_file;
              personal_information.govt_id = govt_id;

              // Update existing entry
              const updateSql =
                "UPDATE candidate_email_form SET ? WHERE candidate_application_id = ?";
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
              // Insert new entry
              const insertSql = "INSERT INTO candidate_email_form SET ?";
              pool.query(
                insertSql,
                {
                  ...personal_information,
                  candidate_application_id,
                  branch_id,
                  customer_id,
                  resume_file,
                  govt_id,
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
    });
  },
};

module.exports = cef;
