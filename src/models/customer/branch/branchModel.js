const crypto = require("crypto");
const pool = require("../../../config/db");

// Function to hash the password using MD5
const hashPassword = (password) =>
  crypto.createHash("md5").update(password).digest("hex");

const Branch = {
  create: (BranchData, callback) => {
    const sqlBranch = `
      INSERT INTO \`branches\` (
        \`customer_id\`, \`name\`, \`email\`, \`is_head\`, \`password\`
      ) VALUES (?, ?, ?, ?, ?)
    `;

    const valuesBranch = [
      BranchData.customer_id,
      BranchData.name,
      BranchData.email,
      BranchData.head,
      hashPassword(BranchData.password),
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
      callback(null, results);
    });
  },
};

module.exports = Branch;
