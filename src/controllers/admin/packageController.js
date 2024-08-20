const Package = require("../../models/admin/packageModel");
const Common = require("../../models/admin/commonModel");

// Controller to create a new package
exports.create = (req, res) => {
  const { title, description, admin_id, _token } = req.body;

  let missingFields = [];
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

    const newToken = result.newToken;

    Package.create(title, description, admin_id, (err, result) => {
      if (err) {
        console.error("Database error:", err);
        Common.adminActivityLog(
          admin_id,
          "Package",
          "Create",
          "0",
          null,
          err.message,
          () => { }
        );
        return res.status(500).json({ status: false, message: err.message });
      }

      Common.adminActivityLog(
        admin_id,
        "Package",
        "Create",
        "1",
        `{id: ${result.insertId}}`,
        null,
        () => { }
      );

      res.json({
        status: true,
        message: "Package created successfully",
        package: result,
        token: newToken
      });
    });
  });
};

// Controller to list all packages
exports.list = (req, res) => {
  const { admin_id, _token } = req.query;

  let missingFields = [];
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

    const newToken = result.newToken;

    Package.list((err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ status: false, message: err.message });
      }

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

// Controller to get a package by ID
exports.getPackageById = (req, res) => {
  const { id, admin_id, _token } = req.query;
  let missingFields = [];
  if (!id) missingFields.push("Package ID");
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

    const newToken = result.newToken;

    Package.getPackageById(id, (err, currentPackage) => {
      if (err) {
        console.error("Error fetching package data:", err);
        return res.status(500).json(err);
      }

      if (!currentPackage) {
        return res.status(404).json({
          status: false,
          message: "Package not found",
        });
      }

      res.json({
        status: true,
        message: "Package retrieved successfully",
        package: currentPackage,
        token: newToken
      });
    });
  });
};

// Controller to update a package
exports.update = (req, res) => {
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

    const newToken = result.newToken;

    Package.getPackageById(id, (err, currentPackage) => {
      if (err) {
        console.error("Error fetching package data:", err);
        return res.status(500).json(err);
      }

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

      Package.update(id, title, description, (err, result) => {
        if (err) {
          console.error("Database error:", err);
          Common.adminActivityLog(
            admin_id,
            "Package",
            "Update",
            "0",
            JSON.stringify({ id, ...changes }),
            err.message,
            () => { }
          );
          return res.status(500).json({ status: false, message: err.message });
        }

        Common.adminActivityLog(
          admin_id,
          "Package",
          "Update",
          "1",
          JSON.stringify({ id, ...changes }),
          null,
          () => { }
        );

        res.json({
          status: true,
          message: "Package updated successfully",
          package: result,
          token: newToken
        });
      });
    });
  });
};

// Controller to delete a package
exports.delete = (req, res) => {
  const { id, admin_id, _token } = req.query;

  let missingFields = [];
  if (!id) missingFields.push("Package ID");
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

    const newToken = result.newToken;

    Package.getPackageById(id, (err, currentPackage) => {
      if (err) {
        console.error("Error fetching package data:", err);
        return res.status(500).json(err);
      }

      Package.delete(id, (err, result) => {
        if (err) {
          console.error("Database error:", err);
          Common.adminActivityLog(
            admin_id,
            "Package",
            "Delete",
            "0",
            JSON.stringify({ id, ...currentPackage }),
            err.message,
            () => { }
          );
          return res.status(500).json({ status: false, message: err.message });
        }

        Common.adminActivityLog(
          admin_id,
          "Package",
          "Delete",
          "1",
          null,
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
