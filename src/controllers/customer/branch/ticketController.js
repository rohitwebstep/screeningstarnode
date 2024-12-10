const crypto = require("crypto");
const Branch = require("../../../models/customer/branch/branchModel");
const BranchCommon = require("../../../models/customer/branch/commonModel");
const AdminCommon = require("../../../models/admin/commonModel");
const Admin = require("../../../models/admin/adminModel");
const Customer = require("../../../models/customer/customerModel");
const Ticket = require("../../../models/customer/branch/ticketModel");

const {
  ticketRaised,
} = require("../../../mailer/customer/branch/ticket/ticketRaised");

const {
  ticketChat,
} = require("../../../mailer/customer/branch/ticket/ticketChat");

const generatePassword = (companyName) => {
  // Check if companyName is null, undefined, or has a length of 0
  if (!companyName || companyName.length < 1) {
    // Generate a random password if companyName is invalid
    return Math.random().toString(36).slice(-8) + "@123";
  }

  // Extract the first word (company name) and remove special characters
  const firstName = companyName.split(" ")[0].replace(/[^a-zA-Z0-9]/g, "");

  // Create the raw password and return the final password
  const rawPassword = firstName;
  return `${rawPassword}@123`;
};

exports.list = (req, res) => {
  const { branch_id, sub_user_id, _token } = req.query;

  // Validate required fields
  const missingFields = [];
  if (!branch_id) missingFields.push("Branch ID");
  if (!_token) missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const branchID = Number(branch_id);
  const subUserID = sub_user_id ? Number(sub_user_id) : null;

  // Retrieve branch details
  Branch.getBranchById(branchID, (err, currentBranch) => {
    if (err) {
      console.error("Error retrieving branch:", err);
      return res.status(500).json({
        status: false,
        message: "Error retrieving branch details. Please try again later.",
      });
    }

    if (!currentBranch) {
      return res.status(404).json({
        status: false,
        message: "Branch not found.",
      });
    }

    // Check branch authorization
    const action = "client_manager";
    BranchCommon.isBranchAuthorizedForAction(branchID, action, (authResult) => {
      if (!authResult.status) {
        return res.status(403).json({
          status: false,
          message: authResult.message,
        });
      }

      // Validate branch token
      BranchCommon.isBranchTokenValid(
        _token,
        subUserID || null,
        branchID,
        (tokenErr, tokenResult) => {
          if (tokenErr) {
            console.error("Error validating token:", tokenErr);
            return res.status(500).json({
              status: false,
              message: "Token validation error. Please try again later.",
            });
          }

          if (!tokenResult.status) {
            return res.status(401).json({
              status: false,
              message: tokenResult.message,
            });
          }

          const newToken = tokenResult.newToken;

          Ticket.list(branch_id, (err, result) => {
            if (err) {
              console.error("Database error:", err);
              return res.status(500).json({
                status: false,
                message: err.message,
                token: newToken,
              });
            }

            res.json({
              status: true,
              message: "Tickets fetched successfully",
              branches: result,
              totalResults: result.length,
              token: newToken,
            });
          });
        }
      );
    });
  });
};

exports.view = (req, res) => {
  const { ticket_number, branch_id, sub_user_id, _token } = req.query;

  // Validate required fields
  const missingFields = [];
  if (!branch_id) missingFields.push("Branch ID");
  if (!_token) missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const branchID = Number(branch_id);
  const subUserID = sub_user_id ? Number(sub_user_id) : null;

  // Retrieve branch details
  Branch.getBranchById(branchID, (err, currentBranch) => {
    if (err) {
      console.error("Error retrieving branch:", err);
      return res.status(500).json({
        status: false,
        message: "Error retrieving branch details. Please try again later.",
      });
    }

    if (!currentBranch) {
      return res.status(404).json({
        status: false,
        message: "Branch not found.",
      });
    }

    // Check branch authorization
    const action = "client_manager";
    BranchCommon.isBranchAuthorizedForAction(branchID, action, (authResult) => {
      if (!authResult.status) {
        return res.status(403).json({
          status: false,
          message: authResult.message,
        });
      }

      // Validate branch token
      BranchCommon.isBranchTokenValid(
        _token,
        subUserID || null,
        branchID,
        (tokenErr, tokenResult) => {
          if (tokenErr) {
            console.error("Error validating token:", tokenErr);
            return res.status(500).json({
              status: false,
              message: "Token validation error. Please try again later.",
            });
          }

          if (!tokenResult.status) {
            return res.status(401).json({
              status: false,
              message: tokenResult.message,
            });
          }

          const newToken = tokenResult.newToken;

          Ticket.getTicketDataByTicketNumber(
            ticket_number,
            branch_id,
            (err, result) => {
              if (err) {
                console.error("Database error:", err);
                return res.status(500).json({
                  status: false,
                  message: err.message,
                  token: newToken,
                });
              }

              res.json({
                status: true,
                message: "Tickets fetched successfully",
                branches: result,
                totalResults: result.length,
                token: newToken,
              });
            }
          );
        }
      );
    });
  });
};

exports.chat = (req, res) => {
  const { ticket_number, branch_id, sub_user_id, _token, message } = req.body;

  // Validate required fields
  const missingFields = [];
  if (!branch_id) missingFields.push("Branch ID");
  if (!_token) missingFields.push("Token");
  if (!ticket_number) missingFields.push("Ticket Number");
  if (!message) missingFields.push("Message");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const branchID = Number(branch_id);
  const subUserID = sub_user_id ? Number(sub_user_id) : null;

  // Retrieve branch details
  Branch.getBranchById(branchID, (err, currentBranch) => {
    if (err) {
      console.error("Error retrieving branch:", err);
      return res.status(500).json({
        status: false,
        message: "Error retrieving branch details. Please try again later.",
      });
    }

    if (!currentBranch) {
      return res.status(404).json({
        status: false,
        message: "Branch not found.",
      });
    }

    // Retrieve customer details
    Customer.getCustomerById(
      parseInt(currentBranch.customer_id),
      (err, currentCustomer) => {
        if (err) {
          console.error("Database error during customer retrieval:", err);
          return res.status(500).json({
            status: false,
            message: "Failed to retrieve Customer. Please try again.",
          });
        }

        if (!currentCustomer) {
          return res.status(404).json({
            status: false,
            message: "Customer not found.",
          });
        }

        // Check branch authorization
        const action = "client_manager";
        BranchCommon.isBranchAuthorizedForAction(
          branchID,
          action,
          (authResult) => {
            if (!authResult.status) {
              return res.status(403).json({
                status: false,
                message: authResult.message,
              });
            }

            // Validate branch token
            BranchCommon.isBranchTokenValid(
              _token,
              subUserID || null,
              branchID,
              (tokenErr, tokenResult) => {
                if (tokenErr) {
                  console.error("Error validating token:", tokenErr);
                  return res.status(500).json({
                    status: false,
                    message: "Token validation error. Please try again later.",
                  });
                }

                if (!tokenResult.status) {
                  return res.status(401).json({
                    status: false,
                    message: tokenResult.message,
                  });
                }

                const newToken = tokenResult.newToken;

                // Create a new ticket
                Ticket.chat(
                  {
                    ticket_number,
                    branch_id: currentBranch.id,
                    customer_id: currentBranch.customer_id,
                    message,
                  },
                  (createErr, createResult) => {
                    if (createErr) {
                      console.error("Error creating ticket:", createErr);

                      // Log the failed activity
                      BranchCommon.branchActivityLog(
                        branchID,
                        "Ticket",
                        "Create",
                        "0",
                        null,
                        createErr.message,
                        () => {}
                      );

                      return res.status(500).json({
                        status: false,
                        message:
                          "Error creating ticket. Please try again later.",
                        token: newToken,
                      });
                    }

                    // Log the successful activity
                    BranchCommon.branchActivityLog(
                      branchID,
                      "Ticket",
                      "Reply",
                      "1",
                      `{ticket: ${ticket_number}}`,
                      null,
                      () => {}
                    );

                    // Retrieve admins and send email
                    Admin.list((err, adminResult) => {
                      if (err) {
                        console.error("Database error:", err);
                        return res.status(500).json({
                          status: false,
                          message: "Error retrieving admin details.",
                          token: newToken,
                        });
                      }

                      // Extract admin emails
                      const toArr = adminResult.map((admin) => ({
                        name: admin.name,
                        email: admin.email,
                      }));

                      // Notify admins about the raised ticket
                      ticketChat(
                        "Ticket",
                        "branch-chat",
                        currentBranch.name,
                        currentCustomer.name,
                        ticket_number,
                        createResult.title,
                        createResult.description,
                        message,
                        createResult.created_at,
                        toArr
                      )
                        .then(() => {
                          return res.status(201).json({
                            status: true,
                            message: `Message has been sent for ticket number ${ticket_number}`,
                            token: newToken,
                          });
                        })
                        .catch((emailError) => {
                          console.error("Error sending email:", emailError);
                          BranchCommon.branchActivityLog(
                            branchID,
                            "Ticket",
                            "chat",
                            "0",
                            emailError.message || "N/A",
                            () => {}
                          );
                          return res.status(500).json({
                            status: false,
                            message:
                              "Failed to send message for ticket number, but email notification was unsuccessful.",
                            token: newToken,
                          });
                        });
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
};

exports.create = (req, res) => {
  const { branch_id, sub_user_id, _token, title, description } = req.body;

  // Validate required fields
  const missingFields = [];
  if (!branch_id) missingFields.push("Branch ID");
  if (!_token) missingFields.push("Token");
  if (!title) missingFields.push("Title");
  if (!description) missingFields.push("Description");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const branchID = Number(branch_id);
  const subUserID = sub_user_id ? Number(sub_user_id) : null;

  // Retrieve branch details
  Branch.getBranchById(branchID, (err, currentBranch) => {
    if (err) {
      console.error("Error retrieving branch:", err);
      return res.status(500).json({
        status: false,
        message: "Error retrieving branch details. Please try again later.",
      });
    }

    if (!currentBranch) {
      return res.status(404).json({
        status: false,
        message: "Branch not found.",
      });
    }

    // Retrieve customer details
    Customer.getCustomerById(
      parseInt(currentBranch.customer_id),
      (err, currentCustomer) => {
        if (err) {
          console.error("Database error during customer retrieval:", err);
          return res.status(500).json({
            status: false,
            message: "Failed to retrieve Customer. Please try again.",
          });
        }

        if (!currentCustomer) {
          return res.status(404).json({
            status: false,
            message: "Customer not found.",
          });
        }

        // Check branch authorization
        const action = "client_manager";
        BranchCommon.isBranchAuthorizedForAction(
          branchID,
          action,
          (authResult) => {
            if (!authResult.status) {
              return res.status(403).json({
                status: false,
                message: authResult.message,
              });
            }

            // Validate branch token
            BranchCommon.isBranchTokenValid(
              _token,
              subUserID || null,
              branchID,
              (tokenErr, tokenResult) => {
                if (tokenErr) {
                  console.error("Error validating token:", tokenErr);
                  return res.status(500).json({
                    status: false,
                    message: "Token validation error. Please try again later.",
                  });
                }

                if (!tokenResult.status) {
                  return res.status(401).json({
                    status: false,
                    message: tokenResult.message,
                  });
                }

                const newToken = tokenResult.newToken;

                // Create a new ticket
                Ticket.create(
                  {
                    branch_id: currentBranch.id,
                    customer_id: currentBranch.customer_id,
                    title,
                    description,
                  },
                  (createErr, createResult) => {
                    if (createErr) {
                      console.error("Error creating ticket:", createErr);

                      // Log the failed activity
                      BranchCommon.branchActivityLog(
                        branchID,
                        "Ticket",
                        "Create",
                        "0",
                        null,
                        createErr.message,
                        () => {}
                      );

                      return res.status(500).json({
                        status: false,
                        message:
                          "Error creating ticket. Please try again later.",
                        token: newToken,
                      });
                    }

                    // Log the successful activity
                    BranchCommon.branchActivityLog(
                      branchID,
                      "Ticket",
                      "Create",
                      "1",
                      `{ticket: ${createResult.ticketNumber}}`,
                      null,
                      () => {}
                    );

                    // Retrieve admins and send email
                    Admin.list((err, adminResult) => {
                      if (err) {
                        console.error("Database error:", err);
                        return res.status(500).json({
                          status: false,
                          message: "Error retrieving admin details.",
                          token: newToken,
                        });
                      }

                      // Extract admin emails
                      const toArr = adminResult.map((admin) => ({
                        name: admin.name,
                        email: admin.email,
                      }));

                      // Notify admins about the raised ticket
                      ticketRaised(
                        "Ticket",
                        "raised",
                        currentBranch.name,
                        currentCustomer.name,
                        createResult.ticketNumber,
                        title,
                        description,
                        toArr
                      )
                        .then(() => {
                          return res.status(201).json({
                            status: true,
                            message: `Your ticket number is ${createResult.ticketNumber}`,
                            token: newToken,
                          });
                        })
                        .catch((emailError) => {
                          console.error("Error sending email:", emailError);
                          BranchCommon.branchActivityLog(
                            branchID,
                            "Ticket",
                            "Create",
                            "0",
                            emailError.message || "N/A",
                            () => {}
                          );
                          return res.status(500).json({
                            status: true,
                            message:
                              "Failed to generate ticket but email notification was unsuccessful.",
                            token: newToken,
                          });
                        });
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
};

exports.upload = (req, res) => {
  const { sub_user_id, branch_id, _token } = req.query;

  // Validate required fields
  const missingFields = [];
  if (!branch_id) missingFields.push("Branch ID");
  if (!_token) missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  // Verify the branch token
  BranchCommon.isBranchTokenValid(
    _token,
    sub_user_id || null,
    branch_id,
    (tokenErr, tokenResult) => {
      if (tokenErr) {
        console.error("Error checking token validity:", tokenErr);
        return res.status(500).json({
          status: false,
          message: tokenErr,
        });
      }

      if (!tokenResult.status) {
        return res.status(401).json({
          status: false,
          message: tokenResult.message,
        });
      }

      const newToken = tokenResult.newToken;

      // Step 3: Fetch client applications from database
      Branch.index(branch_id, (dbErr, clientApplications) => {
        if (dbErr) {
          console.error("Database error:", dbErr);
          return res.status(500).json({
            status: false,
            message: "An error occurred while fetching client applications.",
            token: newToken,
          });
        }

        // Calculate total application count
        const totalApplicationCount = clientApplications
          ? Object.values(clientApplications).reduce((total, statusGroup) => {
              return total + statusGroup.applicationCount;
            }, 0)
          : 0;

        return res.status(200).json({
          status: true,
          message: "Client applications fetched successfully.",
          clientApplications,
          totalApplicationCount,
          token: newToken,
        });
      });
    }
  );
};

// Controller to update a branch
exports.update = (req, res) => {
  const { id, name, email, admin_id, _token } = req.body;

  // Validate required fields
  const missingFields = [];
  if (!id || id === "") missingFields.push("Branch ID");
  if (!name || name === "") missingFields.push("Name");
  if (!email || email === "") missingFields.push("Email");
  if (!admin_id || admin_id === "") missingFields.push("Admin ID");
  if (!_token || _token === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = "client_overview";

  // Check admin authorization
  AdminCommon.isAdminAuthorizedForAction(admin_id, action, (result) => {
    if (!result.status) {
      // Check the status returned by the authorization function
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }

    // Validate admin token
    AdminCommon.isAdminTokenValid(
      _token,
      admin_id,
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
        const password = generatePassword(name);

        // Fetch the current branch
        Branch.getBranchById(id, (err, currentBranch) => {
          if (err) {
            console.error("Database error during branch retrieval:", err);
            return res.status(500).json({
              status: false,
              message: "Failed to retrieve Branch. Please try again.",
              token: newToken,
            });
          }

          if (!currentBranch) {
            return res.status(404).json({
              status: false,
              message: "Branch not found.",
              token: newToken,
            });
          }

          // Check if the branch is the head branch
          if (currentBranch.is_head == 1) {
            return res.status(403).json({
              status: false,
              message: "Cannot update the head branch.",
              token: newToken,
            });
          }

          const changes = {};
          if (currentBranch.name !== name) {
            changes.name = { old: currentBranch.name, new: name };
          }
          if (currentBranch.email !== email) {
            changes.email = {
              old: currentBranch.email,
              new: email,
            };
          }

          // Update the branch
          Branch.update(id, name, email, password, (err, result) => {
            if (err) {
              console.error("Database error during branch update:", err);
              BranchCommon.branchActivityLog(
                admin_id,
                "Branch",
                "Update",
                "0",
                JSON.stringify({ id, ...changes }),
                err,
                () => {}
              );
              return res.status(500).json({
                status: false,
                message: "Failed to update Branch. Please try again.",
                token: newToken,
              });
            }

            BranchCommon.branchActivityLog(
              admin_id,
              "Branch",
              "Update",
              "1",
              JSON.stringify({ id, ...changes }),
              null,
              () => {}
            );

            res.status(200).json({
              status: true,
              message: "Branch updated successfully.",
              branch: result,
              token: newToken,
            });
          });
        });
      }
    );
  });
};

exports.delete = (req, res) => {
  const { ticket_number, branch_id, sub_user_id, _token } = req.query;
  // Validate required fields
  const missingFields = [];
  if (!branch_id) missingFields.push("Branch ID");
  if (!_token) missingFields.push("Token");
  if (!ticket_number) missingFields.push("Ticket Number");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const branchID = Number(branch_id);
  const subUserID = sub_user_id ? Number(sub_user_id) : null;

  // Retrieve branch details
  Branch.getBranchById(branchID, (err, currentBranch) => {
    if (err) {
      console.error("Error retrieving branch:", err);
      return res.status(500).json({
        status: false,
        message: "Error retrieving branch details. Please try again later.",
      });
    }

    if (!currentBranch) {
      return res.status(404).json({
        status: false,
        message: "Branch not found.",
      });
    }

    // Retrieve customer details
    Customer.getCustomerById(
      parseInt(currentBranch.customer_id),
      (err, currentCustomer) => {
        if (err) {
          console.error("Database error during customer retrieval:", err);
          return res.status(500).json({
            status: false,
            message: "Failed to retrieve Customer. Please try again.",
          });
        }

        if (!currentCustomer) {
          return res.status(404).json({
            status: false,
            message: "Customer not found.",
          });
        }

        // Check branch authorization
        const action = "client_manager";
        BranchCommon.isBranchAuthorizedForAction(
          branchID,
          action,
          (authResult) => {
            if (!authResult.status) {
              return res.status(403).json({
                status: false,
                message: authResult.message,
              });
            }

            // Validate branch token
            BranchCommon.isBranchTokenValid(
              _token,
              subUserID || null,
              branchID,
              (tokenErr, tokenResult) => {
                if (tokenErr) {
                  console.error("Error validating token:", tokenErr);
                  return res.status(500).json({
                    status: false,
                    message: "Token validation error. Please try again later.",
                  });
                }

                if (!tokenResult.status) {
                  return res.status(401).json({
                    status: false,
                    message: tokenResult.message,
                  });
                }

                const newToken = tokenResult.newToken;

                // Create a new ticket
                Ticket.delete(ticket_number, branch_id, (err, result) => {
                  if (err) {
                    console.error(
                      "Database error during ticket deletion:",
                      err
                    );
                    BranchCommon.branchActivityLog(
                      branch_id,
                      "Ticket",
                      "Delete",
                      "0",
                      JSON.stringify({ ticket: ticket_number }),
                      err,
                      () => {}
                    );
                    return res.status(500).json({
                      status: false,
                      message: "Failed to delete ticket. Please try again.",
                      token: newToken,
                    });
                  }

                  BranchCommon.branchActivityLog(
                    branch_id,
                    "Ticket",
                    "Delete",
                    "1",
                    JSON.stringify({ ticket: ticket_number }),
                    null,
                    () => {}
                  );

                  res.status(200).json({
                    status: true,
                    message: "Ticket deleted successfully.",
                    token: newToken,
                  });
                });
              }
            );
          }
        );
      }
    );
  });
};
