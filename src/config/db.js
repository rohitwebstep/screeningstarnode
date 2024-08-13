require('dotenv').config();
const mysql = require('mysql2');

// Logging environment variables for debugging
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true, // Ensures waiting for connections rather than failing immediately
  connectionLimit: 10, // Maximum number of connections to the database
  queueLimit: 0 // Unlimited number of queued connection requests
});

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    // Log and exit if there's an error connecting to the database
    console.error('Database connection error:', err);
    process.exit(1);
  }
  console.log('Connected to the MySQL database');
  connection.release(); // Release the connection back to the pool
});

module.exports = pool;
