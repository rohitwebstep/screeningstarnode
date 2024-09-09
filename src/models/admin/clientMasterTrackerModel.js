const crypto = require("crypto");
const pool = require("../../config/db");

// Function to hash the password using MD5
const hashPassword = (password) =>
    crypto.createHash("md5").update(password).digest("hex");

const Customer = {

    list: (callback) => {
        const sql = `WITH BranchesCTE AS (
  SELECT 
    b.id AS branch_id,
    b.customer_id
  FROM 
    branches b
)
SELECT 
  customers.client_unique_id,
  customers.name,
  customer_metas.single_point_of_contact,
  customers.id AS main_id,
  COALESCE(branch_counts.branch_count, 0) AS branch_count,
  COALESCE(application_counts.application_count, 0) AS application_count
FROM 
  customers
LEFT JOIN 
  customer_metas 
ON 
  customers.id = customer_metas.customer_id
LEFT JOIN 
  (
    SELECT 
      customer_id, 
      COUNT(*) AS branch_count
    FROM 
      branches
    GROUP BY 
      customer_id
  ) AS branch_counts
ON 
  customers.id = branch_counts.customer_id
LEFT JOIN 
  (
    SELECT 
      b.customer_id, 
      COUNT(ca.id) AS application_count
    FROM 
      BranchesCTE b
    INNER JOIN 
      client_applications ca ON b.branch_id = ca.branch_id
    WHERE 
      ca.status != 'closed'
    GROUP BY 
      b.customer_id
  ) AS application_counts
ON 
  customers.id = application_counts.customer_id;
    `;

        pool.query(sql, (err, results) => {
            if (err) {
                console.error("Database query error:", err);
                return callback(err, null);
            }
            callback(null, results);
        });
    },

    listByCustomerID: (customer_id, callback) => {
        const sql = `SELECT b.id AS branch_id, b.name AS branch_name, COUNT(ca.id) AS application_count
FROM client_applications ca
INNER JOIN branches b ON ca.branch_id = b.id
WHERE ca.status != 'closed'
AND b.customer_id = ?
GROUP BY b.name;
`;
        pool.query(sql, [customer_id], (err, results) => {
            if (err) {
                console.error("Database query error:", err);
                return callback(err, null);
            }
            callback(null, results);
        });
    },
};

module.exports = Customer;
