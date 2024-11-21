const { pool, startConnection, connectionRelease } = require("../../config/db");

const Service = {
  create: (
    title,
    description,
    group_id,
    short_code,
    sac_code,
    admin_id,
    callback
  ) => {
    // Step 1: Check if a service with the same title already exists
    const checkServiceSql = `
      SELECT * FROM \`services\` WHERE \`title\` = ?
    `;

    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(checkServiceSql, [title], (checkErr, serviceResults) => {
        if (checkErr) {
          console.error("Error checking service:", checkErr);
          connectionRelease(connection); // Release connection on error
          return callback(checkErr, null);
        }

        // Step 2: If a service with the same title exists, return an error
        if (serviceResults.length > 0) {
          const error = new Error("Service with the same name already exists");
          console.error(error.message);
          connectionRelease(connection); // Release connection before returning error
          return callback(error, null);
        }

        // Step 3: Insert the new service
        const insertServiceSql = `
          INSERT INTO \`services\` (\`title\`, \`description\`, \`group_id\`, \`short_code\`,  \`sac_code\`, \`admin_id\`)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        connection.query(
          insertServiceSql,
          [title, description, group_id, short_code, sac_code, admin_id],
          (insertErr, results) => {
            connectionRelease(connection); // Release the connection

            if (insertErr) {
              console.error("Database query error: 46", insertErr);
              return callback(insertErr, null);
            }
            callback(null, results);
          }
        );
      });
    });
  },

  list: (callback) => {
    const sql = `
      SELECT 
        s.*, 
        sg.title AS group_name 
      FROM \`services\` s
      JOIN \`service_groups\` sg ON s.group_id = sg.id
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

        callback(null, results);
      });
    });
  },

  digitlAddressService: (callback) => {
    const sql = `
      SELECT * FROM \`services\`
      WHERE LOWER(\`title\`) LIKE '%digital%'
      AND (LOWER(\`title\`) LIKE '%verification%' OR LOWER(\`title\`) LIKE '%address%')
      LIMIT 1
    `;

    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(sql, (queryErr, results) => {
        connectionRelease(connection); // Release the connection

        if (queryErr) {
          console.error("Database query error: 48", queryErr);
          return callback(queryErr, null);
        }

        // Check if results are found and return the first entry or null if not found
        const singleEntry = results.length > 0 ? results[0] : null;
        callback(null, singleEntry); // Return single entry or null if not found
      });
    });
  },

  getServiceById: (id, callback) => {
    const sql = `SELECT * FROM \`services\` WHERE \`id\` = ?`;

    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(sql, [id], (queryErr, results) => {
        connectionRelease(connection); // Release the connection

        if (queryErr) {
          console.error("Database query error: 49", queryErr);
          return callback(queryErr, null);
        }
        callback(null, results[0]);
      });
    });
  },

  getServiceRequiredDocumentsByServiceId: (service_id, callback) => {
    const sql = `SELECT * FROM \`service_required_documents\` WHERE \`service_id\` = ?`;

    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(sql, [service_id], (queryErr, results) => {
        connectionRelease(connection); // Release the connection

        if (queryErr) {
          console.error("Database query error: 50", queryErr);
          return callback(queryErr, null);
        }
        callback(null, results[0]);
      });
    });
  },

  update: (
    id,
    title,
    description,
    group_id,
    short_code,
    sac_code,
    callback
  ) => {
    const sql = `
      UPDATE \`services\`
      SET \`title\` = ?, \`description\` = ?, \`group_id\` = ?, \`short_code\` = ?, \`sac_code\` = ?
      WHERE \`id\` = ?
    `;

    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(
        sql,
        [title, description, group_id, short_code, sac_code, id],
        (queryErr, results) => {
          connectionRelease(connection); // Release the connection

          if (queryErr) {
            console.error(" 51", queryErr);
            return callback(queryErr, null);
          }
          callback(null, results);
        }
      );
    });
  },

  delete: (id, callback) => {
    const sql = `
      DELETE FROM \`services\`
      WHERE \`id\` = ?
    `;

    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(sql, [id], (queryErr, results) => {
        connectionRelease(connection); // Release the connection

        if (queryErr) {
          console.error("Database query error: 51", queryErr);
          return callback(queryErr, null);
        }
        callback(null, results);
      });
    });
  },

  servicesPackagesData: (callback) => {
    const sql = `
      SELECT 
        sg.id AS group_id, 
        sg.symbol, 
        sg.title AS group_title, 
        s.id AS service_id, 
        s.title AS service_title
      FROM 
        service_groups sg
      LEFT JOIN 
        services s ON s.group_id = sg.id
      ORDER BY 
        sg.id, s.id
    `;

    startConnection((err, connection) => {
      if (err) {
        console.error("Database connection error:", err);
        return callback(
          {
            status: false,
            message: "Failed to connect to the database",
            error: err,
          },
          null
        );
      }

      connection.query(sql, (err, results) => {
        connectionRelease(connection);
        if (err) {
          console.error("Database query error:", err);
          return callback(
            {
              status: false,
              message: "Failed to fetch service packages",
              error: err,
            },
            null
          );
        }

        // Processing the results into a structured format
        const groupedData = [];
        const groupMap = new Map();

        results.forEach((row) => {
          const { group_id, symbol, group_title, service_id, service_title } =
            row;

          // Retrieve the group from the map, or initialize a new entry
          let group = groupMap.get(group_id);
          if (!group) {
            group = {
              group_id,
              symbol,
              group_title,
              services: [],
            };
            groupMap.set(group_id, group);
            groupedData.push(group);
          }

          // Add service details if the service exists
          if (service_id) {
            group.services.push({
              service_id,
              service_title,
            });
          }
        });

        callback(null, groupedData);
      });
    });
  },
};

module.exports = Service;
