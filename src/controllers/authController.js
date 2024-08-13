const crypto = require('crypto');
const Admin = require('../models/adminModel');

const isEmail = (username) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);

const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const getTokenExpiry = () => {
  return new Date(Date.now() + 3600000).toISOString(); // Token expiry set to 1 hour from now
};

exports.login = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ status: false, message: "Username and password are required" });
  }

  if (!isEmail(username)) {
    return res.status(400).json({ status: false, message: "Invalid username format" });
  }

  // Generate token and expiry before any database operations
  const token = generateToken();
  const tokenExpiry = getTokenExpiry();

  Admin.findByEmailOrMobile(username, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }

    if (result.length === 0) {
      return res.status(404).json({ status: false, message: "User not registered" });
    }

    const user = result[0];

    Admin.validatePassword(username, password, (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ status: false, message: "Database error" });
      }

      if (result.length === 0) {
        return res.status(404).json({ status: false, message: "Incorrect password" });
      }

      // Update the token and expiry first
      Admin.updateToken(user.id, token, tokenExpiry, (err) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ status: false, message: "Error updating token" });
        }

        // Fetch the updated admin details and respond
        Admin.findByEmailOrMobile(username, (err, updatedUser) => {
          if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ status: false, message: "Database error" });
          }

          res.json({ status: true, message: "Login successful", adminData: updatedUser[0], token });
        });
      });
    });
  });
};
