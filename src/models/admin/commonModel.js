const crypto = require("crypto");
const pool = require("../../config/db");

// Generates a new random token
const generateToken = () => crypto.randomBytes(32).toString("hex");

// Returns the expiry time for the token (1 hour from now)
const getTokenExpiry = () => new Date(Date.now() + 3600000).toISOString();

const common = {
  /**
   * Validates the admin's token and refreshes it if expired.
   * @param {string} _token - Provided token
   * @param {number} admin_id - Admin ID
   * @returns {Promise<{status: boolean, message: string, newToken?: string}>}
   */
  isAdminTokenValid: async (_token, admin_id) => {
    try {
      const sql = `
        SELECT \`login_token\`, \`token_expiry\`
        FROM \`admins\`
        WHERE \`id\` = ?
      `;
      const [results] = await pool.query(sql, [admin_id]);

      if (results.length === 0) {
        return { status: false, message: "Admin not found" };
      }

      const currentToken = results[0].login_token;
      const tokenExpiry = new Date(results[0].token_expiry);
      const currentTime = new Date();

      if (_token !== currentToken) {
        return { status: false, message: "Invalid token provided" };
      }

      if (tokenExpiry > currentTime) {
        return { status: true, message: "Token is valid" };
      } else {
        const newToken = generateToken();
        const newTokenExpiry = getTokenExpiry();

        const updateSql = `
          UPDATE \`admins\`
          SET \`login_token\` = ?, \`token_expiry\` = ?
          WHERE \`id\` = ?
        `;

        await pool.query(updateSql, [newToken, newTokenExpiry, admin_id]);

        return {
          status: true,
          message: "Token was expired and has been refreshed",
          newToken,
        };
      }
    } catch (err) {
      console.error("Error checking or updating token validity:", err);
      return { status: false, message: "Database error: " + err.message };
    }
  },

  /**
   * Logs admin login activities.
   * @param {number} admin_id - Admin ID
   * @param {string} action - Action performed
   * @param {string} result - Result of the action
   * @param {string} error - Error message if any
   * @returns {Promise<{status: boolean, message: string}>}
   */
  adminLoginLog: async (admin_id, action, result, error) => {
    try {
      const insertSql = `
        INSERT INTO \`admin_login_logs\` (\`admin_id\`, \`action\`, \`result\`, \`error\`, \`created_at\`)
        VALUES (?, ?, ?, ?, NOW())
      `;

      await pool.query(insertSql, [admin_id, action, result, error]);

      return {
        status: true,
        message: "Admin login log entry added successfully",
      };
    } catch (err) {
      console.error("Database insertion error:", err);
      return { status: false, message: "Database error: " + err.message };
    }
  },

  /**
   * Logs other admin activities.
   * @param {number} admin_id - Admin ID
   * @param {string} module - Module name
   * @param {string} action - Action performed
   * @param {string} result - Result of the action
   * @param {string} update - Update description
   * @param {string} error - Error message if any
   * @returns {Promise<{status: boolean, message: string}>}
   */
  adminActivityLog: async (admin_id, module, action, result, update, error) => {
    try {
      const insertSql = `
        INSERT INTO \`admin_activity_logs\` (\`admin_id\`, \`module\`, \`action\`, \`result\`, \`update\`, \`error\`, \`created_at\`)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `;
      await pool.query(insertSql, [
        admin_id,
        module,
        action,
        result,
        update,
        error,
      ]);

      return {
        status: true,
        message: "Admin activity log entry added successfully",
      };
    } catch (err) {
      console.error("Database insertion error:", err);
      return { status: false, message: "Database error: " + err.message };
    }
  },

  /**
   * Checks if the admin is authorized for a specific action.
   * @param {number} admin_id - Admin ID
   * @param {string} action - Action to check authorization for
   * @returns {Promise<boolean>}
   */
  isAdminAuthorizedForAction: async (admin_id, action) => {
    try {
      const sql = `
        SELECT \`permissions\`
        FROM \`admins\`
        WHERE \`id\` = ?
      `;
      const [results] = await pool.query(sql, [admin_id]);

      if (results.length === 0) {
        throw new Error("Admin not found");
      }

      const permissions = JSON.parse(results[0].permissions); // Parse permissions JSON
      const actionObj = JSON.parse(action); // Parse action JSON

      // Extract the action type and action name from the action object
      const [actionType, actionName] = Object.entries(actionObj)[0] || [];

      if (!actionType || !actionName) {
        return false; // Invalid action format
      }

      // Check if the action type exists and if the action name is true
      return (
        permissions[actionType] && permissions[actionType][actionName] === true
      );
    } catch (err) {
      console.error("Database query error:", err);
      return false;
    }
  },
};

module.exports = common;
