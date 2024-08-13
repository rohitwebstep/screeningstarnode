const Admin = require('../models/adminModel');

const isEmail = (username) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);

// ===============--------------- LOGIN  ---------------===============
exports.login = (req, res) => {
  const { username, password } = req.body;

  // Perform initial validation if needed
  if (!username || !password) {
    return res.status(400).json({ status: false, message: "Username and password are required" });
  }

  // Check if the username is in a valid format
  if (!isEmail(username)) {
    return res.status(400).json({ status: false, message: "Invalid username format" });
  }

  // Find user by email or mobile
  Admin.findByEmailOrMobile(username, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }

    if (result.length === 0) {
      return res.status(404).json({ status: false, message: "User not registered" });
    }

    // Validate password
    Admin.validatePassword(username, password, (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ status: false, message: "Database error" });
      }

      if (result.length === 0) {
        return res.status(404).json({ status: false, message: "Incorrect password" });
      }

      // If everything is successful
      res.json({ status: true, message: "Login successful", adminData: result });
    });
  });
};