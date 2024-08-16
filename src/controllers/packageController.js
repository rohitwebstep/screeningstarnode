const Package = require("../models/packageModel");
const Common = require("../models/commonModel");

exports.new = (req, res) => {
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

    // Call the model to create a new package if the token is valid
    Package.new(title, description, admin_id, (err, result) => {
      if (err) {
        console.error("Database error:", err);
        Common.adminActivityLog(
          admin_id,
          "Package",
          "Add",
          "0",
          err.message,
          () => { }
        );
        return res.status(500).json({ status: false, message: err.message });
      }

      Common.adminActivityLog(
        admin_id,
        "Package",
        "Add",
        "1",
        `{id: ${result.insertId}}`,
        null,
        () => { }
      );

      // Send a successful response
      res.json({
        status: true,
        message: "Package created successfully",
        packages: result,
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
    console.log('New Token - '+newToken);
    // Call the model to list all packages if the token is valid
    Package.list((err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res
          .status(500)
          .json({ status: false, message: err.message });
      }

      // Send a successful response
      res.json({
        status: true,
        message: "Packages fetched successfully",
        packages: result,
        totalResults: result.length,
        token: newToken
      });
    });
  });
};

exports.edit = (req, res) => {
  const { id, title, description, admin_id, _token } = req.body;

  let missingFields = [];

  if (!id) missingFields.push("Package ID");
  if (!title) missingFields.push("Title");
  if (!description) missingFields.push("Description");
  if (!admin_id) missingFields.push("Admin ID");
  if (!_token) missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  Common.isAdminTokenValid(_token, admin_id, (err, result) => {
    if (err) {
      console.error("Error checking token validity:", err);
      return res.status(500).json(err);
    }

    if (!result.status) {
      return res.status(401).json({ status: false, message: result.message });
    }

    newToken = result.newToken;

    // Fetch current package data
    Package.getPackageById(id, (err, currentPackage) => {
      if (err) {
        console.error("Error fetching package data:", err);
        return res.status(500).json(err);
      }

      // Compare current data with new data
      const changes = {};
      if (currentPackage.title !== title) {
        changes.title = {
          old: currentPackage.title,
          new: title,
        };
      }
      if (currentPackage.description !== description) {
        changes.description = {
          old: currentPackage.description,
          new: description,
        };
      }

      Package.edit(id, title, description, (err, result) => {
        if (err) {
          console.error("Database error:", err);
          Common.adminActivityLog(
            admin_id,
            "Package",
            "Edit",
            "0",
            err.message,
            () => { }
          );
          return res.status(500).json({ status: false, message: err.message });
        }

        Common.adminActivityLog(
          admin_id,
          "Package",
          "Edit",
          "1",
          JSON.stringify({ id, ...changes }),
          null,
          () => { }
        );

        res.json({
          status: true,
          message: "Package updated successfully",
          packages: result,
          token: newToken
        });
      });
    });
  });
};

exports.delete = (req, res) => {
  const { id, admin_id, _token } = req.query;

  // Validate required fields and create a custom message
  let missingFields = [];

  if (!id) {
    missingFields.push("Package ID");
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
    
    // Fetch current package data
    Package.getPackageById(id, (err, currentPackage) => {
      if (err) {
        console.error("Error fetching package data:", err);
        return res.status(500).json(err);
      }

      // Call the model to delete the package if the token is valid
      Package.delete(id, (err, result) => {
        if (err) {
          console.error("Database error:", err);
          Common.adminActivityLog(
            admin_id,
            "Package",
            "Delete",
            "0",
            JSON.stringify({ id, ...currentPackage }),
            () => { }
          );
          return res.status(500).json({ status: false, message: err.message });
        }

        Common.adminActivityLog(
          admin_id,
          "Package",
          "Delete",
          "1",
          JSON.stringify(currentPackage),
          () => { }
        );

        res.json({
          status: true,
          message: "Package deleted successfully",
          token: newToken
        });
      });
    });
  });
};
