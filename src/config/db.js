require("dotenv").config();
const mysql = require("mysql2");

// Logging environment variables for debugging
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);

// Create a connection pool
const { pool, startConnection, connectionRelease } = mysql.createPool({
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
      return callback(err, null);
    }
    callback(null, connection);
  });
};

// Function to release a connection
const connectionRelease = (connection) => {
  if (connection) {
    connection.release();
  }
};

module.exports = { pool, startConnection, connectionRelease };
