const crypto = require("crypto");
const {
  pool,
  startConnection,
  connectionRelease,
} = require("../../../config/db");

// Generates a new random token
const generateToken = () => crypto.randomBytes(32).toString("hex");

// Returns the expiry time for the token (1 hour from now)
const getTokenExpiry = () => new Date(Date.now() + 3600000).toISOString();

const common = {
  isBranchTokenValid: (_token, branch_id, callback) => {
    if (typeof callback !== "function") {
      console.error("Callback is not a function");
      return;
    }

    const sql = `
      SELECT \`login_token\`, \`token_expiry\`
      FROM \`branches\`
      WHERE \`id\` = ?
    `;

    startConnection((err, connection) => {
      if (err) {
        console.error("Connection error:", err);
        return callback({ status: false, message: "Connection error" }, null);
      }

      connection.query(sql, [branch_id], (err, results) => {
        if (err) {
          connectionRelease(connection);
          console.error("Database query error: 117", err);
          return callback({ status: false, message: "Database error" }, null);
        }

        if (results.length === 0) {
          connectionRelease(connection);
          return callback({ status: false, message: "Branch not found" }, null);
        }

        const currentToken = results[0].login_token;
        const tokenExpiry = new Date(results[0].token_expiry);
        const currentTime = new Date();

        if (_token !== currentToken) {
          connectionRelease(connection);
          return callback(
            { status: false, message: "Invalid token provided" },
            null
          );
        }

        if (tokenExpiry > currentTime) {
          connectionRelease(connection);
          callback(null, { status: true, message: "Token is valid" });
        } else {
          const newToken = generateToken();
          const newTokenExpiry = getTokenExpiry();

          const updateSql = `
            UPDATE \`branches\`
            SET \`login_token\` = ?, \`token_expiry\` = ?
            WHERE \`id\` = ?
          `;

          connection.query(
            updateSql,
            [newToken, newTokenExpiry, branch_id],
            (updateErr) => {
              connectionRelease(connection); // Release connection

              if (updateErr) {
                console.error("Error updating token:", updateErr);
                return callback(
                  { status: false, message: "Error updating token" },
                  null
                );
              }

              callback(null, {
                status: true,
                message: "Token was expired and has been refreshed",
                newToken,
              });
            }
          );
        }
      });
    });
  },

  branchLoginLog: (branch_id, action, result, error, callback) => {
    if (typeof callback !== "function") {
      console.error("Callback is not a function");
      return;
    }

    const insertSql = `
      INSERT INTO \`branch_login_logs\` (\`branch_id\`, \`action\`, \`result\`, \`error\`, \`created_at\`)
      VALUES (?, ?, ?, ?, NOW())
    `;

    startConnection((err, connection) => {
      if (err) {
        console.error("Connection error:", err);
        return callback({ status: false, message: "Connection error" }, null);
      }

      connection.query(insertSql, [branch_id, action, result, error], (err) => {
        connectionRelease(connection); // Release connection

        if (err) {
          console.error("Database insertion error:", err);
          return callback({ status: false, message: "Database error" }, null);
        }

        callback(null, {
          status: true,
          message: "Branch login log entry added successfully",
        });
      });
    });
  },

  branchActivityLog: (
    branch_id,
    module,
    action,
    result,
    update,
    error,
    callback
  ) => {
    if (typeof callback !== "function") {
      console.error("Callback is not a function");
      return;
    }

    const insertSql = `
      INSERT INTO \`branch_activity_logs\` (\`branch_id\`, \`module\`, \`action\`, \`result\`, \`update\`, \`error\`, \`created_at\`)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;

    startConnection((err, connection) => {
      if (err) {
        console.error("Connection error:", err);
        return callback({ status: false, message: "Connection error" }, null);
      }

      connection.query(
        insertSql,
        [branch_id, module, action, result, update, error],
        (err) => {
          connectionRelease(connection); // Release connection

          if (err) {
            console.error("Database insertion error:", err);
            return callback({ status: false, message: "Database error" }, null);
          }

          callback(null, {
            status: true,
            message: "Branch activity log entry added successfully",
          });
        }
      );
    });
  },

  isBranchAuthorizedForAction: (branch_id, action, callback) => {
    const sql = `
      SELECT \`permissions\`
      FROM \`branches\`
      WHERE \`id\` = ?
    `;

    startConnection((err, connection) => {
      if (err) {
        console.error("Connection error:", err);
        return callback({ status: false, message: "Connection error" }, null);
      }

      connection.query(sql, [branch_id], (err, results) => {
        connectionRelease(connection); // Release connection

        if (err) {
          console.error("Database query error: 118", err);
          return callback(
            { status: false, message: "Database query error" },
            null
          );
        }
        if (results.length === 0) {
          return callback({ status: false, message: "Branch not found" }, null);
        }

        const permissionsRaw = results[0].permissions;

        // Check if permissions field is empty or null
        if (!permissionsRaw) {
          console.error("Permissions field is empty");
          return callback({
            status: false,
            message: "Access Denied",
          });
        }

        let permissions;
        try {
          // Parse permissions JSON
          permissions = JSON.parse(permissionsRaw);
          if (typeof permissions !== "object" || permissions === null) {
            throw new Error("Parsed permissions are not an object");
          }
        } catch (parseError) {
          console.error("Error parsing permissions JSON:", parseError);
          return callback({
            status: false,
            message: "Access Denied",
          });
        }

        let actionObj;
        try {
          actionObj = typeof action === "string" ? JSON.parse(action) : action;
          if (
            typeof actionObj !== "object" ||
            actionObj === null ||
            Array.isArray(actionObj)
          ) {
            throw new Error("Action is not a valid object");
          }
        } catch (actionError) {
          console.error("Error parsing action JSON:", actionError);
          return callback({ status: false, message: "Access Denied" });
        }

        // Extract action type and action name from the action object
        const [actionType, actionName] = Object.entries(actionObj)[0] || [];

        // Check if action type and action name are valid
        if (!actionType || !actionName) {
          console.error("Invalid action format");
          return callback({ status: false, message: "Access Denied" });
        }

        // Check if the action type exists in the permissions object
        if (!permissions[actionType]) {
          console.error("Action type not found in permissions");
          return callback({
            status: false,
            message: "Access Denied",
          });
        }

        // Check if the action name is authorized
        const isAuthorized = permissions[actionType][actionName] === true;

        return callback({
          status: isAuthorized,
          message: isAuthorized ? "Authorization Successful" : "Access Denied",
        });
      });
    });
  },

  getBranchandCustomerEmailsForNotification: (branch_id, callback) => {
    if (typeof callback !== "function") {
      console.error("Callback is not a function");
      return;
    }

    // First query to get branch email and customer_id from the branches table
    const branchSql = `
      SELECT \`name\`, \`email\`, \`customer_id\`
      FROM \`branches\`
      WHERE \`id\` = ?
    `;

    startConnection((err, connection) => {
      if (err) {
        console.error("Connection error:", err);
        return callback({ status: false, message: "Connection error" }, null);
      }

      connection.query(branchSql, [branch_id], (err, branchResults) => {
        if (err) {
          connectionRelease(connection);
          console.error("Database query error: 119", err);
          return callback({ status: false, message: "Database error" }, null);
        }

        if (branchResults.length === 0) {
          connectionRelease(connection);
          return callback({ status: false, message: "Branch not found" }, null);
        }

        const branch = branchResults[0];
        const customerId = branch.customer_id;

        // Second query to get customer email from the customers table
        const customerSql = `
          SELECT \`emails\`, \`name\`
          FROM \`customers\`
          WHERE \`id\` = ?
        `;

        connection.query(customerSql, [customerId], (err, customerResults) => {
          connectionRelease(connection); // Release connection

          if (err) {
            console.error("Database query error:", err);
            return callback({ status: false, message: "Database error" }, null);
          }

          if (customerResults.length === 0) {
            return callback(
              { status: false, message: "Customer not found" },
              null
            );
          }

          const customer = customerResults[0];

          // Return both branch and customer emails
          callback(null, {
            status: true,
            message: "Emails retrieved successfully",
            branch,
            customer,
          });
        });
      });
    });
  },

  getCustomerNameByBranchID: (branch_id, callback) => {
    if (typeof callback !== "function") {
      console.error("Callback is not a function");
      return;
    }

    // First query to get customer_id from the branches table
    const branchSql = `
      SELECT \`customer_id\`
      FROM \`branches\`
      WHERE \`id\` = ?
    `;

    startConnection((err, connection) => {
      if (err) {
        console.error("Connection error:", err);
        return callback({ status: false, message: "Connection error" }, null);
      }

      connection.query(branchSql, [branch_id], (err, branchResults) => {
        if (err) {
          connectionRelease(connection);
          console.error("Database query error: 120", err);
          return callback({ status: false, message: "Database error" }, null);
        }

        if (branchResults.length === 0) {
          connectionRelease(connection);
          return callback({ status: false, message: "Branch not found" }, null);
        }

        const branch = branchResults[0];
        const customerId = branch.customer_id;

        // Second query to get customer name from the customers table
        const customerSql = `
          SELECT \`name\`
          FROM \`customers\`
          WHERE \`id\` = ?
        `;

        connection.query(customerSql, [customerId], (err, customerResults) => {
          connectionRelease(connection); // Release connection

          if (err) {
            console.error("Database query error: 121", err);
            return callback({ status: false, message: "Database error" }, null);
          }

          if (customerResults.length === 0) {
            return callback(
              { status: false, message: "Customer not found" },
              null
            );
          }

          const customer = customerResults[0];

          // Return the branch ID and customer name
          callback(null, {
            status: true,
            message: "Customer name retrieved successfully",
            customer_name: customer.name,
            branch_id: branch_id,
          });
        });
      });
    });
  },

  reportReadylist: (callback) => {
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
        br.name AS branch_name
      FROM client_applications AS ca
      JOIN customers AS cust ON cust.id = ca.customer_id
      JOIN branches AS br ON br.id = ca.branch_id
      LEFT JOIN customer_metas AS cm ON cm.customer_id = cust.id
      LEFT JOIN cmt_applications AS cmt ON ca.id = cmt.client_application_id
      WHERE cmt.report_date IS NOT NULL 
        AND TRIM(cmt.report_date) = '0000-00-00'
        AND TRIM(cmt.report_date) = '';
    `;

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

          // Process the results and send back to the callback
          if (applicationResults && applicationResults.length > 0) {
            const applications = applicationResults.map((application) => ({
              client_application_id: application.client_application_id,
              is_priority: application.is_priority,
              customer_id: application.customer_id,
              branch_id: application.branch_id,
              application_id: application.application_id,
              application_name: application.application_name,
              application_created_at: application.application_created_at,
              customer_name: application.customer_name,
              customer_unique_id: application.customer_unique_id,
              branch_name: application.branch_name,
              report_date: application.report_date,
            }));

            // Pass the processed results to the callback
            return callback(null, applications);
          } else {
            return callback(null, []); // No results found
          }
        }
      );
    });
  },
};

module.exports = common;
