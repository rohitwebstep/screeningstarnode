const { pool, startConnection, connectionRelease } = require("../../config/db");

const ReportMaster = {
  applicationStatus: async (callback) => {
    try {
      console.log("Starting report generation...");

      const sql = `
      SELECT 
          ca.branch_id, 
          ca.customer_id, 
          ca.application_id, 
          ca.services AS services, 
          ca.name AS application_name, 
          ca.id AS client_application_id, 
          ca.created_at AS application_created_at,
          cmt.qc_date, 
          cmt.is_verify, 
          cmt.qc_done_by, 
          cmt.report_date, 
          cmt.overall_status, 
          cmt.report_generate_by, 
          cmt.first_insufficiency_marks,
          cmt.first_insuff_date,
          cmt.first_insuff_reopened_date,
          cmt.second_insufficiency_marks,
          cmt.second_insuff_date,
          cmt.second_insuff_reopened_date,
          cmt.third_insufficiency_marks,
          cmt.third_insuff_date,
          cmt.third_insuff_reopened_date,
          ad_report.name AS report_generator_name,
          ad_qc.name AS qc_done_by_name,
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
      console.log("SQL query prepared.");

      // Establish database connection
      const connection = await new Promise((resolve, reject) =>
        startConnection((err, conn) => (err ? reject(err) : resolve(conn)))
      );
      console.log("Database connection established.");

      // Execute the main query
      const results = await new Promise((resolve, reject) =>
        connection.query(sql, (err, res) => (err ? reject(err) : resolve(res)))
      );
      console.log(
        "SQL query executed successfully. Rows fetched:",
        results.length
      );

      const groupedResults = [];

      for (const row of results) {
        console.log("Processing row for application:", row.application_name);

        // Find or create customer object
        let customer = groupedResults.find(
          (c) => c.customer_id === row.customer_id
        );
        if (!customer) {
          customer = {
            customer_id: row.customer_id,
            customer_name: row.customer_name,
            customer_unique_id: row.customer_unique_id,
            branches: [],
          };
          groupedResults.push(customer);
          console.log("New customer added:", customer.customer_name);
        }

        // Find or create branch object
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
          console.log("New branch added:", branch.branch_name);
        }

        // Fetch service statuses
        const serviceIds = row.services.split(",");
        console.log("Service IDs for application:", serviceIds);

        const statuses = {};

        for (const serviceId of serviceIds) {
          console.log("Fetching report data for service ID:", serviceId);

          const reportFormResults = await new Promise((resolve, reject) =>
            connection.query(
              `SELECT json FROM report_forms WHERE service_id = ?`,
              [serviceId],
              (err, res) => (err ? reject(err) : resolve(res))
            )
          );

          if (reportFormResults.length > 0) {
            const parsedData = JSON.parse(reportFormResults[0].json);
            const dbTable = parsedData.db_table.replace(/-/g, "_");
            const dbTableHeading = parsedData.heading;
            console.log("Resolved DB table:", dbTable);

            const statusResults = await new Promise((resolve, reject) => {
              connection.query(`SHOW TABLES LIKE ?`, [dbTable], (err, res) =>
                err ? reject(err) : resolve(res)
              );
            });

            if (statusResults.length === 0) {
              // If the table does not exist, set the status to "INITIATED"
              statuses[dbTableHeading] = "INITIATED";
              console.log(
                `Table ${dbTable} does not exist. Status set to "INITIATED".`
              );
            } else {
              // If the table exists, fetch the status
              const existingStatusResults = await new Promise(
                (resolve, reject) =>
                  connection.query(
                    `SELECT status FROM ${dbTable} WHERE client_application_id = ?`,
                    [row.client_application_id],
                    (err, res) => (err ? reject(err) : resolve(res))
                  )
              );

              const status =
                existingStatusResults.length > 0
                  ? existingStatusResults[0].status
                  : null;
              if (status) {
                statuses[dbTableHeading] = status;
                console.log(`Status fetched from table ${dbTable}:`, status);
              }
            }
          }
        }

        // Add application if all statuses are valid
        if (Object.keys(statuses).length === serviceIds.length) {
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
            services_status: statuses,
            first_insufficiency_marks: row.first_insufficiency_marks,
            first_insuff_date: row.first_insuff_date,
            first_insuff_reopened_date: row.first_insuff_reopened_date,
            second_insufficiency_marks: row.second_insufficiency_marks,
            second_insuff_date: row.second_insuff_date,
            second_insuff_reopened_date: row.second_insuff_reopened_date,
            third_insufficiency_marks: row.third_insufficiency_marks,
            third_insuff_date: row.third_insuff_date,
            third_insuff_reopened_date: row.third_insuff_reopened_date,
          });
          console.log("Application added:", row.application_name);
        }
      }

      // Clean grouped results
      const cleanGroupedResults = groupedResults
        .map((customer) => {
          customer.branches = customer.branches.filter(
            (branch) => branch.applications.length > 0
          );
          return customer;
        })
        .filter((customer) => customer.branches.length > 0);

      console.log("Final grouped results prepared.");
      connectionRelease(connection); // Release connection
      callback(null, cleanGroupedResults);
    } catch (error) {
      console.error("Error during report generation:", error);
      callback(error, null);
    }
  },

  reportGeneration: async (callback) => {
    try {
      console.log("Starting report generation...");

      const sql = `
        SELECT 
            ca.branch_id, 
            ca.customer_id, 
            ca.application_id, 
            ca.services AS services, 
            ca.name AS application_name, 
            ca.id AS client_application_id, 
            ca.created_at AS application_created_at,
            cmt.qc_date, 
            cmt.is_verify, 
            cmt.qc_done_by, 
            cmt.report_date, 
            cmt.overall_status, 
            cmt.report_generate_by, 
            cmt.first_insufficiency_marks,
            cmt.first_insuff_date,
            cmt.first_insuff_reopened_date,
            cmt.second_insufficiency_marks,
            cmt.second_insuff_date,
            cmt.second_insuff_reopened_date,
            cmt.third_insufficiency_marks,
            cmt.third_insuff_date,
            cmt.third_insuff_reopened_date,
            ad_report.name AS report_generator_name,
            ad_qc.name AS qc_done_by_name,
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

      console.log("SQL query prepared.");

      // Establish database connection
      const connection = await new Promise((resolve, reject) =>
        startConnection((err, conn) => (err ? reject(err) : resolve(conn)))
      );
      console.log("Database connection established.");

      // Execute the main query
      const results = await new Promise((resolve, reject) =>
        connection.query(sql, (err, res) => (err ? reject(err) : resolve(res)))
      );
      console.log(
        "SQL query executed successfully. Rows fetched:",
        results.length
      );

      const validStatuses = [
        "completed",
        "completed_green",
        "completed_red",
        "completed_orange",
        "completed_pink",
        "completed_yellow",
      ];

      const groupedResults = [];

      for (const row of results) {
        console.log("Processing row for application:", row.application_name);

        // Find or create customer object
        let customer = groupedResults.find(
          (c) => c.customer_id === row.customer_id
        );
        if (!customer) {
          customer = {
            customer_id: row.customer_id,
            customer_name: row.customer_name,
            customer_unique_id: row.customer_unique_id,
            branches: [],
          };
          groupedResults.push(customer);
          console.log("New customer added:", customer.customer_name);
        }

        // Find or create branch object
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
          console.log("New branch added:", branch.branch_name);
        }

        // Fetch service statuses
        const serviceIds = row.services.split(",");
        console.log("Service IDs for application:", serviceIds);

        const statuses = {};
        let allValidStatuses = true;

        for (const serviceId of serviceIds) {
          console.log("Fetching report data for service ID:", serviceId);

          const reportFormResults = await new Promise((resolve, reject) =>
            connection.query(
              `SELECT json FROM report_forms WHERE service_id = ?`,
              [serviceId],
              (err, res) => (err ? reject(err) : resolve(res))
            )
          );

          if (reportFormResults.length > 0) {
            const parsedData = JSON.parse(reportFormResults[0].json);
            const dbTable = parsedData.db_table.replace(/-/g, "_");
            const dbTableHeading = parsedData.heading;
            console.log("Resolved DB table:", dbTable);

            const statusResults = await new Promise((resolve, reject) => {
              connection.query(`SHOW TABLES LIKE ?`, [dbTable], (err, res) =>
                err ? reject(err) : resolve(res)
              );
            });

            if (statusResults.length === 0) {
              // If the table does not exist, set the status to "INITIATED"
              statuses[dbTableHeading] = "INITIATED";
              console.log(
                `Table ${dbTable} does not exist. Status set to "INITIATED".`
              );
            } else {
              // If the table exists, fetch the status
              const existingStatusResults = await new Promise(
                (resolve, reject) =>
                  connection.query(
                    `SELECT status FROM ${dbTable} WHERE client_application_id = ?`,
                    [row.client_application_id],
                    (err, res) => (err ? reject(err) : resolve(res))
                  )
              );

              const status =
                existingStatusResults.length > 0
                  ? existingStatusResults[0].status
                  : null;
              if (status) {
                statuses[dbTableHeading] = status;
                if (!validStatuses.includes(status)) {
                  allValidStatuses = false;
                  console.log("Invalid status detected:", status);
                }
                console.log(`Status fetched from table ${dbTable}:`, status);
              }
            }
          }
        }

        // Add application if all statuses are valid
        if (
          allValidStatuses &&
          Object.keys(statuses).length === serviceIds.length
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
            services_status: statuses,
            first_insufficiency_marks: row.first_insufficiency_marks,
            first_insuff_date: row.first_insuff_date,
            first_insuff_reopened_date: row.first_insuff_reopened_date,
            second_insufficiency_marks: row.second_insufficiency_marks,
            second_insuff_date: row.second_insuff_date,
            second_insuff_reopened_date: row.second_insuff_reopened_date,
            third_insufficiency_marks: row.third_insufficiency_marks,
            third_insuff_date: row.third_insuff_date,
            third_insuff_reopened_date: row.third_insuff_reopened_date,
          });
          console.log("Application added:", row.application_name);
        }
      }

      // Clean grouped results
      const cleanGroupedResults = groupedResults
        .map((customer) => {
          customer.branches = customer.branches.filter(
            (branch) => branch.applications.length > 0
          );
          return customer;
        })
        .filter((customer) => customer.branches.length > 0);

      console.log("Final grouped results prepared.");
      connectionRelease(connection); // Release connection
      callback(null, cleanGroupedResults);
    } catch (error) {
      console.error("Error during report generation:", error);
      callback(error, null);
    }
  },
};

module.exports = ReportMaster;
