const Service = require("../../models/admin/serviceModel");
const Common = require("../../models/admin/commonModel");

// Controller to create a new service
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

  const action = JSON.stringify({ service: "create" });
  Common.isAdminAuthorizedForAction(admin_id, action, (result) => {
    if (!result.status) {
      // Check the status returned by the authorization function
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
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

      Service.create(title, description, admin_id, (err, result) => {
        if (err) {
          console.error("Database error:", err);
          Common.adminActivityLog(
            admin_id,
            "Service",
            "Create",
            "0",
            null,
            err.message,
            () => {}
          );
          return res.status(500).json({ status: false, message: err.message });
        }

        Common.adminActivityLog(
          admin_id,
          "Service",
          "Create",
          "1",
          `{id: ${result.insertId}}`,
          null,
          () => {}
        );

        res.json({
          status: true,
          message: "Service created successfully",
          service: result,
          token: newToken,
        });
      });
    });
  });
};

// Controller to list all services
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
  const action = JSON.stringify({ service: "view" });
  Common.isAdminAuthorizedForAction(admin_id, action, (result) => {
    if (!result.status) {
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
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

      Service.list((err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ status: false, message: err.message });
        }

        res.json({
          status: true,
          message: "Services fetched successfully",
          services: result,
          totalResults: result.length,
          token: newToken,
        });
      });
    });
  });
};

exports.getServiceById = (req, res) => {
  const { id, admin_id, _token } = req.query;
  let missingFields = [];
  if (!id) missingFields.push("Service ID");
  if (!admin_id) missingFields.push("Admin ID");
  if (!_token) missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }
  const action = JSON.stringify({ service: "view" });
  Common.isAdminAuthorizedForAction(admin_id, action, (result) => {
    if (!result.status) {
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
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

      Service.getServiceById(id, (err, currentService) => {
        if (err) {
          console.error("Error fetching service data:", err);
          return res.status(500).json(err);
        }

        if (!currentService) {
          return res.status(404).json({
            status: false,
            message: "Service not found",
          });
        }

        res.json({
          status: true,
          message: "Service retrieved successfully",
          service: currentService,
          token: newToken,
        });
      });
    });
  });
};

// Controller to update a service
exports.update = (req, res) => {
  const { id, title, description, admin_id, _token } = req.body;

  let missingFields = [];
  if (!id) missingFields.push("Service ID");
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
  const action = JSON.stringify({ service: "update" });
  Common.isAdminAuthorizedForAction(admin_id, action, (result) => {
    if (!result.status) {
      // Check the status returned by the authorization function
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
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

      Service.getServiceById(id, (err, currentService) => {
        if (err) {
          console.error("Error fetching service data:", err);
          return res.status(500).json(err);
        }

        const changes = {};
        if (currentService.title !== title) {
          changes.title = {
            old: currentService.title,
            new: title,
          };
        }
        if (currentService.description !== description) {
          changes.description = {
            old: currentService.description,
            new: description,
          };
        }

        Service.update(id, title, description, (err, result) => {
          if (err) {
            console.error("Database error:", err);
            Common.adminActivityLog(
              admin_id,
              "Service",
              "Update",
              "0",
              JSON.stringify({ id, ...changes }),
              err.message,
              () => {}
            );
            return res
              .status(500)
              .json({ status: false, message: err.message });
          }

          Common.adminActivityLog(
            admin_id,
            "Service",
            "Update",
            "1",
            JSON.stringify({ id, ...changes }),
            null,
            () => {}
          );

          res.json({
            status: true,
            message: "Service updated successfully",
            service: result,
            token: newToken,
          });
        });
      });
    });
  });
};

// Controller to delete a service
exports.delete = (req, res) => {
  const { id, admin_id, _token } = req.query;

  let missingFields = [];
  if (!id) missingFields.push("Service ID");
  if (!admin_id) missingFields.push("Admin ID");
  if (!_token) missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }
  const action = JSON.stringify({ service: "delete" });
  Common.isAdminAuthorizedForAction(admin_id, action, (result) => {
    if (!result.status) {
      // Check the status returned by the authorization function
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
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

      Service.getServiceById(id, (err, currentService) => {
        if (err) {
          console.error("Error fetching service data:", err);
          return res.status(500).json(err);
        }

        Service.delete(id, (err, result) => {
          if (err) {
            console.error("Database error:", err);
            Common.adminActivityLog(
              admin_id,
              "Service",
              "Delete",
              "0",
              JSON.stringify({ id, ...currentService }),
              err.message,
              () => {}
            );
            return res
              .status(500)
              .json({ status: false, message: err.message });
          }

          Common.adminActivityLog(
            admin_id,
            "Service",
            "Delete",
            "1",
            JSON.stringify(currentService),
            null,
            () => {}
          );

          res.json({
            status: true,
            message: "Service deleted successfully",
            token: newToken,
          });
        });
      });
    });
  });
};
