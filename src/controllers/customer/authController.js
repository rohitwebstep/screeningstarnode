const crypto = require("crypto");
const Customer = require("../../models/customer/customerModel");
const Common = require("../../models/customer/commonModel");

// Utility function to check if a username is an email address
const isEmail = (username) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);

// Utility function to generate a random token
const generateToken = () => crypto.randomBytes(32).toString("hex");

// Utility function to get token expiry time (1 hour from current time)
const getTokenExpiry = () => new Date(Date.now() + 3600000).toISOString();

// Customer login handler
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

  // Find customer by email or mobile number
  Customer.findByEmailOrMobile(username, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }

    // If no customer found, return a 404 response
    if (result.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Customer not found with the provided email or mobile number",
      });
    }

    const customer = result[0];

    // Validate password
    Customer.validatePassword(username, password, (err, isValid) => {
      if (err) {
        console.error("Database error:", err);
        Common.customerLoginLog(
          customer.id,
          "login",
          "0",
          err.message,
          () => { }
        );
        return res.status(500).json({ status: false, message: err.message });
      }

      // If the password is incorrect, log the attempt and return a 401 response
      if (!isValid) {
        Common.customerLoginLog(
          customer.id,
          "login",
          "0",
          "Incorrect password",
          () => { }
        );
        return res.status(401).json({ status: false, message: "Incorrect password" });
      }

      
      if (customer.status === 0) {
        return res.status(400).json({
          status: false,
          message: "Account is not yet verified. Please complete the verification process before proceeding."
        });
      }
      
      if (customer.status === 2) {
        return res.status(400).json({
          status: false,
          message: "Account has been suspended. Please contact the help desk for further assistance."
        });
      }

      // Get current time and token expiry
      const currentTime = new Date(); // Current time
      const tokenExpiry = new Date(customer.token_expiry); // Convert token_expiry to Date object

      // Check if the existing token is still valid
      if (customer.login_token && tokenExpiry > currentTime) {
        return res.status(400).json({
          status: false,
          message: "Another customer is currently logged in. Please try again later."
        });
      }

      // Generate new token and expiry time
      const token = generateToken();
      const newTokenExpiry = getTokenExpiry(); // This will be an ISO string

      // Update the token in the database
      Customer.updateToken(customer.id, token, newTokenExpiry, (err) => {
        if (err) {
          console.error("Database error:", err);
          Common.customerLoginLog(
            customer.id,
            "login",
            "0",
            "Error updating token: " + err.message,
            () => { }
          );
          return res.status(500).json({
            status: false,
            message: `Error updating token: ${err.message}`,
          });
        }

        // Log successful login and return the response
        Common.customerLoginLog(customer.id, "login", "1", null, () => { });
        const { login_token, token_expiry, ...customerDataWithoutToken } = customer;

        res.json({
          status: true,
          message: "Login successful",
          customerData: customerDataWithoutToken,
          token
        });
      });
    });
  });
};

// Customer logout handler
exports.logout = (req, res) => {
  const { customer_id, _token } = req.query;

  // Validate required fields and create a custom message
  let missingFields = [];

  if (!customer_id) {
    missingFields.push("Customer ID");
  }
  if (!_token) {
    missingFields.push("Token");
  }

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  // Validate the customer token
  Common.isCustomerTokenValid(_token, customer_id, (err, result) => {
    if (err) {
      console.error("Error checking token validity:", err);
      return res.status(500).json(err);
    }

    if (!result.status) {
      return res.status(401).json({ status: false, message: result.message });
    }

    // Update the token in the database to null
    Customer.logout(customer_id, (err) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ status: false, message: `Error logging out: ${err.message}` });
      }

      res.json({
        status: true,
        message: 'Logout successful',
      });
    });
  });
};

// Customer login validation handler
exports.validateLogin = (req, res) => {
  const { customer_id, _token } = req.body;
  const missingFields = [];

  // Validate required fields
  if (!customer_id) {
    missingFields.push('Customer ID');
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

  // Fetch the customer record by customer_id to retrieve the saved token and expiry
  Customer.validateLogin(customer_id, (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ status: false, message: err.message });
    }

    if (result.length === 0) {
      return res.status(404).json({ status: false, message: 'Customer not found' });
    }

    const customer = result[0];
    const isTokenValid = customer.login_token === _token;

    if (!isTokenValid) {
      return res.status(401).json({ status: false, message: 'Invalid or expired token' });
    }

    res.json({
      status: true,
      message: 'Login validated successfully',
      result: customer,
    });
  });
};
