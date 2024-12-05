require("dotenv").config();
const mysql = require("mysql2");

// Log environment variables for debugging
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

// Function to start a connection
const startConnection = (callback) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting connection from pool:", err); // Log error for debugging
      return callback(err, null); // Return error via callback
    }
    console.log("Connection established"); // Optional: Log successful connection
    callback(null, connection); // Pass the connection to the callback
  });
};

// Function to release a connection
const connectionRelease = (connection) => {
  if (connection) {
    connection.release();
    console.log("Connection released");
  }
};

module.exports = { pool, startConnection, connectionRelease };
