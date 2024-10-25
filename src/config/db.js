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
  connectTimeout: 120000, // 2 minutes for individual connection attempts
});

// Maximum retries to prevent infinite loops
const MAX_RETRIES = 5;

// Function to connect with retry and backoff
function connectWithRetry(attempt = 1) {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Database connection error:", err);

      // Check if maximum retries have been exceeded
      if (attempt > MAX_RETRIES) {
        console.error("Max connection attempts exceeded. Exiting process.");
        process.exit(1); // Exit the process
      }

      // Calculate backoff time (increasing with each attempt)
      const backoffTime = Math.min(30000, 5000 * attempt); // Max backoff of 30 seconds
      console.log(`Retrying connection in ${backoffTime / 1000} seconds...`);

      // Retry connection after the backoff period
      setTimeout(() => connectWithRetry(attempt + 1), backoffTime);
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
