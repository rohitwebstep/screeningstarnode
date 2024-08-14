const Package = require("../models/packageModel");
const Common = require("../models/commonModel");

exports.newPackage = (req, res) => {
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

    // Call the model to create a new package if the token is valid
    Package.newPackage(title, description, admin_id, (err, result) => {
      if (err) {
        console.error("Database error:", err);
        Common.adminActivityLog(admin_id,"Package","Add","0",err.message,() => {});
        return res
          .status(500)
          .json({ status: false, message: err.message });
      }

      Common.adminActivityLog(admin_id,"Package","Add","1",`{id: ${result.insertId}}`,null,() => {});

      // Send a successful response
      res.json({
        status: true,
        message: "Package created successfully",
        batchData: result,
      });
    });
  });
};

exports.list = (req, res) => {
  const { admin_id, _token } = req.body;

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

    // Call the model to list all packages if the token is valid
    Package.list((err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res
          .status(500)
          .json({ status: false, message: "Database error" });
      }

      // Send a successful response
      res.json({
        status: true,
        message: "Packages fetched successfully",
        packageData: result,
      });
    });
  });
};
