const { pool, startConnection, connectionRelease } = require("../../config/db");

const AuthorizedDetail = {
  create: (name, designation, phone, email, admin_id, callback) => {
    // Step 1: Check if a billing escalation with the same name already exists
    const checkAuthorizedDetailSql = `
      SELECT * FROM \`authorized_details\` WHERE \`name\` = ?
    `;

    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(
        checkAuthorizedDetailSql,
        [name],
        (checkErr, authorizedDetailResults) => {
          if (checkErr) {
            console.error("Error checking billing escalation:", checkErr);
            connectionRelease(connection); // Release connection on error
            return callback(checkErr, null);
          }

          // Step 2: If a billing escalation with the same name exists, return an error
          if (authorizedDetailResults.length > 0) {
            const error = new Error(
              "Billing SPOC with the same name already exists"
            );
            console.error(error.message);
            connectionRelease(connection); // Release connection before returning error
            return callback(error, null);
          }

          // Step 3: Insert the new billing escalation
          const insertAuthorizedDetailSql = `
          INSERT INTO \`authorized_details\` (\`name\`, \`designation\`, \`phone\`, \`email\`, \`admin_id\`)
          VALUES (?, ?, ?, ?, ?)
        `;

          connection.query(
            insertAuthorizedDetailSql,
            [name, designation, phone, email, admin_id],
            (insertErr, results) => {
              connectionRelease(connection); // Release the connection

              if (insertErr) {
                console.error("Database query error: 22", insertErr);
                return callback(insertErr, null);
              }
              callback(null, results);
            }
          );
        }
      );
    });
  },

  checkEmailExists: (email, callback) => {
    const sql = `SELECT 1 FROM \`authorized_details\` WHERE email = ? LIMIT 1`;

    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(sql, [email], (queryErr, results) => {
        connectionRelease(connection); // Release the connection

        if (queryErr) {
          console.error("Database query error: 23", queryErr);
          return callback(queryErr, null);
        }

        // Return true if the email exists, else false
        const emailExists = results.length > 0;
        callback(null, emailExists);
      });
    });
  },

  list: (callback) => {
    const sql = `SELECT * FROM \`authorized_details\``;

    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(sql, (queryErr, results) => {
        connectionRelease(connection); // Release the connection

        if (queryErr) {
          console.error("Database query error: 24", queryErr);
          return callback(queryErr, null);
        }
        callback(null, results);
      });
    });
  },

  getAuthorizedDetailById: (id, callback) => {
    const sql = `SELECT * FROM \`authorized_details\` WHERE \`id\` = ?`;

    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(sql, [id], (queryErr, results) => {
        connectionRelease(connection); // Release the connection

        if (queryErr) {
          console.error("Database query error: 25", queryErr);
          return callback(queryErr, null);
        }
        callback(null, results[0]);
      });
    });
  },

  update: (id, name, designation, phone, email, callback) => {
    const sql = `
      UPDATE \`authorized_details\`
      SET \`name\` = ?, \`designation\` = ?, \`phone\` = ?, \`email\` = ?
      WHERE \`id\` = ?
    `;

    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(sql, [name, designation, phone, email, id], (queryErr, results) => {
        connectionRelease(connection); // Release the connection

        if (queryErr) {
          console.error(" 51", queryErr);
          return callback(queryErr, null);
        }
        callback(null, results);
      });
    });
  },

  delete: (id, callback) => {
    const sql = `
      DELETE FROM \`authorized_details\`
      WHERE \`id\` = ?
    `;

    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(sql, [id], (queryErr, results) => {
        connectionRelease(connection); // Release the connection

        if (queryErr) {
          console.error("Database query error: 26", queryErr);
          return callback(queryErr, null);
        }
        callback(null, results);
      });
    });
  },
};

module.exports = AuthorizedDetail;
