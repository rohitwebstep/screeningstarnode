const pool = require("../config/db");

const Service = {
  newBatch: (title, description, admin_id, callback) => {
    const sql = `
      INSERT INTO \`batches\` (\`title\`, \`description\`, \`admin_id\`)
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
  // Method to list all batches
  list: (callback) => {
    const sql = `SELECT * FROM \`batches\``;
    pool.query(sql, (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },
};

module.exports = Service;
