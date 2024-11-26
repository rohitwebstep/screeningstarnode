const NotificationModel = require("../../models/admin/notificationsModel");
const ClientApplication = require("../../models/customer/branch/clientApplicationModel");
const Common = require("../../models/admin/commonModel");

// Controller to list all tatDelays
exports.index = (req, res) => {
  try {
    const { YWRtaW5faWQ } = req.query;

    // Validate if the admin_id query parameter is provided
    if (!YWRtaW5faWQ) {
      return res.status(400).json({
        status: false,
        message: "Missing required field: admin_id",
      });
    }

    // Decode the Base64 encoded admin ID and parse it
    const decodedAdminId = Buffer.from(YWRtaW5faWQ, "base64").toString("utf8");
    const adminIdNumber = parseFloat(decodedAdminId);
    const adminId = adminIdNumber / 1.5;

    // Check if adminId is valid
    if (isNaN(adminId) || !adminId) {
      return res.status(400).json({
        status: false,
        message: "Invalid admin ID provided.",
      });
    }

    let newApplicationStatus = false;
    let tatDelayStatus = false;

    // Authorization actions
    const tatDelayAction = JSON.stringify({ tat_delay: "view" });
    const newApplicationsAction = JSON.stringify({
      cmt_application: "generate_report",
    });

    // Check authorization for new applications
    Common.isAdminAuthorizedForAction(
      adminId,
      newApplicationsAction,
      (authResult) => {
        if (!authResult.status) {
          return res.status(403).json({
            status: false,
            message: authResult.message,
          });
        }
        newApplicationStatus = true; // Set true if authorized
      }
    );

    // Check authorization for tat delay actions
    Common.isAdminAuthorizedForAction(adminId, tatDelayAction, (authResult) => {
      if (!authResult.status) {
        return res.status(403).json({
          status: false,
          message: authResult.message,
        });
      }
      tatDelayStatus = true; // Set true if authorized
    });

    // Fetch TAT delay list
    NotificationModel.index((notificationErr, notificationResult) => {
      if (notificationErr) {
        console.error("TAT Delay List Error:", notificationErr);
        return res.status(500).json({
          status: false,
          message: "Error fetching TAT delay list.",
        });
      }

      // Filter notifications based on authorization
      if (!tatDelayStatus) {
        notificationResult.tatDelayList = [];
      }

      if (!newApplicationStatus) {
        notificationResult.newApplications = [];
      }

      return res.status(200).json({
        status: true,
        message: "Data fetched successfully.",
        data: notificationResult,
        totalNotifications: notificationResult.length,
      });
    });
  } catch (error) {
    console.error("Unexpected Error:", error);
    res.status(500).json({
      status: false,
      message: "An unexpected error occurred.",
    });
  }
};
