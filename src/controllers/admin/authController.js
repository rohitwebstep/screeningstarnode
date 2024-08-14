const crypto = require('crypto');
const Admin = require('../../models/adminModel');
const Common = require('../../models/commonModel');

const isEmail = (username) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);

const generateToken = () => crypto.randomBytes(32).toString('hex');
const getTokenExpiry = () => new Date(Date.now() + 3600000).toISOString();

exports.login = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ status: false, message: "Username and password are required" });
  }

  if (!isEmail(username)) {
    return res.status(400).json({ status: false, message: "Invalid username format" });
  }

  Admin.findByEmailOrMobile(username, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }

    if (result.length === 0) {
      return res.status(404).json({ status: false, message: "No admin found with the provided email or mobile" });
    }

    const user = result[0];

    Admin.validatePassword(username, password, (err, result) => {
      if (err) {
        console.error("Database error:", err);
        Common.adminLoginLog(user.id, 'login', 'login', '0', 'Database error: ' + err.message, () => {});
        return res.status(500).json({ status: false, message: err.message });
      }

      if (result.length === 0) {
        Common.adminLoginLog(user.id, 'login', 'login', '0', 'Incorrect password', () => {});
        return res.status(401).json({ status: false, message: "Incorrect password" });
      }

      const token = generateToken();
      const tokenExpiry = getTokenExpiry();

      Admin.updateToken(user.id, token, tokenExpiry, (err) => {
        if (err) {
          console.error("Database error:", err);
          Common.adminLoginLog(user.id, 'login', 'login', '0', 'Error updating token', () => {});
          return res.status(500).json({ status: false, message: "Error updating token: " + err.message });
        }
        Common.adminLoginLog(user.id, 'login', 'login', '1', null, () => {});
        res.json({ status: true, message: "Login successful", adminData: user, token });
      });
    });
  });
};
