const crypto = require("crypto");
const Admin = require("../../models/admin/adminModel");
const Common = require("../../models/admin/commonModel");
const AppModel = require("../../models/appModel");

// Utility function to generate a random token
const generateToken = () => crypto.randomBytes(32).toString("hex");

// Utility function to get token expiry time (1 hour from current time)
const getTokenExpiry = () => new Date(Date.now() + 3600000).toISOString();

const { forgetPassword } = require("../../mailer/admin/auth/forgetPassword");

// Admin login handler
exports.login = (req, res) => {
  const { username, password } = req.body;
  const missingFields = [];

  // Validate required fields
  if (!username || username === "") {
    missingFields.push("Username");
  }
  if (!password || password === "") {
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
      return res.status(500).json({ status: false, message: err.message });
    }

    // If no admin found, return a 404 response
    if (result.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Admin not found with the provided email or mobile number",
      });
    }

    const admin = result[0];

    // Validate password
    Admin.validatePassword(username, password, (err, isValid) => {
      if (err) {
        console.error("Database error:", err);
        Common.adminLoginLog(admin.id, "login", "0", err.message, () => {});
        return res.status(500).json({ status: false, message: err.message });
      }

      // If the password is incorrect, log the attempt and return a 401 response
      if (!isValid) {
        Common.adminLoginLog(
          admin.id,
          "login",
          "0",
          "Incorrect password",
          () => {}
        );
        return res
          .status(401)
          .json({ status: false, message: "Incorrect password" });
      }

      if (admin.status == 0) {
        Common.adminLoginLog(
          admin.id,
          "login",
          "0",
          "Admin account is not yet verified.",
          () => {}
        );
        return res.status(400).json({
          status: false,
          message:
            "Admin account is not yet verified. Please complete the verification process before proceeding.",
        });
      }

      if (admin.status == 2) {
        Common.adminLoginLog(
          admin.id,
          "login",
          "0",
          "Admin account has been suspended.",
          () => {}
        );
        return res.status(400).json({
          status: false,
          message:
            "Admin account has been suspended. Please contact the help desk for further assistance.",
        });
      }

      // Get current time and token expiry
      const currentTime = new Date(); // Current time
      const tokenExpiry = new Date(admin.token_expiry); // Convert token_expiry to Date object

      // Check if the existing token is still valid
      if (admin.login_token && tokenExpiry > currentTime) {
        Common.adminLoginLog(
          admin.id,
          "login",
          "0",
          "Another admin is currently logged in.",
          () => {}
        );
        return res.status(400).json({
          status: false,
          message:
            "Another admin is currently logged in. Please try again later.",
        });
      }

      // Generate new token and expiry time
      const token = generateToken();
      const newTokenExpiry = getTokenExpiry(); // This will be an ISO string

      // Update the token in the database
      Admin.updateToken(admin.id, token, newTokenExpiry, (err) => {
        if (err) {
          console.error("Database error:", err);
          Common.adminLoginLog(
            admin.id,
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
        Common.adminLoginLog(admin.id, "login", "1", null, () => {});
        const { login_token, token_expiry, ...adminDataWithoutToken } = admin;

        res.json({
          status: true,
          message: "Login successful",
          adminData: adminDataWithoutToken,
          token,
        });
      });
    });
  });
};

// Admin logout handler
exports.logout = (req, res) => {
  const { admin_id, _token } = req.query;

  // Validate required fields and create a custom message
  let missingFields = [];

  if (
    !admin_id ||
    admin_id === "" ||
    admin_id === undefined ||
    admin_id === "undefined"
  ) {
    missingFields.push("Admin ID");
  }
  if (
    !_token ||
    _token === "" ||
    _token === undefined ||
    _token === "undefined"
  ) {
    missingFields.push("Token");
  }

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  // Validate the admin token
  Common.isAdminTokenValid(_token, admin_id, (err, result) => {
    if (err) {
      console.error("Error checking token validity:", err);
      return res.status(500).json(err);
    }

    if (!result.status) {
      return res.status(401).json({ status: false, message: result.message });
    }

    // Update the token in the database to null
    Admin.logout(admin_id, (err) => {
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

// Admin login validation handler
exports.validateLogin = (req, res) => {
  const { admin_id, _token } = req.body;
  const missingFields = [];

  if (
    !admin_id ||
    admin_id === "" ||
    admin_id === undefined ||
    admin_id === "undefined"
  ) {
    missingFields.push("Admin Id");
  }

  if (
    !_token ||
    _token === "" ||
    _token === undefined ||
    _token === "undefined"
  ) {
    missingFields.push("Token");
  }

  // If there are missing fields, return an error response
  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  // Fetch the admin record by admin_id to retrieve the saved token and expiry
  Admin.validateLogin(admin_id, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }

    if (result.length === 0) {
      return res
        .status(404)
        .json({ status: false, message: "Admin not found" });
    }

    const admin = result[0];
    const isTokenValid = admin.login_token === _token;

    if (!isTokenValid) {
      return res
        .status(401)
        .json({ status: false, message: "Invalid or expired token" });
    }

    res.json({
      status: true,
      message: "Login validated successfully",
      result: admin,
    });
  });
};

exports.updatePassword = (req, res) => {
  const { new_password, admin_id, _token } = req.body;

  // Validate required fields
  const missingFields = [];

  if (
    !new_password ||
    new_password === "" ||
    new_password === undefined ||
    new_password === "undefined"
  ) {
    missingFields.push("New Password");
  }

  if (
    !admin_id ||
    admin_id === "" ||
    admin_id === undefined ||
    admin_id === "undefined"
  ) {
    missingFields.push("Admin ID");
  }

  if (
    !_token ||
    _token === "" ||
    _token === undefined ||
    _token === "undefined"
  ) {
    missingFields.push("Token");
  }

  // If required fields are missing, return error
  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  // Validate admin token
  Common.isAdminTokenValid(_token, admin_id, (err, tokenValidationResult) => {
    if (err) {
      console.error("Token validation error:", err.message);
      return res.status(500).json({
        status: false,
        message: "Internal server error during token validation.",
      });
    }

    if (!tokenValidationResult.status) {
      return res.status(401).json({
        status: false,
        message: tokenValidationResult.message,
      });
    }

    const newToken = tokenValidationResult.newToken;

    // Update the password
    Admin.updatePassword(new_password, admin_id, (err, result) => {
      if (err) {
        console.error("Database error during password update:", err.message);
        Common.adminActivityLog(
          admin_id,
          "Password",
          "Update",
          "0",
          "Admin attempted to update password",
          err.message,
          () => {}
        );
        return res.status(500).json({
          status: false,
          message: "Failed to update password. Please try again later.",
          token: newToken,
        });
      }

      // Log the successful password update
      Common.adminActivityLog(
        admin_id,
        "Password",
        "Update",
        "1",
        "Admin successfully updated password",
        null,
        () => {}
      );

      return res.status(200).json({
        status: true,
        message: "Password updated successfully.",
        data: result,
        token: newToken,
      });
    });
  });
};

exports.forgotPasswordRequest = (req, res) => {
  const { email } = req.body;

  // Validate the input email
  if (!email || email.trim() === "") {
    return res.status(400).json({
      status: false,
      message: "Email is required.",
    });
  }

  // Check if an admin exists with the provided email
  Admin.findByEmailOrMobileAllInfo(email, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        status: false,
        message:
          "An error occurred while processing your request. Please try again.",
      });
    }

    // If no admin found, return a 404 response
    if (result.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No admin found with the provided email.",
      });
    }

    const admin = result[0];

    // Retrieve application information for the reset link
    AppModel.appInfo("frontend", (err, appInfo) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          status: false,
          message:
            "An error occurred while retrieving application information. Please try again.",
        });
      }

      if (appInfo) {
        const token = generateToken();
        const tokenExpiry = getTokenExpiry(); // ISO string for expiry time

        // Update the reset password token in the database
        Admin.setResetPasswordToken(admin.id, token, tokenExpiry, (err) => {
          if (err) {
            console.error("Error updating reset password token:", err);
            Common.adminLoginLog(
              admin.id,
              "forgot-password",
              "0",
              `Error updating token: ${err.message}`,
              () => {}
            );
            return res.status(500).json({
              status: false,
              message: err.message,
            });
          }

          // Send password reset email
          const resetLink = `${
            appInfo.host || "https://www.goldquestglobal.com"
          }/reset-password?email=${admin.email}&token=${token}`;
          const toArr = [{ name: admin.name, email: admin.email }];

          forgetPassword(
            "admin auth",
            "forget-password",
            admin.name,
            resetLink,
            toArr
          )
            .then(() => {
              Common.adminLoginLog(
                admin.id,
                "forgot-password",
                "1",
                null,
                () => {}
              );
              return res.status(200).json({
                status: true,
                message: `A password reset email has been successfully sent to ${admin.name}.`,
              });
            })
            .catch((emailError) => {
              console.error("Error sending password reset email:", emailError);
              Common.adminLoginLog(
                admin.id,
                "forgot-password",
                "0",
                `Failed to send email: ${emailError.message}`,
                () => {}
              );
              return res.status(500).json({
                status: false,
                message: `Failed to send password reset email to ${admin.name}. Please try again later.`,
              });
            });
        });
      } else {
        return res.status(500).json({
          status: false,
          message:
            "Application information is not available. Please try again later.",
        });
      }
    });
  });
};

exports.forgotPassword = (req, res) => {
  const { new_password, email, password_token } = req.body;
  const missingFields = [];

  // Validate required fields
  if (!new_password || new_password.trim() === "") {
    missingFields.push("New Password");
  }
  if (!email || email.trim() === "") {
    missingFields.push("Email");
  }
  if (!password_token || password_token.trim() === "") {
    missingFields.push("Password Token");
  }

  // Return error if there are missing fields
  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  // Fetch admin details using the provided email
  Admin.findByEmailOrMobileAllInfo(email, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res
        .status(500)
        .json({ status: false, message: "Internal server error." });
    }

    // Return error if no admin found
    if (!result || result.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No admin found with the provided email.",
      });
    }

    const admin = result[0];
    const tokenExpiry = new Date(admin.password_token_expiry);
    const currentTime = new Date();

    // Check if the token is still valid
    if (currentTime > tokenExpiry) {
      return res.status(401).json({
        status: false,
        message: "Password reset token has expired. Please request a new one.",
      });
    }

    // Verify if the token matches
    if (admin.reset_password_token !== password_token) {
      return res.status(401).json({
        status: false,
        message: "Invalid password reset token.",
      });
    }

    // Proceed to update the password
    Admin.updatePassword(new_password, admin.id, (err, result) => {
      if (err) {
        console.error("Database error during password update:", err.message);
        Common.adminActivityLog(
          admin.id,
          "Password",
          "Update",
          "0",
          "Failed password update attempt",
          err.message,
          () => {}
        );
        return res.status(500).json({
          status: false,
          message: "Failed to update password. Please try again later.",
        });
      }

      // Log successful password update
      Common.adminActivityLog(
        admin.id,
        "Password",
        "Update",
        "1",
        "Admin password updated successfully",
        null,
        () => {}
      );

      return res.status(200).json({
        status: true,
        message: "Password updated successfully.",
      });
    });
  });
};
