const Client = require("../../../models/customer/branch/clientApplicationModel");
const Common = require("../../../models/customer/branch/commonModel");
const { sendEmail } = require("../../../mailer/clientMailer");

// Controller to create a new client
exports.create = (req, res) => {
  const { title, description, branch_id, _token } = req.body;

  // Validate required fields
  const missingFields = [];
  if (!title || title === "") missingFields.push("Title");
  if (!description || description === "") missingFields.push("Description");
  if (!branch_id || branch_id === "") missingFields.push("Branch ID");
  if (!_token || _token === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ client: "create" });

  // Check branch authorization
  Common.isBranchAuthorizedForAction(branch_id, action, (result) => {
    if (!result.status) {
      // Check the status returned by the authorization function
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }

    // Validate branch token
    Common.isBranchTokenValid(
      _token,
      branch_id,
      (err, tokenValidationResult) => {
        if (err) {
          console.error("Token validation error:", err);
          return res.status(500).json({
            status: false,
            message: err.message,
          });
        }

        if (!tokenValidationResult.status) {
          return res.status(401).json({
            status: false,
            message: tokenValidationResult.message,
          });
        }

        const newToken = tokenValidationResult.newToken;

        // Create client
        Client.create(title, description, branch_id, (err, result) => {
          if (err) {
            console.error("Database error during client creation:", err);
            Common.branchActivityLog(
              branch_id,
              "Client",
              "Create",
              "0",
              null,
              err.message,
              () => {}
            );
            return res.status(500).json({
              status: false,
              message: "Failed to create Client. Please try again.",
              token: newToken,
            });
          }

          Common.branchActivityLog(
            branch_id,
            "Client",
            "Create",
            "1",
            `{id: ${result.insertId}}`,
            null,
            () => {}
          );
          // Fetch branch and customer emails
          Common.getBranchandCustomerEmailsForNotification(
            branch_id,
            (emailError, emailData) => {
              if (emailError) {
                console.error("Error fetching emails:", emailError);
                return res.status(500).json({
                  status: false,
                  message: "Failed to retrieve email addresses.",
                  token: newToken,
                });
              }

              const { branch, customer } = emailData;

              const toArr = [{ name: branch.name, email: branch.email }];
              const ccArr = customer.emails
                .split(",")
                .map((email) => ({ name: customer.name, email: email.trim() }));

              // Send email notification
              sendEmail(
                "candidate application",
                "create",
                title,
                [], // Pass services array if needed
                toArr,
                ccArr
              )
                .then(() => {
                  res.json({
                    status: true,
                    message:
                      "Customer and branches created successfully, and email sent.",
                    data: {
                      customer: result,
                      meta: metaResult,
                      branches: branchResults,
                    },
                    token: newToken,
                  });
                })
                .catch((emailError) => {
                  console.error("Error sending email:", emailError);
                  res.status(201).json({
                    status: true,
                    message: "Client created successfully.",
                    client: result,
                    token: newToken,
                  });
                });
            }
          );
        });
      }
    );
  });
};

// Controller to list all clients
exports.list = (req, res) => {
  const { branch_id, _token } = req.query;

  let missingFields = [];
  if (!branch_id || branch_id === "") missingFields.push("Branch ID");
  if (!_token || _token === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }
  const action = JSON.stringify({ client: "view" });
  BranchCommon.isBranchAuthorizedForAction(branch_id, action, (result) => {
    if (!result.status) {
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }
    Common.isBranchTokenValid(_token, branch_id, (err, result) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json(err);
      }

      if (!result.status) {
        return res.status(401).json({ status: false, message: result.message });
      }

      const newToken = result.newToken;

      Client.list((err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res
            .status(500)
            .json({ status: false, message: err.message, token: newToken });
        }

        res.json({
          status: true,
          message: "Clients fetched successfully",
          clients: result,
          totalResults: result.length,
          token: newToken,
        });
      });
    });
  });
};

// Controller to get a client by ID
exports.getClientById = (req, res) => {
  const { id, branch_id, _token } = req.query;
  let missingFields = [];
  if (!id || id === "") missingFields.push("Client ID");
  if (!branch_id || branch_id === "") missingFields.push("Branch ID");
  if (!_token || _token === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }
  const action = JSON.stringify({ client: "view" });
  BranchCommon.isBranchAuthorizedForAction(branch_id, action, (result) => {
    if (!result.status) {
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }
    Common.isBranchTokenValid(_token, branch_id, (err, result) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json(err);
      }

      if (!result.status) {
        return res.status(401).json({ status: false, message: result.message });
      }

      const newToken = result.newToken;

      Client.getClientById(id, (err, currentClient) => {
        if (err) {
          console.error("Error fetching client data:", err);
          return res.status(500).json({
            status: false,
            message: err,
            token: newToken,
          });
        }

        if (!currentClient) {
          return res.status(404).json({
            status: false,
            message: "Client not found",
            token: newToken,
          });
        }

        res.json({
          status: true,
          message: "Client retrieved successfully",
          client: currentClient,
          token: newToken,
        });
      });
    });
  });
};

// Controller to update a client
exports.update = (req, res) => {
  const { id, title, description, branch_id, _token } = req.body;

  // Validate required fields
  const missingFields = [];
  if (!id || id === "") missingFields.push("Client ID");
  if (!title || title === "") missingFields.push("Title");
  if (!description || description === "") missingFields.push("Description");
  if (!branch_id || branch_id === "") missingFields.push("Branch ID");
  if (!_token || _token === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ client: "update" });

  // Check branch authorization
  Common.isBranchAuthorizedForAction(branch_id, action, (result) => {
    if (!result.status) {
      // Check the status returned by the authorization function
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }

    // Validate branch token
    Common.isBranchTokenValid(
      _token,
      branch_id,
      (err, tokenValidationResult) => {
        if (err) {
          console.error("Token validation error:", err);
          return res.status(500).json({
            status: false,
            message: err.message,
          });
        }

        if (!tokenValidationResult.status) {
          return res.status(401).json({
            status: false,
            message: tokenValidationResult.message,
          });
        }

        const newToken = tokenValidationResult.newToken;

        // Fetch the current client
        Client.getClientById(id, (err, currentClient) => {
          if (err) {
            console.error("Database error during client retrieval:", err);
            return res.status(500).json({
              status: false,
              message: "Failed to retrieve Client. Please try again.",
              token: newToken,
            });
          }

          if (!currentClient) {
            return res.status(404).json({
              status: false,
              message: "Client not found.",
              token: newToken,
            });
          }

          const changes = {};
          if (currentClient.title !== title) {
            changes.title = { old: currentClient.title, new: title };
          }
          if (currentClient.description !== description) {
            changes.description = {
              old: currentClient.description,
              new: description,
            };
          }

          // Update the client
          Client.update(id, title, description, (err, result) => {
            if (err) {
              console.error("Database error during client update:", err);
              Common.branchActivityLog(
                branch_id,
                "Client",
                "Update",
                "0",
                JSON.stringify({ id, ...changes }),
                err.message,
                () => {}
              );
              return res.status(500).json({
                status: false,
                message: "Failed to update Client. Please try again.",
                token: newToken,
              });
            }

            Common.branchActivityLog(
              branch_id,
              "Client",
              "Update",
              "1",
              JSON.stringify({ id, ...changes }),
              null,
              () => {}
            );

            res.status(200).json({
              status: true,
              message: "Client updated successfully.",
              client: result,
              token: newToken,
            });
          });
        });
      }
    );
  });
};

// Controller to delete a client
exports.delete = (req, res) => {
  const { id, branch_id, _token } = req.query;

  // Validate required fields
  const missingFields = [];
  if (!id || id === "") missingFields.push("Client ID");
  if (!branch_id || branch_id === "") missingFields.push("Branch ID");
  if (!_token || _token === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ client: "delete" });

  // Check branch authorization
  Common.isBranchAuthorizedForAction(branch_id, action, (result) => {
    if (!result.status) {
      // Check the status returned by the authorization function
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }

    // Validate branch token
    Common.isBranchTokenValid(
      _token,
      branch_id,
      (err, tokenValidationResult) => {
        if (err) {
          console.error("Token validation error:", err);
          return res.status(500).json({
            status: false,
            message: err.message,
          });
        }

        if (!tokenValidationResult.status) {
          return res.status(401).json({
            status: false,
            message: tokenValidationResult.message,
          });
        }

        const newToken = tokenValidationResult.newToken;

        // Fetch the current client
        Client.getClientById(id, (err, currentClient) => {
          if (err) {
            console.error("Database error during client retrieval:", err);
            return res.status(500).json({
              status: false,
              message: "Failed to retrieve Client. Please try again.",
              token: newToken,
            });
          }

          if (!currentClient) {
            return res.status(404).json({
              status: false,
              message: "Client not found.",
              token: newToken,
            });
          }

          // Delete the client
          Client.delete(id, (err, result) => {
            if (err) {
              console.error("Database error during client deletion:", err);
              Common.branchActivityLog(
                branch_id,
                "Client",
                "Delete",
                "0",
                JSON.stringify({ id }),
                err.message,
                () => {}
              );
              return res.status(500).json({
                status: false,
                message: "Failed to delete Client. Please try again.",
                token: newToken,
              });
            }

            Common.branchActivityLog(
              branch_id,
              "Client",
              "Delete",
              "1",
              JSON.stringify({ id }),
              null,
              () => {}
            );

            res.status(200).json({
              status: true,
              message: "Client deleted successfully.",
              result,
              token: newToken,
            });
          });
        });
      }
    );
  });
};
