const crypto = require("crypto");
const Admin = require("../../models/adminModel");
const Common = require("../../models/commonModel");

// Utility function to check if a username is an email address
const isEmail = (username) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);

// Utility function to generate a random token
const generateToken = () => crypto.randomBytes(32).toString("hex");

// Utility function to get token expiry time (1 hour from current time)
const getTokenExpiry = () => new Date(Date.now() + 3600000).toISOString();

// Admin login handler
exports.login = (req, res) => {
  const { username, password } = req.body;
  const missingFields = [];

  // Validate required fields
  if (!username) {
    missingFields.push("Username");
  }
  if (!password) {
    missingFields.push("Password");
  }

  // If there are missing fields, return an error response
  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  // Find admin by email or mobile number
  Admin.findByEmailOrMobile(username, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res
        .status(500)
        .json({ status: false, message: "Internal server error" });
    }

    // If no admin found, return a 404 response
    if (result.length === 0) {
      return res
        .status(404)
        .json({
          status: false,
          message: "Admin not found with the provided email or mobile number",
        });
    }

    const user = result[0];

    // Validate password
    Admin.validatePassword(username, password, (err, isValid) => {
      if (err) {
        console.error("Database error:", err);
        Common.adminLoginLog(
          user.id,
          "login",
          "login",
          "0",
          err.message,
          () => { }
        );
        return res
          .status(500)
          .json({ status: false, message: err.message });
      }

      // If the password is incorrect, log the attempt and return a 401 response
      if (!isValid) {
        Common.adminLoginLog(
          user.id,
          "login",
          "login",
          "0",
          "Incorrect password",
          () => { }
        );
        return res
          .status(401)
          .json({ status: false, message: "Incorrect password" });
      }

      // Check if the user already has a token and if it's expired
      const currentTime = new Date(); // Get the current time as a Date object
      const tokenExpiryTime = new Date(user.token_expiry); // Convert the token expiry time to a Date object
      
      if (user.login_token && tokenExpiryTime > currentTime) {
        // Token is still valid
        return res.json({
          status: false,
          message: "Another admin is currently logged in. Please try again later.",
          adminData: user,
          token: user.login_token,
          token_expiry: user.token_expiry,
          currentTime: currentTime.toISOString()
        });
      }      

      // Generate token and expiry time
      const token = generateToken();
      const tokenExpiry = getTokenExpiry();

      // Update the token in the database
      Admin.updateToken(user.id, token, tokenExpiry, (err) => {
        if (err) {
          console.error("Database error:", err);
          Common.adminLoginLog(
            user.id,
            "login",
            "login",
            "0",
            "Error updating token",
            () => { }
          );
          return res
            .status(500)
            .json({
              status: false,
              message: `Error updating token: ${err.message}`,
            });
        }

        // Log successful login and return the response
        Common.adminLoginLog(user.id, "login", "login", "1", null, () => { });
        res.json({
          status: true,
          message: "Login successful",
          adminData: user,
          token,
          token_expiry : user.token_expiry,
          currentTime
        });
      });
    });
  });
};

// Admin login validation handler
exports.validateLogin = (req, res) => {
  const { admin_id, _token } = req.body;
  const missingFields = [];

  // Validate required fields
  if (!admin_id) {
    missingFields.push('Admin ID');
  }
  if (!_token) {
    missingFields.push('Token');
  }

  // If there are missing fields, return an error response
  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(', ')}`,
    });
  }

  // Fetch the admin record by admin_id to retrieve the saved token and expiry
  Admin.validateLogin(admin_id, (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ status: false, message: err.message });
    }

    if (result.length === 0) {
      return res.status(404).json({ status: false, message: 'Admin not found' });
    }

    const admin = result[0];
    const isTokenValid = admin.login_token === _token;

    if (!isTokenValid) {
      return res.status(401).json({ status: false, message: 'Invalid or expired token' });
    }

    res.json({
      status: true,
      message: 'Login validated successfully',
      result: admin,
    });
  });
};
