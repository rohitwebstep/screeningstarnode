const express = require("express");
const cors = require("cors");
const adminRoutes = require("./routes/admin/indexRoutes");
const customerRoutes = require("./routes/customer/indexRoutes");
const branchRoutes = require("./routes/customer/branch/indexRoutes");
const packageRoutes = require("./routes/admin/packageRoutes");
const serviceRoutes = require("./routes/admin/serviceRoutes");

require("dotenv").config(); // Ensure you load environment variables

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

// Use express.json() instead of bodyParser.json()
app.use(express.json());

// Define routes
app.use("/admin", adminRoutes);
app.use("/customer", customerRoutes);
app.use("/branch", branchRoutes);
app.use("/package", packageRoutes);
app.use("/service", serviceRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
