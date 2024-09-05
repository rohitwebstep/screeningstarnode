const crypto = require("crypto");
const pool = require("../../../config/db");

// Generates a new random token
const generateToken = () => crypto.randomBytes(32).toString("hex");

// Returns the expiry time for the token (1 hour from now)
const getTokenExpiry = () => new Date(Date.now() + 3600000).toISOString();

const common = {
  /**
   * Validates the branch's token and refreshes it if expired.
   * @param {string} _token - Provided token
   * @param {number} branch_id - Branch ID
   * @param {function} callback - Callback function
   */
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

    pool.query(sql, [branch_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ status: false, message: "Database error" }, null);
      }

      if (results.length === 0) {
        return callback({ status: false, message: "Branch not found" }, null);
      }

      const currentToken = results[0].login_token;
      const tokenExpiry = new Date(results[0].token_expiry);
      const currentTime = new Date();

      if (_token !== currentToken) {
        return callback(
          { status: false, message: "Invalid token provided" },
          null
        );
      }

      if (tokenExpiry > currentTime) {
        callback(null, { status: true, message: "Token is valid" });
      } else {
        const newToken = generateToken();
        const newTokenExpiry = getTokenExpiry();

        const updateSql = `
          UPDATE \`branches\`
          SET \`login_token\` = ?, \`token_expiry\` = ?
          WHERE \`id\` = ?
        `;

        pool.query(
          updateSql,
          [newToken, newTokenExpiry, branch_id],
          (updateErr) => {
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
  },

  /**
   * Logs branch login activities.
   * @param {number} branch_id - Branch ID
   * @param {string} action - Action performed
   * @param {string} result - Result of the action
   * @param {string} error - Error message if any
   * @param {function} callback - Callback function
   */
  branchLoginLog: (branch_id, action, result, error, callback) => {
    if (typeof callback !== "function") {
      console.error("Callback is not a function");
      return;
    }

    const insertSql = `
      INSERT INTO \`branch_login_logs\` (\`branch_id\`, \`action\`, \`result\`, \`error\`, \`created_at\`)
      VALUES (?, ?, ?, ?, NOW())
    `;

    pool.query(insertSql, [branch_id, action, result, error], (err) => {
      if (err) {
        console.error("Database insertion error:", err);
        return callback({ status: false, message: "Database error" }, null);
      }

      callback(null, {
        status: true,
        message: "Branch login log entry added successfully",
      });
    });
  },

  /**
   * Logs other branch activities.
   * @param {number} branch_id - Branch ID
   * @param {string} module - Module name
   * @param {string} action - Action performed
   * @param {string} result - Result of the action
   * @param {string} update - Update description
   * @param {string} error - Error message if any
   * @param {function} callback - Callback function
   */
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
    pool.query(
      insertSql,
      [branch_id, module, action, result, update, error],
      (err) => {
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
  },

  isBranchAuthorizedForAction: (branch_id, action, callback) => {
    const sql = `
      SELECT \`permissions\`
      FROM \`branches\`
      WHERE \`id\` = ?
    `;

    pool.query(sql, [branch_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ status: false, message: "Database query error" });
      }
      if (results.length === 0) {
        return callback({ status: false, message: "Branch not found" });
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
  },

  /**
   * Retrieves the branch and customer emails for notification purposes.
   * @param {number} branch_id - The ID of the branch.
   * @param {function} callback - Callback function.
   */
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

    pool.query(branchSql, [branch_id], (err, branchResults) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ status: false, message: "Database error" }, null);
      }

      if (branchResults.length === 0) {
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

      pool.query(customerSql, [customerId], (err, customerResults) => {
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
  },
};

module.exports = common;
