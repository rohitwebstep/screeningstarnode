const { pool, startConnection, connectionRelease } = require("../../config/db");
const moment = require("moment"); // Ensure you have moment.js installed

const notification = {
  index: (callback) => {
    // SQL query to retrieve applications, customers, branches, and tat_days
    const applicationsQuery = `
      SELECT 
        cmt.report_date, 
        ca.id AS client_application_id, 
        ca.is_priority, 
        ca.customer_id, 
        ca.branch_id, 
        ca.application_id, 
        ca.name AS application_name, 
        ca.created_at AS application_created_at, 
        cust.name AS customer_name, 
        cust.client_unique_id AS customer_unique_id, 
        cm.tat_days AS tat_days,
        br.name AS branch_name
      FROM client_applications AS ca
      JOIN customers AS cust ON cust.id = ca.customer_id
      JOIN branches AS br ON br.id = ca.branch_id
      LEFT JOIN customer_metas AS cm ON cm.customer_id = cust.id
      LEFT JOIN cmt_applications AS cmt ON ca.id = cmt.client_application_id
      WHERE cmt.report_date IS NULL 
       OR TRIM(cmt.report_date) = '0000-00-00'
       OR TRIM(cmt.report_date) = '';
    `;

    // SQL query to fetch holidays
    const holidaysQuery = `SELECT id AS holiday_id, title AS holiday_title, date AS holiday_date FROM holidays;`;

    // SQL query to fetch weekends
    const weekendsQuery = `SELECT weekends FROM company_info WHERE status = 1;`;

    startConnection((connectionError, connection) => {
      if (connectionError) {
        return callback(connectionError, null);
      }

      // Execute the applications query
      connection.query(
        applicationsQuery,
        (appQueryError, applicationResults) => {
          if (appQueryError) {
            return handleQueryError(appQueryError, connection, callback);
          }

          // Execute the holidays query
          connection.query(holidaysQuery, (holQueryError, holidayResults) => {
            if (holQueryError) {
              return handleQueryError(holQueryError, connection, callback);
            }

            // Prepare holiday dates for calculations
            const holidayDates = holidayResults.map((holiday) =>
              moment(holiday.holiday_date).startOf("day")
            );

            // Execute the weekends query
            connection.query(
              weekendsQuery,
              (weekendQueryError, weekendResults) => {
                connectionRelease(connection); // Always release the connection

                if (weekendQueryError) {
                  console.error(
                    "Database query error: Weekends",
                    weekendQueryError
                  );
                  return callback(weekendQueryError, null);
                }

                const weekends = weekendResults[0]?.weekends
                  ? JSON.parse(weekendResults[0].weekends)
                  : [];
                const weekendsSet = new Set(
                  weekends.map((day) => day.toLowerCase())
                );

                let tatDelaysApplicationIds = [];
                // Construct the hierarchical structure for applications
                const applicationHierarchy = applicationResults.reduce(
                  (accumulator, row) => {
                    const {
                      customer_id,
                      customer_name,
                      customer_unique_id,
                      tat_days,
                      branch_id,
                      branch_name,
                      client_application_id,
                      application_id,
                      application_name,
                      is_priority,
                      application_created_at,
                    } = row;

                    // Initialize customer entry if it doesn't exist
                    if (!accumulator[customer_id]) {
                      accumulator[customer_id] = {
                        customer_id,
                        customer_name,
                        customer_unique_id,
                        tat_days: parseInt(tat_days, 10), // Parse TAT days as an integer
                        branches: {},
                      };
                    }

                    // Initialize branch entry if it doesn't exist
                    if (!accumulator[customer_id].branches[branch_id]) {
                      accumulator[customer_id].branches[branch_id] = {
                        branch_id,
                        branch_name,
                        applications: [],
                      };
                    }

                    // Calculate days out of TAT
                    const applicationDate = moment(application_created_at);
                    const tatDays = parseInt(tat_days, 10);
                    const dueDate = calculateDueDate(
                      applicationDate,
                      tatDays,
                      holidayDates,
                      weekendsSet
                    );

                    // Calculate days out of TAT
                    const daysOutOfTat = calculateDaysOutOfTat(
                      dueDate,
                      moment(),
                      holidayDates,
                      weekendsSet
                    );

                    // Only add application information if days out of TAT is greater than 0
                    if (daysOutOfTat > 0) {
                      tatDelaysApplicationIds.push(client_application_id);
                      accumulator[customer_id].branches[
                        branch_id
                      ].applications.push({
                        client_application_id,
                        application_id,
                        application_name,
                        is_priority,
                        application_created_at,
                        days_out_of_tat: daysOutOfTat, // Include days out of TAT
                      });
                    }

                    return accumulator;
                  },
                  {}
                );

                // Convert the application hierarchy object to an array with nested branches and applications
                const applicationHierarchyArray = Object.values(
                  applicationHierarchy
                )
                  .map((customer) => ({
                    ...customer,
                    branches: Object.values(customer.branches).filter(
                      (branch) => branch.applications.length > 0 // Only include branches with applications
                    ),
                  }))
                  .filter((customer) => customer.branches.length > 0); // Only include customers with branches

                // Map holiday results into a structured array
                const holidaysArray = holidayResults.map((holiday) => ({
                  id: holiday.holiday_id,
                  title: holiday.holiday_title,
                  date: holiday.holiday_date,
                }));

                startConnection((err, connection) => {
                  if (err) {
                    return callback(
                      {
                        message: "Failed to connect to the database",
                        error: err,
                      },
                      null
                    );
                  }

                  const sqlClient = `
                  SELECT 
                      ca.name AS client_applicant_name, 
                      ca.is_priority, 
                      ca.customer_id, 
                      ca.branch_id, 
                      ca.application_id, 
                      ca.id AS client_application_id, 
                      ca.id, 
                      c.name AS customer_name, 
                      c.client_unique_id AS customer_unique_id, 
                      br.name AS branch_name
                  FROM 
                      \`client_applications\` AS ca
                  LEFT JOIN 
                      \`client_spocs\` AS cs 
                      ON ca.client_spoc_id = cs.id
                  LEFT JOIN 
                      \`customers\` AS c 
                      ON ca.customer_id = c.id
                  LEFT JOIN 
                      \`branches\` AS br 
                      ON ca.branch_id = br.id
                  LEFT JOIN 
                      \`cmt_applications\` AS cmt 
                      ON ca.id = cmt.client_application_id
                  WHERE 
                      cmt.client_application_id IS NULL
                      AND ca.id NOT IN (${tatDelaysApplicationIds})
                  ORDER BY 
                      ca.created_at DESC;
                `;

                  connection.query(sqlClient, (queryErr, clientResults) => {
                    if (queryErr) {
                      console.error("Database query error: 110", queryErr);
                      connectionRelease(connection);
                      return callback(
                        { message: "Error executing query", error: queryErr },
                        null
                      );
                    }

                    const hierarchy = clientResults.reduce((acc, row) => {
                      const {
                        customer_id,
                        customer_name,
                        customer_unique_id,
                        branch_id,
                        branch_name,
                        application_id,
                        client_application_id,
                        client_applicant_name,
                        is_priority,
                      } = row;

                      // Initialize customer object if not already present
                      if (!acc[customer_id]) {
                        acc[customer_id] = {
                          customer_id,
                          customer_name,
                          customer_unique_id,
                          branches: {},
                        };
                      }

                      // Initialize branch object if not already present under the customer
                      if (!acc[customer_id].branches[branch_id]) {
                        acc[customer_id].branches[branch_id] = {
                          branch_id,
                          branch_name,
                          applications: [],
                        };
                      }

                      // Add the application under the branch
                      acc[customer_id].branches[branch_id].applications.push({
                        client_application_id,
                        client_applicant_name,
                        application_id,
                        is_priority,
                      });

                      return acc;
                    }, {});

                    // Convert hierarchical object to an array format
                    const formattedHierarchy = Object.values(hierarchy).map(
                      (customer) => ({
                        ...customer,
                        branches: Object.values(customer.branches),
                      })
                    );
                    // Callback with both the application hierarchy and holidays array
                    callback(null, {
                      tatDelayList: applicationHierarchyArray,
                      newApplications: formattedHierarchy,
                      // holidays: holidaysArray,
                    });
                    connectionRelease(connection);
                  });
                });
              }
            );
          });
        }
      );
    });

    function handleQueryError(error, connection, callback) {
      connectionRelease(connection); // Ensure the connection is released
      console.error("Database query error:", error);
      callback(error, null);
    }

    function calculateDueDate(startDate, tatDays, holidayDates, weekendsSet) {
      let count = 0;
      let currentDate = startDate.clone();

      while (count < tatDays) {
        currentDate.add(1, "days");

        // Skip weekends
        if (weekendsSet.has(currentDate.format("dddd").toLowerCase())) {
          continue;
        }

        // Skip holidays
        if (
          holidayDates.some((holiday) => holiday.isSame(currentDate, "day"))
        ) {
          continue;
        }

        count++; // Only count valid business days
      }

      return currentDate; // This will be the due date
    }

    function calculateDaysOutOfTat(
      dueDate,
      endDate,
      holidayDates,
      weekendsSet
    ) {
      let count = 0;
      let currentDate = dueDate.clone();

      // Count business days from dueDate to endDate
      while (currentDate.isBefore(endDate, "day")) {
        currentDate.add(1, "days");

        // Skip weekends
        if (weekendsSet.has(currentDate.format("dddd").toLowerCase())) {
          continue;
        }

        // Skip holidays
        if (
          holidayDates.some((holiday) => holiday.isSame(currentDate, "day"))
        ) {
          continue;
        }

        count++; // Count only valid business days
      }
      return count; // Return total days out of TAT
    }
  },
};

module.exports = notification;
