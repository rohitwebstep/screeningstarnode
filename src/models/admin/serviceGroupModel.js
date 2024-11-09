const { pool, startConnection, connectionRelease } = require("../../config/db");

const ServiceGroup = {
  create: (title, symbol, admin_id, callback) => {
    // Step 1: Check if a service Group with the same title already exists
    const checkServiceGroupSql = `
      SELECT * FROM \`service_groups\` WHERE \`title\` = ? OR \`symbol\` = ?
    `;

    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(
        checkServiceGroupSql,
        [title, symbol],
        (checkErr, serviceResults) => {
          if (checkErr) {
            console.error("Error checking service Group:", checkErr);
            connectionRelease(connection); // Release connection on error
            return callback(checkErr, null);
          }

          // Step 2: If a service Group with the same title exists, return an error
          if (serviceResults.length > 0) {
            const error = new Error(
              "Service Group with the same name already exists"
            );
            console.error(error.message);
            connectionRelease(connection); // Release connection before returning error
            return callback(error, null);
          }

          // Step 3: Insert the new service Group
          const insertServiceGroupSql = `
          INSERT INTO \`service_groups\` (\`title\`, \`symbol\`, \`admin_id\`)
          VALUES (?, ?, ?)
        `;

          connection.query(
            insertServiceGroupSql,
            [title, symbol, admin_id],
            (insertErr, results) => {
              connectionRelease(connection); // Release the connection

              if (insertErr) {
                console.error("Database query error: 46", insertErr);
                return callback(insertErr, null);
              }
              callback(null, results);
            }
          );
        }
      );
    });
  },

  list: (callback) => {
    const sql = `SELECT * FROM \`service_groups\``;

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

  getServiceGroupById: (id, callback) => {
    const sql = `SELECT * FROM \`service_groups\` WHERE \`id\` = ?`;

    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(sql, [id], (queryErr, results) => {
        connectionRelease(connection); // Release the connection

        if (queryErr) {
          console.error("Database query error: 49", queryErr);
          return callback(queryErr, null);
        }
        callback(null, results[0]);
      });
    });
  },

  update: (id, title, symbol, callback) => {
    const sql = `
      UPDATE \`service_groups\`
      SET \`title\` = ?, \`symbol\` = ?
      WHERE \`id\` = ?
    `;

    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(
        sql,
        [title, title, symbol, id],
        (queryErr, results) => {
          connectionRelease(connection); // Release the connection

          if (queryErr) {
            console.error(" 51", queryErr);
            return callback(queryErr, null);
          }
          callback(null, results);
        }
      );
    });
  },

  delete: (id, callback) => {
    const sql = `
      DELETE FROM \`service_groups\`
      WHERE \`id\` = ?
    `;

    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(sql, [id], (queryErr, results) => {
        connectionRelease(connection); // Release the connection

        if (queryErr) {
          console.error("Database query error: 51", queryErr);
          return callback(queryErr, null);
        }
        callback(null, results);
      });
    });
  },
};

module.exports = ServiceGroup;
