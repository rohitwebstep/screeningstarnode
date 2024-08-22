const Package = require("../../models/admin/packageModel");
const Common = require("../../models/admin/commonModel");

// Middleware to validate admin and token
const validateAdminAndToken = async (req, res, next) => {
  const { admin_id, _token } = req.query;
  if (!admin_id || !_token) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${!admin_id ? "Admin ID" : ""} ${
        !_token ? "Token" : ""
      }`,
    });
  }

  try {
    const result = await Common.isAdminTokenValid(_token, admin_id);
    if (!result.status) {
      return res.status(401).json({ status: false, message: result.message });
    }
    req.newToken = result.newToken;
    next();
  } catch (err) {
    console.error("Error checking token validity:", err);
    res.status(500).json(err);
  }
};

// Middleware to authorize admin actions
const authorizeAdminAction = (action) => async (req, res, next) => {
  const { admin_id } = req.body; // For `update` method
  if (!admin_id) {
    return res
      .status(400)
      .json({ status: false, message: "Admin ID is required" });
  }

  try {
    const isAuthorized = await Common.isAdminAuthorizedForAction(
      admin_id,
      JSON.stringify({ package: action })
    );
    if (!isAuthorized) {
      return res.status(401).json({
        status: false,
        message: "Admin isn't authorized for the action.",
      });
    }
    next();
  } catch (err) {
    console.error(`Error authorizing admin for action ${action}:`, err);
    return res.status(500).json({ status: false, message: err.message });
  }
};

// Controller to create a new package
exports.create = [
  validateAdminAndToken,
  authorizeAdminAction("create"),
  async (req, res) => {
    const { title, description, admin_id, _token } = req.body;
    if (!title || !description || !admin_id || !_token) {
      return res.status(400).json({
        status: false,
        message: `Missing required fields: ${!title ? "Title" : ""} ${
          !description ? "Description" : ""
        } ${!admin_id ? "Admin ID" : ""} ${!_token ? "Token" : ""}`,
      });
    }

    try {
      const result = await Package.create(title, description, admin_id);
      await Common.adminActivityLog(
        admin_id,
        "Package",
        "Create",
        "1",
        `{id: ${result.insertId}}`,
        null
      );
      res.json({
        status: true,
        message: "Package created successfully",
        package: result,
        token: req.newToken,
      });
    } catch (err) {
      console.error("Database error:", err);
      await Common.adminActivityLog(
        admin_id,
        "Package",
        "Create",
        "0",
        null,
        err.message
      );
      res.status(500).json({ status: false, message: err.message });
    }
  },
];

// Controller to list all packages
exports.list = [
  validateAdminAndToken,
  async (req, res) => {
    try {
      const result = await Package.list();
      res.json({
        status: true,
        message: "Packages fetched successfully",
        packages: result,
        totalResults: result.length,
        token: req.newToken,
      });
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ status: false, message: err.message });
    }
  },
];

// Controller to get a package by ID
exports.getPackageById = [
  validateAdminAndToken,
  async (req, res) => {
    const { id } = req.query;
    if (!id) {
      return res
        .status(400)
        .json({ status: false, message: "Missing Package ID" });
    }

    try {
      const currentPackage = await Package.getPackageById(id);
      if (!currentPackage) {
        return res
          .status(404)
          .json({ status: false, message: "Package not found" });
      }
      res.json({
        status: true,
        message: "Package retrieved successfully",
        package: currentPackage,
        token: req.newToken,
      });
    } catch (err) {
      console.error("Error fetching package data:", err);
      res.status(500).json(err);
    }
  },
];

// Controller to update a package
exports.update = [
  validateAdminAndToken,
  authorizeAdminAction("update"),
  async (req, res) => {
    const { id, title, description, admin_id } = req.body;
    if (!id || !title || !description || !admin_id) {
      return res.status(400).json({
        status: false,
        message: `Missing required fields: ${!id ? "Package ID" : ""} ${
          !title ? "Title" : ""
        } ${!description ? "Description" : ""} ${!admin_id ? "Admin ID" : ""}`,
      });
    }

    try {
      const currentPackage = await Package.getPackageById(id);
      const changes = {};
      if (currentPackage.title !== title) {
        changes.title = { old: currentPackage.title, new: title };
      }
      if (currentPackage.description !== description) {
        changes.description = {
          old: currentPackage.description,
          new: description,
        };
      }

      await Package.update(id, title, description);
      await Common.adminActivityLog(
        admin_id,
        "Package",
        "Update",
        "1",
        JSON.stringify({ id, ...changes }),
        null
      );
      res.json({
        status: true,
        message: "Package updated successfully",
        package: await Package.getPackageById(id),
        token: req.newToken,
      });
    } catch (err) {
      console.error("Database error:", err);
      await Common.adminActivityLog(
        admin_id,
        "Package",
        "Update",
        "0",
        JSON.stringify({ id, ...changes }),
        err.message
      );
      res.status(500).json({ status: false, message: err.message });
    }
  },
];

// Controller to delete a package
exports.delete = [
  validateAdminAndToken,
  authorizeAdminAction("delete"),
  async (req, res) => {
    const { id, admin_id } = req.query;
    if (!id || !admin_id) {
      return res.status(400).json({
        status: false,
        message: `Missing required fields: ${!id ? "Package ID" : ""} ${
          !admin_id ? "Admin ID" : ""
        }`,
      });
    }

    try {
      const currentPackage = await Package.getPackageById(id);
      if (!currentPackage) {
        return res
          .status(404)
          .json({ status: false, message: "Package not found" });
      }

      await Package.delete(id);
      await Common.adminActivityLog(
        admin_id,
        "Package",
        "Delete",
        "1",
        null,
        JSON.stringify(currentPackage)
      );
      res.json({
        status: true,
        message: "Package deleted successfully",
        token: req.newToken,
      });
    } catch (err) {
      console.error("Database error:", err);
      await Common.adminActivityLog(
        admin_id,
        "Package",
        "Delete",
        "0",
        JSON.stringify({ id, ...currentPackage }),
        err.message
      );
      res.status(500).json({ status: false, message: err.message });
    }
  },
];
