const pool = require("../../../config/db");

const Branch = {
  create: (BranchData, callback) => {
    const sqlBranch = `
      INSERT INTO \`branches\` (
        \`customer_id\`, \`name\`, \`email\`, \`is_head\`, \`password\`, \`permissions\`
      ) VALUES (?, ?, ?, ?, MD5(?), ?)
    `;
    const permissions = `{"client_application": { "create": true, "update": true, "view": true, "delete": true },"candidate_application": { "create": true, "update": true, "view": true, "delete": true }}`;
    const valuesBranch = [
      BranchData.customer_id,
      BranchData.name,
      BranchData.email,
      BranchData.head,
      BranchData.password,
      permissions,
    ];

    pool.query(sqlBranch, valuesBranch, (err, results) => {
      if (err) {
        console.error("Database insertion error for branches:", err);
        return callback(
          { message: "Database insertion error for branches", error: err },
          null
        );
      }

      const branchID = results.insertId;
      callback(null, { insertId: branchID });
    });
  },

  list: (callback) => {
    const sql = `SELECT * FROM \`branches\``;
    pool.query(sql, (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  isEmailUsed: (email, callback) => {
    const sql = `SELECT * FROM \`branches\` WHERE \`email\` = ?`;
    pool.query(sql, [email], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      // Return true if the email is found, false otherwise
      const isUsed = results.length > 0;
      callback(null, isUsed);
    });
  },

  listByCustomerID: (customer_id, callback) => {
    const sql = `SELECT * FROM \`branches\` WHERE \`customer_id\` = ?`;
    pool.query(sql, [customer_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  getBranchById: (id, callback) => {
    const sql = `SELECT * FROM \`branches\` WHERE \`id\` = ?`;

    pool.query(sql, [id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }

      if (results.length === 0) {
        return callback(null, null);
      }

      callback(null, results[0]);
    });
  },

  update: (id, name, email, password, callback) => {
    const sql = `
      UPDATE \`branches\`
      SET \`name\` = ?, \`email\` = ?, \`password\` = ?
      WHERE \`id\` = ?
    `;
    pool.query(sql, [name, email, password, id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  updateHeadBranchEmail: (customer_id, name, email, callback) => {
    const sql = `
      UPDATE \`branches\`
      SET \`name\` = ?, \`email\` = ?
      WHERE \`is_head\` = ? AND \`customer_id\` = ?
    `;
    pool.query(sql, [name, email, "1", customer_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  delete: (id, callback) => {
    const sql = `
        DELETE FROM \`branches\`
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

module.exports = Branch;
