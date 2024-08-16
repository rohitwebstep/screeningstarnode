const pool = require("../config/db");

const Service = {
  create: (title, description, admin_id, package_id, callback) => {
    const sql = `
      INSERT INTO \`services\` (\`title\`, \`description\`, \`admin_id\`, \`package_id\`)
      VALUES (?, ?, ?, ?)
    `;
    pool.query(sql, [title, description, admin_id, package_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  list: (callback) => {
    const sql = `SELECT * FROM \`services\``;
    pool.query(sql, (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  getServiceById: (id, callback) => {
    const sql = `SELECT * FROM \`services\` WHERE \`id\` = ?`;
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
      UPDATE \`services\`
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
        DELETE FROM \`services\`
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

module.exports = Service;
