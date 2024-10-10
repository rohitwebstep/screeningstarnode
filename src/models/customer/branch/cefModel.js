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

      // 2. If there are missing columns, alter the table to add them
      if (missingColumns.length > 0) {
        const alterQueries = missingColumns.map((column) => {
          return `ALTER TABLE candidate_email_form ADD COLUMN ${column} VARCHAR(255)`; // Adjust data type as necessary
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
      "SELECT * FROM candidate_email_form WHERE candidate_application_id = ?";
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
          // Entry does not exist, so insert it
          const insertSql = "INSERT INTO candidate_email_form SET ?";
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
};

module.exports = cef;
