const crypto = require("crypto");
const BranchAuth = require("../../../models/customer/branch/branchAuthModel");
const Common = require("../../../models/customer/branch/commonModel");

// Utility function to generate a random token
const generateToken = () => crypto.randomBytes(32).toString("hex");

// Utility function to get token expiry time (1 hour from current time)
const getTokenExpiry = () => new Date(Date.now() + 3600000).toISOString();

// Branch login handler
exports.login = (req, res) => {
  const { username, password } = req.body;
  const missingFields = [];

  // Validate required fields
  if (!username || username === "") missingFields.push("Username");
  if (!password || password === "") missingFields.push("Password");

  // If there are missing fields, return an error response
  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  // Find branch by email or mobile number
  BranchAuth.findByEmailOrMobile(username, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }

    // If no branch found, return a 404 response
    if (result.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Branch not found with the provided email or mobile number",
      });
    }

    const branch = result[0];

    // Validate password
    BranchAuth.validatePassword(username, password, (err, isValid) => {
      if (err) {
        console.error("Database error:", err);
        Common.branchLoginLog(branch.id, "login", "0", err.message, () => {});
        return res.status(500).json({ status: false, message: err.message });
      }

      // If the password is incorrect, log the attempt and return a 401 response
      if (!isValid) {
        Common.branchLoginLog(
          branch.id,
          "login",
          "0",
          "Incorrect password",
          () => {}
        );
        return res
          .status(401)
          .json({ status: false, message: "Incorrect password" });
      }

      if (branch.status == 0) {
        Common.branchLoginLog(
          branch.id,
          "login",
          "0",
          "Branch account is not yet verified.",
          () => {}
        );
        return res.status(400).json({
          status: false,
          message:
            "Branch account is not yet verified. Please complete the verification process before proceeding.",
        });
      }

      if (branch.status == 2) {
        Common.branchLoginLog(
          branch.id,
          "login",
          "0",
          "Branch account has been suspended.",
          () => {}
        );
        return res.status(400).json({
          status: false,
          message:
            "Branch account has been suspended. Please contact the help desk for further assistance.",
        });
      }

      // Get current time and token expiry
      const currentTime = new Date(); // Current time
      const tokenExpiry = new Date(branch.token_expiry); // Convert token_expiry to Date object

      // Check if the existing token is still valid
      if (branch.login_token && tokenExpiry > currentTime) {
        Common.branchLoginLog(
          branch.id,
          "login",
          "0",
          "Another branch is currently logged in.",
          () => {}
        );
        return res.status(400).json({
          status: false,
          message:
            "Another branch is currently logged in. Please try again later.",
        });
      }

      // Generate new token and expiry time
      const token = generateToken();
      const newTokenExpiry = getTokenExpiry(); // This will be an ISO string

      // Update the token in the database
      BranchAuth.updateToken(branch.id, token, newTokenExpiry, (err) => {
        if (err) {
          console.error("Database error:", err);
          Common.branchLoginLog(
            branch.id,
            "login",
            "0",
            "Error updating token: " + err.message,
            () => {}
          );
          return res.status(500).json({
            status: false,
            message: `Error updating token: ${err.message}`,
          });
        }

        // Log successful login and return the response
        Common.branchLoginLog(branch.id, "login", "1", null, () => {});
        const { login_token, token_expiry, ...branchDataWithoutToken } = branch;

        res.json({
          status: true,
          message: "Login successful",
          branchData: branchDataWithoutToken,
          token,
        });
      });
    });
  });
};

// Branch logout handler
exports.logout = (req, res) => {
  const { branch_id, _token } = req.query;

  // Validate required fields and create a custom message
  let missingFields = [];
  if (!branch_id || branch_id === "") missingFields.push("Branch ID");
  if (!_token || _token === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  // Validate the branch token
  Common.isBranchTokenValid(_token, branch_id, (err, result) => {
    if (err) {
      console.error("Error checking token validity:", err);
      return res.status(500).json(err);
    }

    if (!result.status) {
      return res.status(401).json({ status: false, message: result.message });
    }

    // Update the token in the database to null
    BranchAuth.logout(branch_id, (err) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          status: false,
          message: `Error logging out: ${err.message}`,
        });
      }

      res.json({
        status: true,
        message: "Logout successful",
      });
    });
  });
};

// Branch login validation handler
exports.validateLogin = (req, res) => {
  const { branch_id, _token } = req.body;
  const missingFields = [];

  // Validate required fields
  if (!branch_id || branch_id === "") missingFields.push("Branch ID");
  if (!_token || _token === "") missingFields.push("Token");

  return res.status(400).json({
    status: false,
    message: req.body,
  });

  // If there are missing fields, return an error response
  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  // Fetch the branch record by branch_id to retrieve the saved token and expiry
  BranchAuth.validateLogin(branch_id, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }

    if (result.length === 0) {
      return res
        .status(404)
        .json({ status: false, message: "Branch not found" });
    }

    const branch = result[0];
    const isTokenValid =
      branch.login_token === _token &&
      new Date(branch.token_expiry) > new Date();

    if (!isTokenValid) {
      return res
        .status(401)
        .json({ status: false, message: "Invalid or expired token" });
    }

    res.json({
      status: true,
      message: "Login validated successfully",
      result: branch,
    });
  });
};
