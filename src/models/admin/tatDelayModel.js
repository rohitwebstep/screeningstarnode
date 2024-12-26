const { pool, startConnection, connectionRelease } = require("../../config/db");
const moment = require("moment"); // Ensure you have moment.js installed

const tatDelay = {
  list: (callback) => {
    // SQL query to retrieve applications, customers, branches, and tat_days
    const applicationsQuery = `
      SELECT 
        ca.branch_id, 
        ca.customer_id, 
        ca.is_priority, 
        ca.application_id, 
        ca.name AS application_name, 
        ca.id AS client_application_id, 
        ca.created_at AS application_created_at, 
        cmt.report_date, 
        cmt.first_insufficiency_marks,
        cmt.first_insuff_date,
        cmt.first_insuff_reopened_date,
        cmt.second_insufficiency_marks,
        cmt.second_insuff_date,
        cmt.second_insuff_reopened_date,
        cmt.third_insufficiency_marks,
        cmt.third_insuff_date,
        cmt.third_insuff_reopened_date,
        cmt.delay_reason,
        cust.name AS customer_name, 
        cust.mobile AS customer_mobile, 
        cust.emails AS customer_emails, 
        cust.client_unique_id AS customer_unique_id, 
        cm.tat_days AS tat_days,
        br.name AS branch_name, 
        br.email AS branch_email, 
        br.mobile_number AS branch_mobile
      FROM client_applications AS ca
      JOIN customers AS cust ON cust.id = ca.customer_id
      JOIN branches AS br ON br.id = ca.branch_id
      LEFT JOIN customer_metas AS cm ON cm.customer_id = cust.id
      LEFT JOIN cmt_applications AS cmt ON ca.id = cmt.client_application_id
      WHERE cmt.overall_status != 'completed' AND ca.tat_delete != 1;
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

                // Construct the hierarchical structure for applications
                const applicationHierarchy = applicationResults.reduce(
                  (accumulator, row) => {
                    const {
                      customer_id,
                      customer_name,
                      customer_emails,
                      customer_unique_id,
                      customer_mobile,
                      tat_days,
                      branch_id,
                      branch_name,
                      branch_email,
                      branch_mobile,
                      client_application_id,
                      application_id,
                      application_name,
                      is_priority,
                      application_created_at,
                      first_insufficiency_marks,
                      first_insuff_date,
                      first_insuff_reopened_date,
                      second_insufficiency_marks,
                      second_insuff_date,
                      second_insuff_reopened_date,
                      third_insufficiency_marks,
                      third_insuff_date,
                      third_insuff_reopened_date,
                      delay_reason,
                    } = row;

                    // Initialize customer entry if it doesn't exist
                    if (!accumulator[customer_id]) {
                      accumulator[customer_id] = {
                        customer_id,
                        customer_name,
                        customer_emails,
                        customer_unique_id,
                        customer_mobile,
                        tat_days: parseInt(tat_days, 10), // Parse TAT days as an integer
                        branches: {},
                      };
                    }

                    // Initialize branch entry if it doesn't exist
                    if (!accumulator[customer_id].branches[branch_id]) {
                      accumulator[customer_id].branches[branch_id] = {
                        branch_id,
                        branch_name,
                        branch_email,
                        branch_mobile,
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
                      accumulator[customer_id].branches[
                        branch_id
                      ].applications.push({
                        client_application_id,
                        application_id,
                        application_name,
                        is_priority,
                        application_created_at,
                        days_out_of_tat: daysOutOfTat,
                        first_insufficiency_marks,
                        first_insuff_date,
                        first_insuff_reopened_date,
                        second_insufficiency_marks,
                        second_insuff_date,
                        second_insuff_reopened_date,
                        third_insufficiency_marks,
                        third_insuff_date,
                        third_insuff_reopened_date,
                        delay_reason,
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

                // Callback with both the application hierarchy and holidays array
                callback(null, {
                  applicationHierarchy: applicationHierarchyArray,
                  holidays: holidaysArray,
                });
              }
            );
          });
        }
      );
    });

    function handleQueryError(error, connection, callback) {
      connectionRelease(connection); // Ensure the connection is released
      console.error("Database query error: 533", error);
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

  delete: (customer_id, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      const sql = `
        UPDATE \`client_applications\`
        SET \`tat_delete\` = ?
        WHERE \`customer_id\` = ?
      `;

      connection.query(sql, ["1", customer_id], (queryErr, results) => {
        // Ensure the connection is released in both success and error cases
        connectionRelease(connection);

        if (queryErr) {
          console.error("Database query error:", queryErr);
          return callback(
            { message: "Error executing the database query", error: queryErr },
            null
          );
        }

        callback(null, results);
      });
    });
  },
};

module.exports = tatDelay;
