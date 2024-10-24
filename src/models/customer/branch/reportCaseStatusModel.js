const crypto = require("crypto");
const pool = require("../../../config/db");

const reportCaseStatus = {
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
            console.error(`Error creating table 1 "${db_table}":`, createErr);
            return callback(createErr);
          }
          fetchData();
        });
      } else {
        fetchData();
      }

      function fetchData() {
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
      }
    });
  },
};

module.exports = reportCaseStatus;
