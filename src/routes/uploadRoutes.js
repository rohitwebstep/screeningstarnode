const express = require("express");
const path = require("path");
const app = express();

// Serve static files from the 'uploads/customers' directory
app.use(
  "/customers",
  express.static(path.join(__dirname, "uploads/customers"))
);
