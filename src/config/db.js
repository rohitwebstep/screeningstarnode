// db.js
require("dotenv").config();
const mysql = require("mysql2/promise"); // Import mysql2 with promise support

// Logging environment variables for debugging
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true, // Ensures waiting for connections rather than failing immediately
  connectionLimit: 50, // Maximum number of connections to the database
  queueLimit: 0, // Unlimited number of queued connection requests
  connectTimeout: 120000, // Increase to 120 seconds for long-running queries
});

// Test connection
(async () => {
  try {
    const connection = await pool.getConnection(); // Wait for the connection to be established
    console.log("Connected to the MySQL database");
    connection.release(); // Release the connection back to the pool
  } catch (err) {
    // Enhanced logging with error details
    console.error("Database connection error:", {
      message: err.message,
      code: err.code,
      stack: err.stack,
    });
    process.exit(1); // Exit the process if there's a connection error
  }
})();

// Uncomment to monitor connection events
/*
pool.on("acquire", (connection) => {
  console.log("Connection %d acquired", connection.threadId);
});

pool.on("release", (connection) => {
  console.log("Connection %d released", connection.threadId);
});

pool.on("enqueue", () => {
  console.log("Waiting for available connection slot");
});

pool.on("error", (err) => {
  console.error("Unexpected pool error:", err);
});
*/

module.exports = pool; // Export the connection pool for use in other modules
