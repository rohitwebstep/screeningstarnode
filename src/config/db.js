require("dotenv").config();
const mysql = require("mysql2");

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
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 60000, // 60 seconds
});

// Function to connect with indefinite retry
function connectWithRetry() {
  pool.getConnection((err, connection) => {
    if (err) {
      // Handle specific errors
      console.error("Database connection error:", err);
      console.log("Retrying connection...");

      // Wait for 5 seconds before trying again
      setTimeout(connectWithRetry, 5000);
    } else {
      console.log("Connected to the MySQL database");
      connection.release();
    }
  });
}

// Start the connection process
connectWithRetry();

/*
// Monitor pool events for better diagnostics
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

module.exports = pool;
