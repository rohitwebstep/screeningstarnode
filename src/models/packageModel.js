const pool = require("../config/db");

const Package = {
  new: (title, description, admin_id, callback) => {
    const sql = `
      INSERT INTO \`packages\` (\`title\`, \`description\`, \`admin_id\`)
      VALUES (?, ?, ?)
    `;
    pool.query(sql, [title, description, admin_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },
  // Method to list all packages
  list: (callback) => {
    const sql = `SELECT * FROM \`packages\``;
    pool.query(sql, (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  getPackageById: (id, callback) => {
    const sql = `SELECT * FROM \`packages\` WHERE \`id\` = ?`;
    pool.query(sql, [id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results[0]);
    });
  },

  // Method to list all packages
  edit: (id, title, description, callback) => {
    const sql = `
      UPDATE \`packages\`
      SET \`title\` = ?, \`description\` = ?
      WHERE \`id\` = ?
    `;
    pool.query(sql, [title, description, id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  // Method to delete packages
  delete: (id, callback) => {
    const sql = `
        DELETE FROM \`packages\`
        WHERE \`id\` = ?
      `;
    pool.query(sql, [id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },
};

module.exports = Package;
