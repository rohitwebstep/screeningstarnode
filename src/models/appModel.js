const { pool, startConnection, connectionRelease } = require("../config/db");

const AppCommon = {
  appInfo: (interfaceType, callback) => {
    startConnection((err, connection) => {
      if (err) {
        console.error("Failed to connect to the database:", err);
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      const sql = `SELECT * FROM \`app_info\` WHERE \`status\` = 1 AND \`interface_type\` = ? ORDER BY \`updated_at\` DESC LIMIT 1`;
      connection.query(sql, [interfaceType], (queryErr, results) => {
        connectionRelease(connection); // Ensure the connection is released

        if (queryErr) {
          console.error("Database query error:", queryErr);
          return callback(queryErr, null);
        }

        // Check if an entry was found
        if (results.length > 0) {
          // Return the found entry
          callback(null, results[0]);
        } else {
          // Return false if no entry was found
          callback(null, false);
        }
      });
    });
  },

  companyInfo: (callback) => {
    startConnection((err, connection) => {
      if (err) {
        console.error("Failed to connect to the database:", err);
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      const sql = `SELECT * FROM \`company_info\` WHERE \`status\` = 1 ORDER BY \`updated_at\` DESC LIMIT 1`;
      connection.query(sql, (queryErr, results) => {
        connectionRelease(connection); // Ensure the connection is released

        if (queryErr) {
          console.error("Database query error:", queryErr);
          return callback(queryErr, null);
        }

        // Check if an entry was found
        if (results.length > 0) {
          // Return the found entry
          callback(null, results[0]);
        } else {
          // Return false if no entry was found
          callback(null, false);
        }
      });
    });
  },
};

module.exports = AppCommon;
