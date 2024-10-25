const { pool, startConnection, connectionRelease } = require("../config/db");

const AppCommon = {
  appInfo: (interfaceType, callback) => {
    const sql = `SELECT * FROM \`app_info\` WHERE \`status\` = 1 AND \`interface_type\` = ? ORDER BY \`updated_at\` DESC LIMIT 1`;
    pool.query(sql, [interfaceType], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
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
  },

  companyInfo: (callback) => {
    const sql = `SELECT * FROM \`company_info\` WHERE \`status\` = 1 ORDER BY \`updated_at\` DESC LIMIT 1`;
    pool.query(sql, (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
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
  },
};

module.exports = AppCommon;
