const pool = require("../../config/db");

const Package = {
  create: (title, description, admin_id, callback) => {
    const sql = `
      INSERT INTO \`packages\` (\`title\`, \`description\`, \`admin_id\`)
      VALUES (?, ?, ?)
    `;
    
    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(sql, [title, description, admin_id], (queryErr, results) => {
        connectionRelease(connection); // Release the connection

        if (queryErr) {
          console.error("Database query error:", queryErr);
          return callback(queryErr, null);
        }
        
        callback(null, results);
      });
    });
  },

  list: (callback) => {
    const sql = `SELECT * FROM \`packages\``;
    
    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(sql, (queryErr, results) => {
        connectionRelease(connection); // Release the connection

        if (queryErr) {
          console.error("Database query error:", queryErr);
          return callback(queryErr, null);
        }
        
        callback(null, results);
      });
    });
  },

  getPackageById: (id, callback) => {
    const sql = `SELECT * FROM \`packages\` WHERE \`id\` = ?`;
    
    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(sql, [id], (queryErr, results) => {
        connectionRelease(connection); // Release the connection

        if (queryErr) {
          console.error("Database query error:", queryErr);
          return callback(queryErr, null);
        }
        
        callback(null, results[0]);
      });
    });
  },

  update: (id, title, description, callback) => {
    const sql = `
      UPDATE \`packages\`
      SET \`title\` = ?, \`description\` = ?
      WHERE \`id\` = ?
    `;
    
    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(sql, [title, description, id], (queryErr, results) => {
        connectionRelease(connection); // Release the connection

        if (queryErr) {
          console.error("Database query error:", queryErr);
          return callback(queryErr, null);
        }
        
        callback(null, results);
      });
    });
  },

  delete: (id, callback) => {
    const sql = `
      DELETE FROM \`packages\`
      WHERE \`id\` = ?
    `;
    
    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(sql, [id], (queryErr, results) => {
        connectionRelease(connection); // Release the connection

        if (queryErr) {
          console.error("Database query error:", queryErr);
          return callback(queryErr, null);
        }
        
        callback(null, results);
      });
    });
  },
};

module.exports = Package;
