require("dotenv").config();
const mysql = require("mysql2");

// Logging environment variables for debugging
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);

// Create a connection pool
// const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
//   connectTimeout: 120000, // 2 minutes for individual connection attempts
// });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 120000,
  // Add force IPv4
  multipleStatements: true,
  connectAttributes: {
    ipv4: true
  },
});


// Function to start a connection
const startConnection = (callback) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting connection from pool:", err); // Log error for debugging
      return callback(err, null); // Call callback with error
    }
    callback(null, connection); // Pass the connection to the callback
  });
};

// Function to release a connection
const connectionRelease = (connection) => {
  if (connection) {
    connection.release(); // Release the connection back to the pool
  }
};

module.exports = { pool, startConnection, connectionRelease };
