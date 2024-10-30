const { pool, startConnection, connectionRelease } = require("../../config/db");

const Holiday = {
  list: (callback) => {
    const sql = `
      SELECT cmt.report_date, ca.id AS client_application_id, ca.customer_id, ca.branch_id, 
             ca.application_id, ca.name, ca.created_at, 
             cust.name AS customer_name, cust.emails AS customer_emails, cust.client_unique_id AS customer_unique_id, cust.mobile AS customer_mobile, 
             br.name AS branch_name, br.email AS branch_email, br.mobile_number AS branch_mobile
      FROM cmt_applications AS cmt
      JOIN client_applications AS ca ON ca.id = cmt.client_application_id
      JOIN customers AS cust ON cust.id = ca.customer_id
      JOIN branches AS br ON br.id = ca.branch_id
      WHERE cmt.report_date IS NOT NULL AND cmt.report_date != '';
    `;

    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(sql, (queryErr, results) => {
        connectionRelease(connection); // Release the connection

        if (queryErr) {
          console.error("Database query error: 47", queryErr);
          return callback(queryErr, null);
        }

        // Process results to create a hierarchical structure grouped by customer, then branch, then applications
        const hierarchy = results.reduce((accumulator, row) => {
          // If customer_id is not yet in the accumulator, initialize it
          if (!accumulator[row.customer_id]) {
            accumulator[row.customer_id] = {
              customer_id: row.customer_id,
              customer_name: row.customer_name,
              customer_emails: row.customer_emails,
              customer_unique_id: row.customer_unique_id,
              customer_mobile: row.customer_mobile,
              branches: {}
            };
          }

          // If branch_id is not yet in the customer's branches, initialize it
          if (!accumulator[row.customer_id].branches[row.branch_id]) {
            accumulator[row.customer_id].branches[row.branch_id] = {
              branch_id: row.branch_id,
              branch_name: row.branch_name,
              branch_email: row.branch_email,
              branch_mobile: row.branch_mobile,
              applications: []
            };
          }

          // Add application information within the branch under the customer
          accumulator[row.customer_id].branches[row.branch_id].applications.push({
            client_application_id: row.client_application_id,
            application_id: row.application_id,
            name: row.name,
            report_date: row.report_date,
            created_at: row.created_at
          });

          return accumulator;
        }, {});

        // Convert the hierarchy object to an array with nested branches and applications
        const hierarchyArray = Object.values(hierarchy).map(customer => ({
          ...customer,
          branches: Object.values(customer.branches)
        }));

        callback(null, hierarchyArray);
      });
    });
  },
};

module.exports = Holiday;
