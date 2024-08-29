const pool = require("../../../config/db");

const Client = {
  create: (title, description, branch_id, callback) => {
    const sql = `
      INSERT INTO \`clients\` (\`title\`, \`description\`, \`branch_id\`)
      VALUES (?, ?, ?)
    `;
    pool.query(sql, [title, description, branch_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  list: (callback) => {
    const sql = `SELECT * FROM \`clients\``;
    pool.query(sql, (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  getClientById: (id, callback) => {
    const sql = `SELECT * FROM \`clients\` WHERE \`id\` = ?`;
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
      UPDATE \`clients\`
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
        DELETE FROM \`clients\`
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

module.exports = Client;
