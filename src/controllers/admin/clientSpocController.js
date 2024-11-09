const ClientSpoc = require("../../models/admin/clientSpocModel");
const Common = require("../../models/admin/commonModel");

// Controller to create a new Client SPOC
exports.create = (req, res) => {
  const { name, designation, phone, email, admin_id, _token } = req.body;

  let missingFields = [];
  if (!name || name === "") missingFields.push("Name");
  if (!designation || designation === "") missingFields.push("designation");
  if (!admin_id || admin_id === "") missingFields.push("Admin ID");
  if (!_token || _token === "") missingFields.push("Token");
  if (!phone || phone === "") missingFields.push("Phone");
  if (!email || email === "") missingFields.push("Email");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ client_spocs: "create" });
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

      ClientSpoc.checkEmailExists(email, (err, emailExists) => {
        if (err) {
          console.error("Error checking email existence:", err);
          return res
            .status(500)
            .json({ status: false, message: "Internal server error" });
        }

        if (emailExists) {
          return res.status(401).json({
            status: false,
            message: "Email already used for another Client SPOC",
          });
        }

        const newToken = result.newToken;

        ClientSpoc.create(
          name,
          designation,
          phone,
          email,
          admin_id,
          (err, result) => {
            if (err) {
              console.error("Database error:", err);
              Common.adminActivityLog(
                admin_id,
                "Client SPOC",
                "Create",
                "0",
                null,
                err,
                () => {}
              );
              return res
                .status(500)
                .json({ status: false, message: err.message, token: newToken });
            }

            Common.adminActivityLog(
              admin_id,
              "Client SPOC",
              "Create",
              "1",
              `{id: ${result.insertId}}`,
              null,
              () => {}
            );

            res.json({
              status: true,
              message: "Client SPOC created successfully",
              client_spocs: result,
              token: newToken,
            });
          }
        );
      });
    });
  });
};

// Controller to list all Billing SPOCs
exports.list = (req, res) => {
  const { admin_id, _token } = req.query;

  let missingFields = [];
  if (!admin_id || admin_id === "") missingFields.push("Admin ID");
  if (!_token || _token === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }
  const action = JSON.stringify({ client_spocs: "view" });
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

      ClientSpoc.list((err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res
            .status(500)
            .json({ status: false, message: err.message, token: newToken });
        }

        res.json({
          status: true,
          message: "Billing SPOCs fetched successfully",
          client_spocs: result,
          totalResults: result.length,
          token: newToken,
        });
      });
    });
  });
};

exports.getClientSpocById = (req, res) => {
  const { id, admin_id, _token } = req.query;
  let missingFields = [];
  if (!id || id === "") missingFields.push("Client SPOC ID");
  if (!admin_id || admin_id === "") missingFields.push("Admin ID");
  if (!_token || _token === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }
  const action = JSON.stringify({ client_spocs: "view" });
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

      ClientSpoc.getClientSpocById(id, (err, currentClientSpoc) => {
        if (err) {
          console.error("Error fetching Client SPOC data:", err);
          return res.status(500).json({
            status: false,
            message: err.message,
            token: newToken,
          });
        }

        if (!currentClientSpoc) {
          return res.status(404).json({
            status: false,
            message: "Client SPOC not found",
            token: newToken,
          });
        }

        res.json({
          status: true,
          message: "Client SPOC retrieved successfully",
          client_spocs: currentClientSpoc,
          token: newToken,
        });
      });
    });
  });
};

// Controller to name a Client SPOC
exports.update = (req, res) => {
  const { id, name, designation, phone, email, admin_id, _token } = req.body;

  let missingFields = [];
  if (!id || id === "") missingFields.push("Client SPOC ID");
  if (!name || name === "") missingFields.push("Name");
  if (!designation || designation === "") missingFields.push("Description");
  if (!admin_id || admin_id === "") missingFields.push("Admin ID");
  if (!_token || _token === "") missingFields.push("Token");
  if (!phone || phone === "") missingFields.push("Phone");
  if (!email || email === "") missingFields.push("Email");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }
  const action = JSON.stringify({ client_spocs: "update" });
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

      ClientSpoc.getClientSpocById(id, (err, currentClientSpoc) => {
        if (err) {
          console.error("Error fetching Client SPOC data:", err);
          return res.status(500).json({
            status: false,
            message: err.message,
            token: newToken,
          });
        }

        const changes = {};
        if (currentClientSpoc.name !== name) {
          changes.name = {
            old: currentClientSpoc.name,
            new: name,
          };
        }
        if (currentClientSpoc.designation !== designation) {
          changes.designation = {
            old: currentClientSpoc.designation,
            new: designation,
          };
        }

        ClientSpoc.update(id, name, designation, phone, email, (err, result) => {
          if (err) {
            console.error("Database error:", err);
            Common.adminActivityLog(
              admin_id,
              "Client SPOC",
              "Update",
              "0",
              JSON.stringify({ id, ...changes }),
              err,
              () => {}
            );
            return res.status(500).json({
              status: false,
              message: err.message,
              token: newToken,
            });
          }

          Common.adminActivityLog(
            admin_id,
            "Client SPOC",
            "Update",
            "1",
            JSON.stringify({ id, ...changes }),
            null,
            () => {}
          );

          res.json({
            status: true,
            message: "Client SPOC named successfully",
            client_spocs: result,
            token: newToken,
          });
        });
      });
    });
  });
};

// Controller to delete a Client SPOC
exports.delete = (req, res) => {
  const { id, admin_id, _token } = req.query;

  let missingFields = [];
  if (!id || id === "") missingFields.push("Client SPOC ID");
  if (!admin_id || admin_id === "") missingFields.push("Admin ID");
  if (!_token || _token === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }
  const action = JSON.stringify({ client_spocs: "delete" });
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

      ClientSpoc.getClientSpocById(id, (err, currentClientSpoc) => {
        if (err) {
          console.error("Error fetching Client SPOC data:", err);
          return res.status(500).json({
            status: false,
            message: err.message,
            token: newToken,
          });
        }

        ClientSpoc.delete(id, (err, result) => {
          if (err) {
            console.error("Database error:", err);
            Common.adminActivityLog(
              admin_id,
              "Client SPOC",
              "Delete",
              "0",
              JSON.stringify({ id, ...currentClientSpoc }),
              err,
              () => {}
            );
            return res
              .status(500)
              .json({ status: false, message: err.message, token: newToken });
          }

          Common.adminActivityLog(
            admin_id,
            "Client SPOC",
            "Delete",
            "1",
            JSON.stringify(currentClientSpoc),
            null,
            () => {}
          );

          res.json({
            status: true,
            message: "Client SPOC deleted successfully",
            token: newToken,
          });
        });
      });
    });
  });
};
