const fs = require("fs");
const path = require("path");
const multer = require("multer");
const ftp = require("basic-ftp");

// Set up multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads"; // Original upload directory
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true }); // Create directory if it doesn't exist
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomNumber = Math.floor(Math.random() * 10000); // Random number
    const extension = path.extname(file.originalname); // Get the file extension
    const filename = `${timestamp}_${randomNumber}${extension}`; // Create filename
    cb(null, filename); // Return the filename
  },
});

// Create multer upload instance
const upload = multer({ storage: storage });

// Function to save a single image
const saveImage = (file, targetDir) => {
  return new Promise((resolve, reject) => {
    if (file) {
      const originalPath = path.join("uploads", file.filename); // Original file path
      const newPath = path.join(targetDir, file.filename); // New file path

      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true }); // Create directory if it doesn't exist
      }

      // Move the file to the new directory
      fs.rename(originalPath, newPath, (err) => {
        if (err) {
          console.error("Error renaming file:", err);
          return reject(err); // Reject on error
        }
        resolve(newPath); // Return the new file path
      });
    } else {
      reject(new Error("No file provided for saving."));
    }
  });
};

// Function to upload an image to Hostinger via FTP
const uploadToFtp = async (filePath) => {
  const client = new ftp.Client();
  client.ftp.verbose = true; // Enable verbose logging for FTP connection

  try {
    // Connect to FTP server (replace with your actual FTP details)
    await client.access({
      host: "ftp.webstepdev.com", // Replace with your FTP host
      user: "u510451310.screeningstarnode", // Replace with your FTP username
      password: "ScreeningStar@123", // Replace with your FTP password
      secure: false, // Set to true if using FTPS
    });

    const targetDir = path.dirname(filePath); // Get the directory path (e.g., "uploads/rohit")
    const filename = path.basename(filePath); // Get the filename (e.g., "1734421514518_5912.png")

    const dirs = targetDir.split(path.sep);
    for (const dir of dirs) {
      await client.ensureDir(dir); // Ensure each directory exists
    }

    // Upload the image file to Hostinger's public_html folder
    await client.uploadFrom(filePath, filename);
  } catch (err) {
    console.error("FTP upload failed:", err);
  } finally {
    client.close(); // Close the FTP connection
  }
};

// Function to save multiple images
const saveImages = async (files, targetDir) => {
  const savedImagePaths = [];
  for (const file of files) {
    const savedImagePath = await saveImage(file, targetDir); // Save each file
    savedImagePaths.push(savedImagePath);

    // Upload the saved image to Hostinger via FTP
    await uploadToFtp(savedImagePath); // FTP upload after saving locally
  }
  return savedImagePaths; // Return an array of saved image paths
};

// Exporting the upload middleware and saving functions
module.exports = {
  upload: upload.fields([
    { name: "images", maxCount: 10 },
    { name: "image", maxCount: 1 },
  ]),
  saveImage,
  saveImages,
};
