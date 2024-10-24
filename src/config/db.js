require("dotenv").config();
const mysql = require("mysql2/promise"); // Use promise version

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
  connectionLimit: 50,
  queueLimit: 0,
  connectTimeout: 120000,
});

// Test connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("Connected to the MySQL database");
    connection.release(); // Release the connection back to the pool
  } catch (err) {
    console.error("Database connection error:", {
      message: err.message,
      code: err.code,
      stack: err.stack,
    });
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log("Shutting down gracefully...");
  await pool.end();
  console.log("Connection pool closed.");
  process.exit(0);
});

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

module.exports = pool;
