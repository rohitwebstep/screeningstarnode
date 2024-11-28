const { pool, startConnection, connectionRelease } = require("../../config/db");

const Permission = {
  rolesList: (callback) => {
    const sql = `
      SELECT 
        role
      FROM \`permissions\`
    `;

    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(sql, (queryErr, results) => {
        connectionRelease(connection); // Release the connection

        if (queryErr) {
          console.error("Database query error: 47", queryErr);
          return callback(queryErr, null);
        }

        callback(null, results);
      });
    });
  },

  list: (callback) => {
    const sql = `
      SELECT 
        role,
        json
      FROM \`permissions\`
    `;

    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(sql, (queryErr, results) => {
        connectionRelease(connection); // Release the connection

        if (queryErr) {
          console.error("Database query error: 47", queryErr);
          return callback(queryErr, null);
        }

        callback(null, results);
      });
    });
  },
};

module.exports = Permission;
