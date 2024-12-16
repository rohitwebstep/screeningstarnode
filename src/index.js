const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config(); // Ensure you load environment variables

// Import routes
const adminRoutes = require("./routes/admin/indexRoutes");
const ticketRoutes = require("./routes/admin/ticketRoutes");
const userHistoryRoutes = require("./routes/admin/userHistory");
const clientMasterTrackerRoutes = require("./routes/admin/clientMasterTrackerRoutes");
const billingSpocRoutes = require("./routes/admin/billingSpocRoutes");
const billingEscalationRoutes = require("./routes/admin/billingEscalationRoutes");
const authorizedDetailRoutes = require("./routes/admin/authorizedDetailRoutes");
const escalationManagerRoutes = require("./routes/admin/escalationManagerRoutes");
const clientSpocRoutes = require("./routes/admin/clientSpocRoutes");
const generateInvoiceRoutes = require("./routes/admin/generateInvoiceRoutes");
const recordTrackerRoutes = require("./routes/admin/recordTrackerRoutes");
const invoiceMasterRoutes = require("./routes/admin/invoiceMasterRoutes");
const acknowledgementRoutes = require("./routes/admin/acknowledgementRoutes");
const externalLoginCredentials = require("./routes/admin/externalLoginCredentialsRoutes");
const customerRoutes = require("./routes/customer/indexRoutes");
const branchRoutes = require("./routes/customer/branch/indexRoutes");
const reportMasterRoutes = require("./routes/admin/reportMasterRoutes");
const dataManagementRoutes = require("./routes/admin/dataManagementRoutes");
const packageRoutes = require("./routes/admin/packageRoutes");
const serviceRoutes = require("./routes/admin/serviceRoutes");
const serviceGroupRoutes = require("./routes/admin/serviceGroupRoutes");
const holidayRoutes = require("./routes/admin/holidayRoutes");
const testRoutes = require("./routes/testRoutes");
const tatDelayRoutes = require("./routes/admin/tatDelayRoutes");
const notificationRoutes = require("./routes/admin/notificationRoutes");
const weeklyReportRoutes = require("./routes/admin/weeklyReportRoutes");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use("/uploads", express.static("uploads"));

// Define routes
app.use("/ticket", ticketRoutes);
app.use("/user-history", userHistoryRoutes);
app.use("/client-master-tracker", clientMasterTrackerRoutes);

// =====----- EMPLOYEE CREDENTIALS -----=====
app.use("/admin", adminRoutes);

// =====----- CLIENT MASTER DATA -----=====
app.use("/customer", customerRoutes);
app.use("/client-spoc", clientSpocRoutes);
app.use("/escalation-manager", escalationManagerRoutes);
app.use("/billing-spoc", billingSpocRoutes);
app.use("/billing-escalation", billingEscalationRoutes);
app.use("/authorized-detail", authorizedDetailRoutes);

// =====----- BILLING DASHBOARD -----=====
app.use("/generate-invoice", generateInvoiceRoutes);
app.use("/record-tracker", recordTrackerRoutes);
app.use("/invoice-master", invoiceMasterRoutes);

// =====----- REPORT MASTER -----=====
app.use("/report-master", reportMasterRoutes);

// =====----- DATA MANAGEMENT -----=====
app.use("/data-management", dataManagementRoutes);

app.use("/weekly-reports", weeklyReportRoutes);
app.use("/acknowledgement", acknowledgementRoutes);
app.use("/external-login-credentials", externalLoginCredentials);
app.use("/branch", branchRoutes);
app.use("/package", packageRoutes);
app.use("/service-group", serviceGroupRoutes);
app.use("/service", serviceRoutes);
app.use("/holiday", holidayRoutes);
app.use("/tat-delay", tatDelayRoutes);
app.use("/notification", notificationRoutes);
app.use("/test", testRoutes);

// Error handling middleware (optional)
app.use((err, req, res, next) => {
  console.error(err.stack); // Log error stack for debugging
  res.status(500).send("Something broke!"); // Send a generic error message
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
