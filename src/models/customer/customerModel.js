const crypto = require("crypto");
const { pool, startConnection, connectionRelease } = require("../../config/db");

// Function to hash the password using MD5
const hashPassword = (password) =>
  crypto.createHash("md5").update(password).digest("hex");

const Customer = {
  checkUniqueId: (clientUniqueId, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      const sql = `
        SELECT COUNT(*) AS count
        FROM \`customers\`
        WHERE \`client_unique_id\` = ?
      `;
      connection.query(sql, [clientUniqueId], (err, results) => {
        connectionRelease(connection); // Ensure connection is released

        if (err) {
          console.error("Database query error: 53", err);
          return callback(
            { message: "Database query error", error: err },
            null
          );
        }

        const count = results[0].count;
        callback(null, count > 0);
      });
    });
  },

  checkUniqueIdForUpdate: (customer_id, clientUniqueId, callback) => {
    startConnection((err, connection) => {
      if (err) {
        console.error("Failed to connect to the database:", err);
        return callback(
          { status: false, message: "Database connection error" },
          null
        );
      }
      const sql = `
        SELECT COUNT(*) AS count
        FROM \`customers\`
        WHERE \`client_unique_id\` = ? AND \`id\` != ?
      `;
      connection.query(sql, [clientUniqueId, customer_id], (err, results) => {
        connectionRelease(connection); // Ensure connection is released

        if (err) {
          console.error("Database query error: 54", err);
          return callback(
            { message: "Database query error", error: err },
            null
          );
        }

        const count = results[0].count;
        callback(null, count > 0);
      });
    });
  },

  checkUsername: (username, callback) => {
    startConnection((err, connection) => {
      if (err) {
        console.error("Failed to connect to the database:", err);
        return callback(
          { status: false, message: "Database connection error" },
          null
        );
      }
      const sql = `
        SELECT COUNT(*) AS count
        FROM \`customers\`
        WHERE \`username\` = ?
      `;
      connection.query(sql, [username], (err, results) => {
        connectionRelease(connection); // Ensure connection is released

        if (err) {
          console.error("Database query error: 55", err);
          return callback(
            { message: "Database query error", error: err },
            null
          );
        }

        const count = results[0].count;
        callback(null, count > 0);
      });
    });
  },

  checkUsernameForUpdate: (customer_id, username, callback) => {
    startConnection((err, connection) => {
      if (err) {
        console.error("Failed to connect to the database:", err);
        return callback(
          { status: false, message: "Database connection error" },
          null
        );
      }
      const sql = `
        SELECT COUNT(*) AS count
        FROM \`customers\`
        WHERE \`username\` = ? AND \`id\` != ?
      `;
      connection.query(sql, [username, customer_id], (err, results) => {
        connectionRelease(connection); // Ensure connection is released

        if (err) {
          console.error("Database query error: 56", err);
          return callback(
            { message: "Database query error", error: err },
            null
          );
        }

        const count = results[0].count;
        callback(null, count > 0);
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

  create: (customerData, callback) => {
    startConnection((err, connection) => {
      if (err) {
        console.error("Failed to connect to the database:", err);
        return callback(
          { status: false, message: "Database connection error" },
          null
        );
      }
      const sqlCustomers = `
        INSERT INTO \`customers\` (\`client_unique_id\`, \`name\`, \`additional_login\`, \`username\`, \`profile_picture\`, \`emails\`, \`mobile\`, \`role\`, \`services\`, \`admin_id\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const valuesCustomers = [
        customerData.client_unique_id,
        customerData.name,
        customerData.additional_login,
        customerData.username,
        customerData.profile_picture,
        customerData.emails_json,
        customerData.mobile_number,
        customerData.role,
        customerData.services,
        customerData.admin_id,
      ];

      connection.query(sqlCustomers, valuesCustomers, (err, results) => {
        connectionRelease(connection); // Ensure connection is released

        if (err) {
          console.error("Database insertion error for customers:", err);
          return callback({ message: err }, null);
        }

        const customerId = results.insertId;
        callback(null, { insertId: customerId });
      });
    });
  },

  documentUpload: (customer_id, db_column, savedImagePaths, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      const sqlUpdateCustomer = `
        UPDATE customer_metas 
        SET ${db_column} = ?
        WHERE id = ?
      `;

      connection.query(
        sqlUpdateCustomer,
        [savedImagePaths, customer_id],
        (err, results) => {
          connectionRelease(connection); // Ensure connection is released

          if (err) {
            console.error("Error updating customer meta:", err);
            return callback(
              { message: "Database update failed.", error: err },
              null
            );
          }

          return callback(null, results);
        }
      );
    });
  },

  update: (customerId, customerData, callback) => {
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      const sqlUpdateCustomer = `
        UPDATE \`customers\` 
        SET 
          \`name\` = ?, 
          \`additional_login\` = ?, 
          \`username\` = ?, 
          \`profile_picture\` = ?, 
          \`emails\` = ?, 
          \`mobile\` = ?, 
          \`role\` = ?, 
          \`services\` = ?, 
          \`admin_id\` = ?
        WHERE \`id\` = ?
      `;

      const valuesUpdateCustomer = [
        customerData.name,
        customerData.additional_login,
        customerData.username,
        customerData.profile_picture,
        customerData.emails_json,
        customerData.mobile,
        customerData.role,
        JSON.stringify(customerData.services),
        customerData.admin_id,
        customerId,
      ];

      connection.query(
        sqlUpdateCustomer,
        valuesUpdateCustomer,
        (err, results) => {
          connectionRelease(connection); // Ensure connection is released

          if (err) {
            console.error("Database update error for customers:", err);
            return callback({ message: err }, null);
          }

          callback(null, results);
        }
      );
    });
  },

  createCustomerMeta: (metaData, callback) => {
    const sqlCustomerMetas = `
      INSERT INTO \`customer_metas\` (
        \`customer_id\`, \`address\`,
        \`client_spoc_id\`, \`escalation_manager_id\`,
        \`billing_spoc_id\`, \`billing_escalation_id\`,
        \`gst_number\`, \`tat_days\`, 
        \`agreement_date\`, \`agreement_duration\`,
        \`state\`, \`state_code\`, 
        \`client_standard\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
  },

  createCustomerMeta: (metaData, callback) => {
    const sqlCustomerMetas = `
      INSERT INTO \`customer_metas\` (
        \`customer_id\`, \`address\`,
        \`client_spoc_id\`, \`escalation_manager_id\`,
        \`billing_spoc_id\`, \`billing_escalation_id\`, \`authorized_detail_id\`,
        \`gst_number\`, \`tat_days\`, 
        \`agreement_date\`, \`agreement_duration\`,
        \`state\`, \`state_code\`, 
        \`client_standard\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const valuesCustomerMetas = [
      metaData.customer_id,
      metaData.address,
      metaData.client_spoc_id,
      metaData.escalation_manager_id,
      metaData.billing_spoc_id,
      metaData.billing_escalation_id,
      metaData.authorized_detail_id,
      metaData.gst_number,
      metaData.tat_days,
      metaData.agreement_date,
      metaData.agreement_duration,
      metaData.state,
      metaData.state_code,
      metaData.client_standard,
    ];

    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      connection.query(
        sqlCustomerMetas,
        valuesCustomerMetas,
        (err, results) => {
          connectionRelease(connection);
          if (err) {
            console.error("Database insertion error for customer_metas:", err);
            return callback(
              {
                message: "Database insertion error for customer_metas",
                error: err,
              },
              null
            );
          }

          callback(null, results);
        }
      );
    });
  },

  updateCustomerMetaByCustomerId: (customerId, metaData, callback) => {
    const sqlUpdateCustomerMetas = `
      UPDATE \`customer_metas\` 
      SET 
        \`address\` = ?, 
        \`client_spoc_id\` = ?,
        \`escalation_manager_id\` = ?,
        \`billing_spoc_id\` = ?,
        \`billing_escalation_id\` = ?,
        \`authorized_detail_id\` = ?,
        \`gst_number\` = ?, 
        \`tat_days\` = ?, 
        \`agreement_date\` = ?, 
        \`agreement_duration\` = ?,
        \`state\` = ?, 
        \`state_code\` = ?, 
        \`client_standard\` = ?
      WHERE \`customer_id\` = ?
    `;

    const valuesUpdateCustomerMetas = [
      metaData.address,
      metaData.client_spoc_id,
      metaData.escalation_manager_id,
      metaData.billing_spoc_id,
      metaData.billing_escalation_id,
      metaData.authorized_detail_id,
      metaData.gst_number,
      metaData.tat_days,
      metaData.agreement_date,
      metaData.agreement_duration,
      metaData.state,
      metaData.state_code,
      metaData.client_standard,
      customerId,
    ];

    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      connection.query(
        sqlUpdateCustomerMetas,
        valuesUpdateCustomerMetas,
        (err, results) => {
          connectionRelease(connection);
          if (err) {
            console.error("Database update error for customer_metas:", err);
            return callback(
              {
                message: "Database update error for customer_metas",
                error: err,
              },
              null
            );
          }

          callback(null, results);
        }
      );
    });
  },

  list: (callback) => {
    const sql = `
      SELECT 
        customers.*, 
        customers.id AS main_id, 
        customer_metas.*, 
        customer_metas.id AS meta_id,
        COALESCE(branch_counts.branch_count, 0) AS branch_count
      FROM 
        customers
      LEFT JOIN 
        customer_metas 
      ON 
        customers.id = customer_metas.customer_id
      LEFT JOIN 
        (
          SELECT 
            customer_id, 
            COUNT(*) AS branch_count
          FROM 
            branches
          GROUP BY 
            customer_id
        ) AS branch_counts
      ON 
        customers.id = branch_counts.customer_id
      WHERE 
        customers.status != '0'
    `;

    startConnection((err, connection) => {
      if (err) {
        console.error("Connection error:", err);
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      connection.query(sql, (err, results) => {
        connectionRelease(connection);

        if (err) {
          console.error("Database query error: 57", err);
          return callback(err, null);
        }

        // Array to accumulate the updated customer data
        const updatedCustomers = [];

        const updateAllServiceTitles = async () => {
          for (const customerData of results) {
            let servicesData;
            try {
              servicesData = JSON.parse(customerData.services);
            } catch (parseError) {
              console.error(
                "Error parsing services data for customer ID:",
                customerData.main_id,
                parseError
              );
              return callback(parseError, null);
            }

            try {
              for (const group of servicesData) {
                if (Array.isArray(group.services)) {
                  // Ensure 'group.services' is an array
                  for (const service of group.services) {
                    const serviceSql = `SELECT title FROM services WHERE id = ?`;
                    const [rows] = await new Promise((resolve, reject) => {
                      connection.query(
                        serviceSql,
                        [service.serviceId],
                        (err, results) => {
                          if (err) {
                            console.error(
                              "Error querying service title for service ID:",
                              service.serviceId,
                              err
                            );
                            return reject(err);
                          }
                          resolve(results);
                        }
                      );
                    });

                    if (rows && rows.length > 0 && rows[0].title) {
                      service.serviceTitle = rows[0].title;
                    }
                  }
                } else {
                  console.warn(
                    "group.services is not an array:",
                    group.services
                  );
                }
              }
            } catch (err) {
              console.error(
                "Error updating service titles for customer ID:",
                customerData.main_id,
                err
              );
              return callback(err, null);
            }

            customerData.services = JSON.stringify(servicesData);
            // Add the updated customer data to the array
            updatedCustomers.push(customerData);
          }
          callback(null, updatedCustomers);
        };
        updateAllServiceTitles();
      });
    });
  },

  listWithBasicInfo: (callback) => {
    const sql = `
      SELECT
        id, 
        name,
        client_unique_id
      FROM 
        customers
      WHERE 
        customers.status != '0'
    `;

    startConnection((err, connection) => {
      if (err) {
        console.error("Connection error:", err);
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      connection.query(sql, (err, results) => {
        connectionRelease(connection);

        if (err) {
          console.error("Database query error: 57", err);
          return callback(err, null);
        }

        // Processing results and invoking callback
        callback(null, results);
      });
    });
  },

  inactiveList: (callback) => {
    const sql = `
      SELECT 
        customers.*, 
        customers.id AS main_id, 
        customer_metas.*, 
        customer_metas.id AS meta_id,
        COALESCE(branch_counts.branch_count, 0) AS branch_count
      FROM 
        customers
      LEFT JOIN 
        customer_metas 
      ON 
        customers.id = customer_metas.customer_id
      LEFT JOIN 
        (
          SELECT 
            customer_id, 
            COUNT(*) AS branch_count
          FROM 
            branches
          GROUP BY 
            customer_id
        ) AS branch_counts
      ON 
        customers.id = branch_counts.customer_id
      WHERE 
        customers.status != '1'
    `;

    startConnection((err, connection) => {
      if (err) {
        console.error("Connection error:", err);
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      connection.query(sql, (err, results) => {
        connectionRelease(connection);

        if (err) {
          console.error("Database query error: 57", err);
          return callback(err, null);
        }

        // Array to accumulate the updated customer data
        const updatedCustomers = [];

        const updateAllServiceTitles = async () => {
          for (const customerData of results) {
            let servicesData;
            try {
              servicesData = JSON.parse(customerData.services);
            } catch (parseError) {
              console.error(
                "Error parsing services data for customer ID:",
                customerData.main_id,
                parseError
              );
              return callback(parseError, null);
            }

            try {
              // Update service titles for each group of services
              for (const group of servicesData) {
                for (const service of group.services) {
                  const serviceSql = `SELECT title FROM services WHERE id = ?`;
                  const [rows] = await new Promise((resolve, reject) => {
                    connection.query(
                      serviceSql,
                      [service.serviceId],
                      (err, results) => {
                        if (err) {
                          console.error(
                            "Error querying service title for service ID:",
                            service.serviceId,
                            err
                          );
                          return reject(err);
                        }
                        resolve(results);
                      }
                    );
                  });

                  if (rows && rows.length > 0 && rows[0].title) {
                    service.serviceTitle = rows[0].title;
                  }
                }
              }
            } catch (err) {
              console.error(
                "Error updating service titles for customer ID:",
                customerData.main_id,
                err
              );
              return callback(err, null);
            }

            customerData.services = JSON.stringify(servicesData);
            // Add the updated customer data to the array
            updatedCustomers.push(customerData);
          }
          callback(null, updatedCustomers);
        };
        updateAllServiceTitles();
      });
    });
  },

  getFirstSpoc: (customer_id, callback) => {
    const sql = `SELECT client_spoc_id FROM customer_metas WHERE customer_id = ?`;

    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }

      connection.query(sql, [customer_id], (err, results) => {
        connectionRelease(connection); // Ensure connection is released after query execution

        if (err) {
          console.error("Database query error: ", err);
          return callback(
            { message: "Database query error", error: err },
            null
          );
        }

        // If no results are found, return a meaningful message
        if (results.length === 0 || !results[0].client_spoc_id) {
          return callback({ message: "No SPoC found for this customer" }, null);
        }

        // Convert client_spoc_id to string and then split by commas
        const clientSpocIdString = String(results[0].client_spoc_id); // Ensure it is a string
        const spocIds = clientSpocIdString.split(","); // Split by comma
        const firstSpocId = spocIds[0].trim(); // Trim any extra spaces

        callback(null, firstSpocId); // Return the first SPoC ID
      });
    });
  },

  basicInfoByID: async (customer_id, callback) => {
    const sql = `
      SELECT 
        customers.client_unique_id,
        customers.name, 
        customers.profile_picture, 
        customers.emails, 
        customers.mobile, 
        customers.services, 
        customer_metas.client_spoc_id,
        customers.id, 
        customer_metas.address,
        customer_metas.gst_number,
        customer_metas.id AS meta_id
      FROM 
        customers
      LEFT JOIN 
        customer_metas 
      ON 
        customers.id = customer_metas.customer_id
      WHERE 
        customers.id = ?
    `;

    try {
      const connection = await new Promise((resolve, reject) => {
        startConnection((err, conn) => {
          if (err) reject(err);
          resolve(conn);
        });
      });

      const results = await new Promise((resolve, reject) => {
        connection.query(sql, [customer_id], (err, results) => {
          if (err) reject(err);
          resolve(results);
        });
      });

      if (results.length === 0) {
        connectionRelease(connection);
        return callback(null, { message: "No customer data found" });
      }

      const customerData = results[0];
      const spocIdString = customerData.client_spoc_id;
      if (spocIdString) {
        const spocIds = spocIdString
          .toString()
          .split(",")
          .map((id) => id.trim());

        const spocQuery = `
          SELECT id, name 
          FROM client_spocs
          WHERE id IN (${spocIds.map(() => "?").join(",")});
        `;

        try {
          const spocDetails = await new Promise((resolve, reject) => {
            connection.query(spocQuery, spocIds, (spocErr, spocResults) => {
              if (spocErr) return reject(spocErr);
              resolve(spocResults); // Include the entire result (id and name)
            });
          });
          customerData.client_spoc_details = spocDetails; // Assign id and name to the customer data
        } catch (spocErr) {
          console.error("Error fetching client_spoc details:", spocErr);
          customerData.client_spoc_details = null;
        }
      } else {
        customerData.client_spoc_details = null;
      }

      let servicesData;
      try {
        servicesData = JSON.parse(customerData.services);
      } catch (parseError) {
        connectionRelease(connection);
        return callback(parseError, null);
      }

      const updateServiceTitles = async () => {
        try {
          for (const group of servicesData) {
            for (const service of group.services) {
              const serviceSql = `SELECT title FROM services WHERE id = ?`;
              const [rows] = await new Promise((resolve, reject) => {
                connection.query(
                  serviceSql,
                  [service.serviceId],
                  (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                  }
                );
              });

              if (rows && rows.title) {
                service.serviceTitle = rows.title;
              }
            }
          }
        } catch (err) {
          console.error("Error updating service titles:", err);
        } finally {
          connectionRelease(connection);
          customerData.services = JSON.stringify(servicesData);
          callback(null, customerData);
        }
      };

      await updateServiceTitles();
    } catch (err) {
      console.error("Error:", err);
      callback(err, null);
    }
  },

  getCustomerById: (id, callback) => {
    const sql = "SELECT * FROM `customers` WHERE `id` = ?";
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      connection.query(sql, [id], (err, results) => {
        connectionRelease(connection);
        if (err) {
          console.error("Database query error: 60", err);
          return callback(err, null);
        }
        if (results.length === 0) {
          connectionRelease(connection);
          return callback(null, { message: "No customer data found" });
        }

        const customerData = results[0];

        let servicesData;
        try {
          servicesData = JSON.parse(customerData.services);
        } catch (parseError) {
          connectionRelease(connection);
          return callback(parseError, null);
        }

        const updateServiceTitles = async () => {
          try {
            for (const group of servicesData) {
              for (const service of group.services) {
                const serviceSql = `SELECT title FROM services WHERE id = ?`;
                const [rows] = await new Promise((resolve, reject) => {
                  connection.query(
                    serviceSql,
                    [service.serviceId],
                    (err, results) => {
                      if (err) {
                        console.error("Error querying service title:", err);
                        return reject(err);
                      }
                      resolve(results);
                    }
                  );
                });

                if (rows && rows.title) {
                  service.serviceTitle = rows.title;
                }
              }
            }
          } catch (err) {
            console.error("Error updating service titles:", err);
          } finally {
            connectionRelease(connection);
            customerData.services = JSON.stringify(servicesData);
            callback(null, customerData);
          }
        };

        updateServiceTitles();
      });
    });
  },

  getActiveCustomerById: (id, callback) => {
    const sql = "SELECT * FROM `customers` WHERE `id` = ? AND `status` = ?";
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      connection.query(sql, [id, "1"], (err, results) => {
        connectionRelease(connection);
        if (err) {
          console.error("Database query error: 61", err);
          return callback(err, null);
        }
        callback(null, results[0]);
      });
    });
  },

  getAllBranchesByCustomerId: (customerId, callback) => {
    const sql = "SELECT * FROM `branches` WHERE `customer_id` = ?";
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      connection.query(sql, [customerId], (err, results) => {
        connectionRelease(connection);
        if (err) {
          console.error("Database query error: 62", err);
          return callback(err, null);
        }
        callback(null, results); // Returns all matching entries
      });
    });
  },

  getClientUniqueIDByCustomerId: (id, callback) => {
    const sql = "SELECT `client_unique_id` FROM `customers` WHERE `id` = ?";
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      connection.query(sql, [id], (err, results) => {
        connectionRelease(connection);
        if (err) {
          console.error("Database query error: 63", err);
          return callback(err, null);
        }

        // Check if the result exists and `client_unique_id` is not null or empty
        if (results.length > 0 && results[0].client_unique_id) {
          return callback(null, results[0].client_unique_id);
        } else {
          return callback(null, false); // Return false if not found or invalid
        }
      });
    });
  },

  getCustomerMetaById: (id, callback) => {
    const sql = "SELECT * FROM `customer_metas` WHERE `customer_id` = ?";
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      connection.query(sql, [id], (err, results) => {
        connectionRelease(connection);
        if (err) {
          console.error("Database query error: 64", err);
          return callback(err, null);
        }
        callback(null, results[0]);
      });
    });
  },

  active: (id, callback) => {
    const sql = `
      UPDATE \`customers\`
      SET \`status\` = ?
      WHERE \`id\` = ?
    `;
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      connection.query(sql, ["1", id], (err, results) => {
        connectionRelease(connection);
        if (err) {
          console.error("Database query error: 65", err);
          return callback(err, null);
        }
        callback(null, results);
      });
    });
  },

  inactive: (id, callback) => {
    const sql = `
      UPDATE \`customers\`
      SET \`status\` = ?
      WHERE \`id\` = ?
    `;
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      connection.query(sql, ["0", id], (err, results) => {
        connectionRelease(connection);
        if (err) {
          console.error("Database query error: 66", err);
          return callback(err, null);
        }
        callback(null, results);
      });
    });
  },

  delete: (id, callback) => {
    const sql = `
        DELETE FROM \`customers\`
        WHERE \`id\` = ?
      `;
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      connection.query(sql, [id], (err, results) => {
        connectionRelease(connection);
        if (err) {
          console.error("Database query error: 67", err);
          return callback(err, null);
        }
        callback(null, results);
      });
    });
  },

  findByEmailOrMobile: (username, callback) => {
    const sql = `
      SELECT \`id\`, \`email\`, \`mobile\`, \`password\`
      FROM \`customers\`
      WHERE \`email\` = ? OR \`mobile\` = ?
    `;
    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      connection.query(sql, [username, username], (err, results) => {
        connectionRelease(connection);
        if (err) {
          console.error("Database query error: 68", err);
          return callback(
            { message: "Database query error", error: err },
            null
          );
        }

        if (results.length === 0) {
          return callback(
            { message: "No customer found with the provided email or mobile" },
            null
          );
        }

        callback(null, results);
      });
    });
  },

  validatePassword: (username, password, callback) => {
    const sql = `
      SELECT \`id\`, \`password\` FROM \`customers\`
      WHERE \`email\` = ? OR \`mobile\` = ?
    `;

    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      connection.query(sql, [username, username], (err, results) => {
        connectionRelease(connection);
        if (err) {
          console.error("Database query error: 69", err);
          return callback(
            { message: "Database query error", error: err },
            null
          );
        }

        if (results.length === 0) {
          return callback(
            { message: "No customer found with the provided email or mobile" },
            null
          );
        }

        const customer = results[0];
        if (hashPassword(password) !== customer.password) {
          return callback({ message: "Incorrect password" }, null);
        }

        callback(null, results);
      });
    });
  },

  updateToken: (id, token, tokenExpiry, callback) => {
    const sql = `
      UPDATE \`customers\`
      SET \`login_token\` = ?, \`token_expiry\` = ?
      WHERE \`id\` = ?
    `;

    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      connection.query(sql, [token, tokenExpiry, id], (err, results) => {
        connectionRelease(connection);
        if (err) {
          console.error("Database query error: 70", err);
          return callback(
            { message: "Database update error", error: err },
            null
          );
        }

        if (results.affectedRows === 0) {
          return callback(
            {
              message:
                "Token update failed. Customer not found or no changes made.",
            },
            null
          );
        }

        callback(null, results);
      });
    });
  },

  validateLogin: (id, callback) => {
    const sql = `
      SELECT \`login_token\`
      FROM \`customers\`
      WHERE \`id\` = ?
    `;

    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      connection.query(sql, [id], (err, results) => {
        connectionRelease(connection);
        if (err) {
          console.error("Database query error: 71", err);
          return callback(
            { message: "Database query error", error: err },
            null
          );
        }

        if (results.length === 0) {
          return callback({ message: "Customer not found" }, null);
        }

        callback(null, results);
      });
    });
  },

  fetchBranchPasswordByEmail: (email, callback) => {
    const sql = `
      SELECT \`password\` FROM \`branches\` WHERE \`email\` = ?
    `;

    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      connection.query(sql, [email], (err, results) => {
        connectionRelease(connection);
        if (err) {
          console.error("Database query error: 72", err);
          return callback(err, null);
        }

        // Check if results exist and are not empty
        if (results.length > 0 && results[0].password) {
          return callback(null, results[0].password); // Return the password
        } else {
          return callback(null, false); // Return false if no result found or empty
        }
      });
    });
  },

  logout: (id, callback) => {
    const sql = `
      UPDATE \`customers\`
      SET \`login_token\` = NULL, \`token_expiry\` = NULL
      WHERE \`id\` = ?
    `;

    startConnection((err, connection) => {
      if (err) {
        return callback(
          { message: "Failed to connect to the database", error: err },
          null
        );
      }
      connection.query(sql, [id], (err, results) => {
        connectionRelease(connection);
        if (err) {
          console.error("Database query error: 73", err);
          return callback(
            { message: "Database update error", error: err },
            null
          );
        }

        if (results.affectedRows === 0) {
          return callback(
            {
              message:
                "Token clear failed. Customer not found or no changes made.",
            },
            null
          );
        }

        callback(null, results);
      });
    });
  },
};

module.exports = Customer;
