const { pool, startConnection, connectionRelease } = require("../../config/db");

const BillingEscalation = {
  applicationStatus: (callback) => {
    const sql = `
    SELECT 
        ca.branch_id, 
        ca.customer_id, 
        ca.application_id, 
        ca.name AS application_name, 
        ca.id AS client_application_id, 
        cmt.overall_status, 
        cmt.report_date, 
        cmt.report_generate_by, 
        ad_report.name AS report_generator_name,
        cmt.qc_date, 
        cmt.qc_done_by, 
        ad_qc.name AS qc_done_by_name,
        cmt.is_verify, 
        ca.created_at AS application_created_at,
        cust.name AS customer_name, 
        cust.client_unique_id AS customer_unique_id,
        br.name AS branch_name
    FROM client_applications AS ca
    JOIN customers AS cust ON cust.id = ca.customer_id
    JOIN branches AS br ON br.id = ca.branch_id
    LEFT JOIN customer_metas AS cm ON cm.customer_id = cust.id
    LEFT JOIN cmt_applications AS cmt ON ca.id = cmt.client_application_id
    LEFT JOIN admins AS ad_report ON ad_report.id = cmt.report_generate_by
    LEFT JOIN admins AS ad_qc ON ad_qc.id = cmt.qc_done_by
    WHERE 
      cmt.overall_status IN ('complete', 'completed')
      AND ca.is_report_downloaded IN (1, '1');
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

        // Transform the results to the desired hierarchy
        const groupedResults = results.reduce((acc, row) => {
          // Ensure the customer object exists in the accumulator
          let customer = acc.find((c) => c.customer_id === row.customer_id);
          if (!customer) {
            customer = {
              customer_id: row.customer_id,
              customer_name: row.customer_name,
              customer_unique_id: row.customer_unique_id,
              branches: [],
            };
            acc.push(customer);
          }

          // Ensure the branch object exists in the customer
          let branch = customer.branches.find(
            (b) => b.branch_id === row.branch_id
          );
          if (!branch) {
            branch = {
              branch_id: row.branch_id,
              branch_name: row.branch_name,
              applications: [],
            };
            customer.branches.push(branch);
          }

          // Push the application into the branch's applications array
          branch.applications.push({
            application_id: row.application_id,
            application_name: row.application_name,
            client_application_id: row.client_application_id,
            overall_status: row.overall_status,
            report_date: row.report_date,
            report_generate_by: row.report_generate_by,
            report_generator_name: row.report_generator_name,
            qc_date: row.qc_date,
            qc_done_by: row.qc_done_by,
            qc_done_by_name: row.qc_done_by_name,
            is_verify: row.is_verify,
            application_created_at: row.application_created_at,
          });

          return acc;
        }, []);

        callback(null, groupedResults);
      });
    });
  },

  reportGeneration: (callback) => {
    const sql = `
      SELECT 
          ca.branch_id, 
          ca.customer_id, 
          ca.application_id, 
          ca.name AS application_name, 
          ca.name AS services, 
          ca.id AS client_application_id, 
          cmt.overall_status, 
          cmt.report_date, 
          cmt.report_generate_by, 
          ad_report.name AS report_generator_name,
          cmt.qc_date, 
          cmt.qc_done_by, 
          ad_qc.name AS qc_done_by_name,
          cmt.is_verify, 
          ca.created_at AS application_created_at,
          cust.name AS customer_name, 
          cust.client_unique_id AS customer_unique_id,
          br.name AS branch_name
      FROM client_applications AS ca
      JOIN customers AS cust ON cust.id = ca.customer_id
      JOIN branches AS br ON br.id = ca.branch_id
      LEFT JOIN customer_metas AS cm ON cm.customer_id = cust.id
      LEFT JOIN cmt_applications AS cmt ON ca.id = cmt.client_application_id
      LEFT JOIN admins AS ad_report ON ad_report.id = cmt.report_generate_by
      LEFT JOIN admins AS ad_qc ON ad_qc.id = cmt.qc_done_by
      WHERE cmt.overall_status = 'wip';`;

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

        // Status options we are looking for
        const validStatuses = [
          "completed",
          "completed_green",
          "completed_red",
          "completed_orange",
          "completed_pink",
          "completed_yellow",
        ];

        // Process results and transform them into the desired hierarchy
        const groupedResults = results.reduce((acc, row) => {
          // Ensure the customer object exists in the accumulator
          let customer = acc.find((c) => c.customer_id === row.customer_id);
          if (!customer) {
            customer = {
              customer_id: row.customer_id,
              customer_name: row.customer_name,
              customer_unique_id: row.customer_unique_id,
              branches: [],
            };
            acc.push(customer);
          }

          // Ensure the branch object exists in the customer
          let branch = customer.branches.find(
            (b) => b.branch_id === row.branch_id
          );
          if (!branch) {
            branch = {
              branch_id: row.branch_id,
              branch_name: row.branch_name,
              applications: [],
            };
            customer.branches.push(branch);
          }

          // Split the services string and process each service_id
          const serviceIds = row.services.split(","); // Split by comma

          let allValidStatuses = true; // Flag to check if all statuses are valid
          let statuses = []; // Array to hold all statuses

          serviceIds.forEach((serviceId) => {
            // Query to fetch the report_form JSON for each service_id
            const reportFormSql = `SELECT json FROM report_forms WHERE service_id = ?`;
            connection.query(
              reportFormSql,
              [serviceId],
              (formErr, formResults) => {
                if (formErr) {
                  console.error("Error fetching report form JSON", formErr);
                  return;
                }

                if (formResults.length > 0) {
                  const parsedData = JSON.parse(formResults[0].json);
                  const db_table = parsedData.db_table.replace(/-/g, "_"); // Replace hyphens with underscores

                  // Query the respective table to fetch the status
                  const statusSql = `SELECT status FROM ${db_table} WHERE client_application_id = ?`;
                  connection.query(
                    statusSql,
                    [row.client_application_id],
                    (statusErr, statusResults) => {
                      if (statusErr) {
                        console.error("Error fetching status", statusErr);
                        return;
                      }

                      const status =
                        statusResults.length > 0
                          ? statusResults[0].status
                          : null;

                      // Store the status
                      statuses.push(status);

                      // Check if the status is valid
                      if (status && !validStatuses.includes(status)) {
                        allValidStatuses = false; // Mark the entry invalid if any status is not valid
                      }

                      // Only push the application if all statuses are valid
                      if (
                        allValidStatuses &&
                        statuses.length === serviceIds.length
                      ) {
                        branch.applications.push({
                          application_id: row.application_id,
                          application_name: row.application_name,
                          client_application_id: row.client_application_id,
                          overall_status: row.overall_status,
                          report_date: row.report_date,
                          report_generate_by: row.report_generate_by,
                          report_generator_name: row.report_generator_name,
                          qc_date: row.qc_date,
                          qc_done_by: row.qc_done_by,
                          qc_done_by_name: row.qc_done_by_name,
                          is_verify: row.is_verify,
                          application_created_at: row.application_created_at,
                          services_status: statuses, // Add all statuses for each service
                        });
                      }
                    }
                  );
                }
              }
            );
          });

          return acc;
        }, []);

        // Remove empty branches (if applications are empty)
        const cleanGroupedResults = groupedResults
          .map((customer) => {
            // Remove empty branches
            customer.branches = customer.branches.filter(
              (branch) => branch.applications.length > 0
            );

            return customer;
          })
          .filter((customer) => customer.branches.length > 0); // Remove empty customers (if no branches)

        callback(null, cleanGroupedResults);
      });
    });
  },
};

module.exports = BillingEscalation;
