const crypto = require("crypto");
const pool = require("../../../config/db");

const cef = {
  formJson: (service_id, callback) => {
    const sql = "SELECT * FROM `cef_service_forms` WHERE `service_id` = ?";
    pool.query(sql, [service_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },
};

module.exports = cef;
