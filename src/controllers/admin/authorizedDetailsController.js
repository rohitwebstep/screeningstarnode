const AuthorizedDetail = require("../../models/admin/authorizedDetailModel");
const Common = require("../../models/admin/commonModel");

// Controller to create a new billing escalation
exports.create = (req, res) => {
  const { title, designation, phone, email, admin_id, _token } = req.body;

  let missingFields = [];
  if (!title || title === "") missingFields.push("Title");
  if (!designation || designation === "") missingFields.push("Description");
  if (!admin_id || admin_id === "") missingFields.push("Admin ID");
  if (!_token || _token === "") missingFields.push("Token");
  if (!phone || phone === "") missingFields.push("Admin ID");
  if (!email || email === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ authorized_detail: "create" });
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

      AuthorizedDetail.checkEmailExists(email, (err, emailExists) => {
        if (err) {
          console.error("Error checking email existence:", err);
          return res
            .status(500)
            .json({ status: false, message: "Internal server error" });
        }

        if (emailExists) {
          return res.status(401).json({
            status: false,
            message: "Email already used for another billing escalation",
          });
        }

        const newToken = result.newToken;

        AuthorizedDetail.create(
          title,
          designation,
          phone,
          email,
          admin_id,
          (err, result) => {
            if (err) {
              console.error("Database error:", err);
              Common.adminActivityLog(
                admin_id,
                "Billing escalation",
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
              "Billing escalation",
              "Create",
              "1",
              `{id: ${result.insertId}}`,
              null,
              () => {}
            );

            res.json({
              status: true,
              message: "Billing escalation created successfully",
              authorized_detail: result,
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
  const action = JSON.stringify({ authorized_detail: "view" });
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

      AuthorizedDetail.list((err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res
            .status(500)
            .json({ status: false, message: err.message, token: newToken });
        }

        res.json({
          status: true,
          message: "Billing SPOCs fetched successfully",
          authorized_details: result,
          totalResults: result.length,
          token: newToken,
        });
      });
    });
  });
};

exports.getAuthorizedDetailById = (req, res) => {
  const { id, admin_id, _token } = req.query;
  let missingFields = [];
  if (!id || id === "") missingFields.push("Billing escalation ID");
  if (!admin_id || admin_id === "") missingFields.push("Admin ID");
  if (!_token || _token === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }
  const action = JSON.stringify({ authorized_detail: "view" });
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

      AuthorizedDetail.getAuthorizedDetailById(
        id,
        (err, currentAuthorizedDetail) => {
          if (err) {
            console.error("Error fetching billing escalation data:", err);
            return res.status(500).json({
              status: false,
              message: err.message,
              token: newToken,
            });
          }

          if (!currentAuthorizedDetail) {
            return res.status(404).json({
              status: false,
              message: "Billing escalation not found",
              token: newToken,
            });
          }

          res.json({
            status: true,
            message: "Billing escalation retrieved successfully",
            authorized_detail: currentAuthorizedDetail,
            token: newToken,
          });
        }
      );
    });
  });
};

// Controller to update a billing escalation
exports.update = (req, res) => {
  const { id, title, designation, phone, email, admin_id, _token } = req.body;

  let missingFields = [];
  if (!id || id === "") missingFields.push("Billing escalation ID");
  if (!title || title === "") missingFields.push("Title");
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
  const action = JSON.stringify({ authorized_detail: "update" });
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

      AuthorizedDetail.getAuthorizedDetailById(
        id,
        (err, currentAuthorizedDetail) => {
          if (err) {
            console.error("Error fetching billing escalation data:", err);
            return res.status(500).json({
              status: false,
              message: err.message,
              token: newToken,
            });
          }

          const changes = {};
          if (currentAuthorizedDetail.title !== title) {
            changes.title = {
              old: currentAuthorizedDetail.title,
              new: title,
            };
          }
          if (currentAuthorizedDetail.designation !== designation) {
            changes.designation = {
              old: currentAuthorizedDetail.designation,
              new: designation,
            };
          }

          AuthorizedDetail.update(
            id,
            title,
            designation,
            phone,
            email,
            (err, result) => {
              if (err) {
                console.error("Database error:", err);
                Common.adminActivityLog(
                  admin_id,
                  "Billing escalation",
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
                "Billing escalation",
                "Update",
                "1",
                JSON.stringify({ id, ...changes }),
                null,
                () => {}
              );

              res.json({
                status: true,
                message: "Billing escalation updated successfully",
                authorized_detail: result,
                token: newToken,
              });
            }
          );
        }
      );
    });
  });
};

// Controller to delete a billing escalation
exports.delete = (req, res) => {
  const { id, admin_id, _token } = req.query;

  let missingFields = [];
  if (!id || id === "") missingFields.push("Billing escalation ID");
  if (!admin_id || admin_id === "") missingFields.push("Admin ID");
  if (!_token || _token === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }
  const action = JSON.stringify({ authorized_detail: "delete" });
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

      AuthorizedDetail.getAuthorizedDetailById(
        id,
        (err, currentAuthorizedDetail) => {
          if (err) {
            console.error("Error fetching billing escalation data:", err);
            return res.status(500).json({
              status: false,
              message: err.message,
              token: newToken,
            });
          }

          AuthorizedDetail.delete(id, (err, result) => {
            if (err) {
              console.error("Database error:", err);
              Common.adminActivityLog(
                admin_id,
                "Billing escalation",
                "Delete",
                "0",
                JSON.stringify({ id, ...currentAuthorizedDetail }),
                err,
                () => {}
              );
              return res
                .status(500)
                .json({ status: false, message: err.message, token: newToken });
            }

            Common.adminActivityLog(
              admin_id,
              "Billing escalation",
              "Delete",
              "1",
              JSON.stringify(currentAuthorizedDetail),
              null,
              () => {}
            );

            res.json({
              status: true,
              message: "Billing escalation deleted successfully",
              token: newToken,
            });
          });
        }
      );
    });
  });
};
