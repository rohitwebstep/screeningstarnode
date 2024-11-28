const NotificationModel = require("../../models/admin/notificationsModel");
const Common = require("../../models/admin/commonModel");

exports.index = async (req, res) => {
  try {
    const { YWRtaW5faWQ } = req.query;

    if (!YWRtaW5faWQ) {
      return res.status(400).json({
        status: false,
        message: "Missing required field: admin_id",
      });
    }

    const decodedAdminId = Buffer.from(YWRtaW5faWQ, "base64").toString("utf8");
    const adminIdNumber = parseFloat(decodedAdminId);
    const adminId = adminIdNumber / 1.5;

    if (isNaN(adminId) || !adminId) {
      return res.status(400).json({
        status: false,
        message: "Invalid admin ID provided.",
      });
    }

    const tatDelayAction = JSON.stringify({ tat_delay: "view" });
    const newApplicationsAction = JSON.stringify({
      cmt_application: "generate_report",
    });

    // Wrap authorization checks in promises
    const isAuthorized = (adminId, action) =>
      new Promise((resolve) => {
        Common.isAdminAuthorizedForAction(adminId, action, (authResult) =>
          resolve(authResult.status)
        );
      });

    // Perform both authorization checks concurrently
    const [newApplicationStatus, tatDelayStatus] = await Promise.all([
      isAuthorized(adminId, newApplicationsAction),
      isAuthorized(adminId, tatDelayAction),
    ]);

    // Fetch TAT delay list
    NotificationModel.index((notificationErr, notificationResult) => {
      if (notificationErr) {
        console.error("TAT Delay List Error:", notificationErr);
        return res.status(500).json({
          status: false,
          message: "Error fetching TAT delay list.",
        });
      }

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
