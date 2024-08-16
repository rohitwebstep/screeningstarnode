const pool = require("../config/db");

const Package = {
  create: (title, description, admin_id, callback) => {
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

  update: (id, title, description, callback) => {
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
