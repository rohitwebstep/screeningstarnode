const pool = require("../../../config/db");

const candidateApplication = {
  // Method to check if an email has been used before
  isEmailUsedBefore: (email, callback) => {
    // Step 1: Check if the email exists in candidate_applications
    const emailCheckSql = `
    SELECT COUNT(*) as count
    FROM \`candidate_applications\`
    WHERE \`email\` = ?
  `;

    pool.query(emailCheckSql, [email], (err, emailCheckResults) => {
      if (err) {
        console.error("Error checking email in candidate_applications:", err);
        return callback(err, null);
      }

      // Check if the email exists
      const emailExists = emailCheckResults[0].count > 0;
      return callback(null, emailExists);
    });
  },

  // Method to create a new candidate application
  create: (data, callback) => {
    const {
      branch_id,
      name,
      employee_id,
      mobile_number,
      email,
      services,
      package,
      customer_id,
    } = data;

    const sql = `
        INSERT INTO \`candidate_applications\` (
          \`branch_id\`,
          \`name\`,
          \`employee_id\`,
          \`mobile_number\`,
          \`email\`,
          \`services\`,
          \`package\`,
          \`customer_id\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

    const values = [
      branch_id,
      name,
      employee_id,
      mobile_number,
      email,
      services || "",
      package || "",
      customer_id,
    ];

    pool.query(sql, values, (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  list: (branch_id, callback) => {
    const sql = "SELECT * FROM `candidate_applications` WHERE `branch_id` = ?";
    pool.query(sql, [branch_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  checkUniqueEmpId: (candidateUniqueEmpId, callback) => {
    const sql = `
      SELECT COUNT(*) AS count
      FROM \`candidate_applications\`
      WHERE \`employee_id\` = ?
    `;
    pool.query(sql, [candidateUniqueEmpId], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ message: "Database query error", error: err }, null);
      }

      const count = results[0].count;
      callback(null, count > 0);
    });
  },

  checkUniqueEmpIdByCandidateApplicationID: (
    application_id,
    candidateUniqueEmpId,
    callback
  ) => {
    const sql = `
      SELECT COUNT(*) AS count
      FROM \`candidate_applications\`
      WHERE \`employee_id\` = ? AND id = ?
    `;
    pool.query(sql, [candidateUniqueEmpId, application_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ message: "Database query error", error: err }, null);
      }

      const count = results[0].count;
      callback(null, count > 0);
    });
  },

  getCandidateApplicationById: (id, callback) => {
    const sql = "SELECT * FROM `candidate_applications` WHERE id = ?";
    pool.query(sql, [id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results[0]);
    });
  },

  update: (data, candidate_application_id, callback) => {
    const { name, employee_id, mobile_number, email, services, package } = data;

    const sql = `
      UPDATE \`candidate_applications\`
      SET
        \`name\` = ?,
        \`employee_id\` = ?,
        \`mobile_number\` = ?,
        \`email\` = ?,
        \`services\` = ?,
        \`package\` = ?
      WHERE
        \`id\` = ?
    `;

    const values = [
      name,
      employee_id,
      mobile_number,
      email,
      services,
      package,
      candidate_application_id,
    ];

    pool.query(sql, values, (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  delete: (id, callback) => {
    const sql = "DELETE FROM `candidate_applications` WHERE `id` = ?";
    pool.query(sql, [id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  isApplicationExist: (app_id, branch_id, customer_id, callback) => {
    const sql =
      "SELECT * FROM `candidate_applications` WHERE `id` = ? AND `branch_id` = ? AND `customer_id` = ?";

    pool.query(sql, [app_id, branch_id, customer_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }

      // Check if results exist
      const exists = results.length > 0; // true if exists, false otherwise
      callback(null, exists);
    });
  },
};

module.exports = candidateApplication;
