const { pool, startConnection, connectionRelease } = require("../../config/db");

const Service = {
  create: (
    customer_id, month, year, orgenization_name, gst_number, state, state_code,
    invoice_date, invoice_number, taxable_value, cgst, sgst, igst, total_gst,
    invoice_subtotal, callback
  ) => {
    const checkTableSql = `SHOW TABLES LIKE 'invoice_masters'`;

    startConnection((err, connection) => {
      if (err) return callback(err, null);

      connection.query(checkTableSql, (checkTableErr, tableResults) => {
        if (checkTableErr) {
          console.error("Error checking table existence:", checkTableErr);
          connectionRelease(connection);
          return callback(checkTableErr, null);
        }

        if (tableResults.length === 0) {
          createInvoiceTable(connection, callback); // Create table if not exists
        } else {
          proceedWithInsertOrUpdate(connection, callback); // Proceed to insert or update
        }
      });
    });

    // Function to create the 'invoice_masters' table
    function createInvoiceTable(connection, callback) {
      const createTableSql = `
        CREATE TABLE \`invoice_masters\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`customer_id\` INT NOT NULL,
          \`month\` INT NOT NULL,
          \`year\` INT NOT NULL,
          \`orgenization_name\` VARCHAR(255) NOT NULL,
          \`gst_number\` VARCHAR(255) NOT NULL,
          \`state\` VARCHAR(255) NOT NULL,
          \`state_code\` VARCHAR(155) NOT NULL,
          \`invoice_date\` DATE NOT NULL,
          \`invoice_number\` VARCHAR(255) NOT NULL,
          \`taxable_value\` DECIMAL(15, 2) NOT NULL,
          \`cgst\` DECIMAL(15, 2) NOT NULL,
          \`sgst\` DECIMAL(15, 2) NOT NULL,
          \`igst\` DECIMAL(15, 2) NOT NULL,
          \`total_gst\` DECIMAL(15, 2) NOT NULL,
          \`invoice_subtotal\` DECIMAL(15, 2) NOT NULL,
          \`due_date\` DATE NOT NULL,
          \`payment_status\` VARCHAR(50) NOT NULL,
          \`received_date\` DATE NOT NULL,
          \`tds_percentage\` DECIMAL(5, 2) NOT NULL,
          \`tds_deducted\` DECIMAL(15, 2) NOT NULL,
          \`ammount_received\` DECIMAL(15, 2) NOT NULL,
          \`balance_payment\` DECIMAL(15, 2) NOT NULL,
          \`payment_remarks\` TEXT,
          \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          KEY \`customer_id\` (\`customer_id\`),
          CONSTRAINT \`fk_invoice_masters_customer_id\` FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `;

      connection.query(createTableSql, (createTableErr) => {
        if (createTableErr) {
          console.error("Error creating table:", createTableErr);
          connectionRelease(connection);
          return callback(createTableErr, null);
        }

        console.log("Table 'invoice_masters' created successfully.");
        proceedWithInsertOrUpdate(connection, callback); // Proceed after table creation
      });
    }

    // Function to proceed with insert or update
    function proceedWithInsertOrUpdate(connection, callback) {
      const checkInvoiceSql = `
        SELECT * FROM \`invoice_masters\` WHERE \`customer_id\` = ? AND \`month\` = ? AND \`year\` = ?
      `;

      connection.query(checkInvoiceSql, [customer_id, month, year], (checkErr, invoiceResults) => {
        if (checkErr) {
          console.error("Error checking invoice:", checkErr);
          connectionRelease(connection);
          return callback(checkErr, null);
        }

        if (invoiceResults.length > 0) {
          updateInvoice(connection, callback); // Update existing invoice if found
        } else {
          insertInvoice(connection, callback); // Insert new invoice if not found
        }
      });
    }

    // Function to update the invoice
    function updateInvoice(connection, callback) {
      const updateInvoiceSql = `
        UPDATE \`invoice_masters\` SET
          \`orgenization_name\` = ?,
          \`gst_number\` = ?,
          \`state\` = ?,
          \`state_code\` = ?,
          \`invoice_date\` = ?,
          \`invoice_number\` = ?,
          \`taxable_value\` = ?,
          \`cgst\` = ?,
          \`sgst\` = ?,
          \`igst\` = ?,
          \`total_gst\` = ?,
          \`invoice_subtotal\` = ?
        WHERE \`customer_id\` = ? AND \`month\` = ? AND \`year\` = ?
      `;

      connection.query(
        updateInvoiceSql,
        [
          orgenization_name, gst_number, state, state_code, invoice_date, invoice_number, taxable_value,
          cgst, sgst, igst, total_gst, invoice_subtotal,
          customer_id, month, year
        ],
        (updateErr, results) => {
          connectionRelease(connection);

          if (updateErr) {
            console.error("Error updating invoice:", updateErr);
            return callback(updateErr, null);
          }
          callback(null, { insertId: results.insertId, type: "Updated" });
        }
      );
    }

    // Function to insert a new invoice
    function insertInvoice(connection, callback) {
      const insertInvoiceSql = `
        INSERT INTO \`invoice_masters\` (
          \`customer_id\`, \`month\`, \`year\`, \`orgenization_name\`, \`gst_number\`, \`state\`, \`state_code\`,
          \`invoice_date\`, \`invoice_number\`, \`taxable_value\`, \`cgst\`, \`sgst\`, \`igst\`, \`total_gst\`,
          \`invoice_subtotal\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      connection.query(
        insertInvoiceSql,
        [
          customer_id, month, year, orgenization_name, gst_number, state, state_code, invoice_date, invoice_number,
          taxable_value, cgst, sgst, igst, total_gst, invoice_subtotal
        ],
        (insertErr, results) => {
          connectionRelease(connection);

          if (insertErr) {
            console.error("Error inserting invoice:", insertErr);
            return callback(insertErr, null);
          }
          callback(null, { insertId: results.insertId, type: "Created" });
        }
      );
    }
  },

  list: (callback) => {
    const sql = `SELECT IM.*, C.name AS customer_name FROM \`invoice_masters\` AS IM INNER JOIN \`customers\` AS C ON C.id = IM.customer_id`;

    startConnection((err, connection) => {
      if (err) {
        return callback(err, null);
      }

      connection.query(sql, (queryErr, results) => {
        connectionRelease(connection); // Release the connection

        if (queryErr) {
          console.error("Database query error: 4347", queryErr);
          return callback(queryErr, null);
        }
        callback(null, results);
      });
    });
  },

  update: (
    id,
    year,
    month,
    due_date,
    customer_id,
    tds_deducted,
    received_date,
    payment_status,
    tds_percentage,
    payment_remarks,
    balance_payment,
    ammount_received, callback
  ) => {
    // Define the update SQL query with placeholders
    const updateInvoiceSql = `
      UPDATE \`invoice_masters\` SET
        \`due_date\` = ?,
        \`tds_deducted\` = ?,
        \`received_date\` = ?,
        \`payment_status\` = ?,
        \`tds_percentage\` = ?,
        \`payment_remarks\` = ?,
        \`balance_payment\` = ?,
        \`ammount_received\` = ?
      WHERE \`id\` = ? AND \`customer_id\` = ? AND \`month\` = ? AND \`year\` = ?
    `;

    // Start database connection
    startConnection((err, connection) => {
      if (err) {
        console.error("Connection error:", err);
        return callback(err, null);
      }

      // Execute the update query with the appropriate values
      connection.query(
        updateInvoiceSql,
        [
          due_date,
          tds_deducted,
          received_date,
          payment_status,
          tds_percentage,
          payment_remarks,
          balance_payment,
          ammount_received,
          id,              // Add the `id` to the query
          customer_id,
          month,
          year
        ],
        (queryErr, results) => {
          connectionRelease(connection); // Release the connection

          if (queryErr) {
            console.error("Database query error:", queryErr);
            return callback(queryErr, null);
          }

          // Check if any rows were updated
          if (results.affectedRows > 0) {
            // Record was found and updated
            callback(null, { status: true, message: "Invoice updated successfully." });
          } else {
            // No rows affected, meaning record was not found
            callback({ error: "Record not found." }, null);
          }
        }
      );
    });
  }
};

module.exports = Service;
