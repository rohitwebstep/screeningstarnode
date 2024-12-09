const {
  pool,
  startConnection,
  connectionRelease,
} = require("../../../config/db");

function generateTicketNumber() {
  const prefix = "TCK";
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // Format: YYYYMMDD
  const uniqueId = String(Math.floor(Math.random() * 1000000)).padStart(6, "0"); // Random 6-digit number
  return `${prefix}-${date}-${uniqueId}`;
}

const Branch = {
  index: (branch_id, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      // Optimized query to fetch client applications by status
      const query = `
        SELECT 
            ca.id AS client_application_id, 
            ca.application_id,
            ca.employee_id, 
            ca.name,
            ca.status,
            ca.created_at,
            cmt.id AS cmt_id,
            cmt.*
        FROM 
            client_applications ca
        LEFT JOIN 
            cmt_applications cmt ON ca.id = cmt.client_application_id
        WHERE 
            ca.branch_id = ?
        ORDER BY 
            ca.created_at DESC
      `;

      // Fetch client applications with related CMT data
      connection.query(query, [branch_id], (err, results) => {
        if (err) {
          connectionRelease(connection);
          console.error("Error fetching client applications:", err);
          return callback(err, null);
        }

        // Group applications by their status and add CMT data
        const applicationsByStatus = results.reduce((grouped, app) => {
          if (!grouped[app.status]) {
            grouped[app.status] = {
              applicationCount: 0,
              applications: [],
            };
          }

          grouped[app.status].applications.push({
            client_application_id: app.client_application_id,
            application_name: app.name,
            application_id: app.application_id,
            created_at: app.created_at,
            cmtApplicationId: app.cmt_id,
            cmtOtherFields: app.other_fields, // Adjust based on actual field names from cmt
          });

          grouped[app.status].applicationCount += 1;

          return grouped;
        }, {});

        // Release connection and return results
        connectionRelease(connection);
        return callback(null, applicationsByStatus);
      });
    });
  },

  create: (ticketData, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      const ticketNumber = generateTicketNumber(); // Ensure this function generates a unique ticket number
      const sqlInsertTicket = `
        INSERT INTO \`tickets\` (
          \`branch_id\`, \`customer_id\`, \`ticket_number\`, \`title\`
        ) VALUES (?, ?, ?, ?)
      `;
      const ticketValues = [
        ticketData.branch_id,
        ticketData.customer_id,
        ticketNumber,
        ticketData.title,
      ];

      connection.query(sqlInsertTicket, ticketValues, (err, ticketResults) => {
        connectionRelease(connection); // Ensure the connection is properly released

        if (err) {
          console.error("Database insertion error for ticket:", err);
          return callback(
            {
              message: "Database insertion error for ticket",
              error: err,
            },
            null
          );
        }

        const ticketId = ticketResults.insertId;

        const sqlInsertTicketConversation = `
          INSERT INTO \`ticket_conversations\` (
            \`branch_id\`, \`customer_id\`, \`ticket_id\`, \`from\`, \`message\`
          ) VALUES (?, ?, ?, ?, ?)
        `;
        const ticketConversationValues = [
          ticketData.branch_id,
          ticketData.customer_id,
          ticketId,
          "branch",
          ticketData.message,
        ];

        connection.query(
          sqlInsertTicketConversation,
          ticketConversationValues,
          (err, conversationResults) => {
            connectionRelease(connection); // Ensure the connection is properly released

            if (err) {
              console.error(
                "Database insertion error for ticket conversation:",
                err
              );
              return callback(
                {
                  message: "Database insertion error for ticket conversation",
                  error: err,
                },
                null
              );
            }

            const conversationId = conversationResults.insertId;
            callback(null, { ticketNumber, ticketId });
          }
        );
      });
    });
  },
  list: (branch_id, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      const sql = `SELECT id, ticket_number, title, created_at FROM \`tickets\` WHERE \`branch_id\` = ? ORDER BY \`created_at\` DESC`;
      connection.query(sql, [branch_id], (err, results) => {
        // Ensure connection is released even if there's an error
        connectionRelease(connection);

        if (err) {
          console.error("Database query error: 84", err);
          return callback(
            { message: "Database query error", error: err },
            null
          );
        }

        callback(null, results);
      });
    });
  },

  update: (id, name, email, password, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      const sql = `
        UPDATE \`branches\`
        SET \`name\` = ?, \`email\` = ?, \`password\` = ?
        WHERE \`id\` = ?
      `;
      connection.query(sql, [name, email, password, id], (err, results) => {
        connectionRelease(connection); // Ensure connection is released

        if (err) {
          console.error("Database query error: 94", err);
          return callback(err, null);
        }
        callback(null, results);
      });
    });
  },

  delete: (id, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      // Check if the branch is a head branch (is_head = 1)
      const checkSql = `SELECT \`is_head\` FROM \`branches\` WHERE \`id\` = ?`;
      connection.query(checkSql, [id], (err, results) => {
        if (err) {
          connectionRelease(connection); // Ensure connection is released
          console.error("Database query error: Checking branch status", err);
          return callback(err, null);
        }

        if (results.length === 0) {
          connectionRelease(connection);
          return callback({ message: "Branch not found" }, null);
        }

        if (results[0].is_head === 1) {
          connectionRelease(connection); // Ensure connection is released
          return callback({ message: "Can't delete head branch" }, null);
        }

        // Proceed with deletion if not a head branch
        const deleteSql = `DELETE FROM \`branches\` WHERE \`id\` = ?`;
        connection.query(deleteSql, [id], (err, deleteResults) => {
          connectionRelease(connection); // Ensure connection is released

          if (err) {
            console.error("Database query error: Deleting branch", err);
            return callback(err, null);
          }

          callback(null, deleteResults);
        });
      });
    });
  },
};

module.exports = Branch;
