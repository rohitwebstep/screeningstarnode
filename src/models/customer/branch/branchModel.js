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
};

module.exports = Branch;
