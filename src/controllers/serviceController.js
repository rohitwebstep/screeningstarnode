const Service = require("../models/serviceModel");
const Common = require("../models/commonModel");

exports.newService = (req, res) => {
  const { title, description, admin_id, _token } = req.body;

  // Validate required fields and create a custom message
  let missingFields = [];

  if (!title) {
    missingFields.push("Title");
  }
  if (!description) {
    missingFields.push("Description");
  }
  if (!admin_id) {
    missingFields.push("Admin ID");
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

  // Validate the admin token
  Common.isAdminTokenValid(_token, admin_id, (err, result) => {
    if (err) {
      console.error("Error checking token validity:", err);
      return res.status(500).json(err);
    }

    if (!result.status) {
      return res.status(401).json({ status: false, message: result.message });
    }

    newToken = result.newToken;

    // Call the model to create a new service if the token is valid
    Service.newService(title, description, admin_id, (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res
          .status(500)
          .json({ status: false, message: "Database error" });
      }

      // Send a successful response
      res.json({
        status: true,
        message: "Service created successfully",
        serviceData: result,
        token: newToken
      });
    });
  });
};

exports.list = (req, res) => {
  const { admin_id, _token } = req.query;

  // Validate required fields and create a custom message
  let missingFields = [];

  if (!admin_id) {
    missingFields.push("Admin ID");
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

  // Validate the admin token
  Common.isAdminTokenValid(_token, admin_id, (err, result) => {
    if (err) {
      console.error("Error checking token validity:", err);
      return res.status(500).json(err);
    }

    if (!result.status) {
      return res.status(401).json({ status: false, message: result.message });
    }

    newToken = result.newToken;

    // Call the model to list all services if the token is valid
    Service.list((err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res
          .status(500)
          .json({ status: false, message: err.message });
      }

      // Send a successful response
      res.json({
        status: true,
        message: "Services fetched successfully",
        services: result,
        totalResults: result.length,
        token: newToken
      });
    });
  });
};
