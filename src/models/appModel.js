const pool = require("../config/db");

const AppCommon = {
  info: (interfaceType, callback) => {
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
};

module.exports = AppCommon;
