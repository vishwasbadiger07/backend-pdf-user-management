import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

// ---- Ensure 'uploads' folder exists ----
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// ---- MongoDB Connection ----
mongoose.connect("mongodb://127.0.0.1:27017/mydb")
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ---- Schemas ----
const pdfSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  size: { type: Number, required: true },
  uploadDate: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

// ---- Models (safe to prevent OverwriteModelError) ----
const PdfFile = mongoose.models.PdfFile || mongoose.model("PdfFile", pdfSchema);
const User = mongoose.models.User || mongoose.model("User", userSchema);

// ---- Multer setup ----
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".pdf") return cb(new Error("Only PDF files are allowed!"));
    cb(null, true);
  }
});

// ---- PDF Upload Route ----
app.post("/upload", (req, res) => {
  upload.single("pdf")(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File too large! Maximum size is 10MB." });
      }
      return res.status(400).json({ message: "File upload error: " + err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded!" });
    }

    // Save metadata to MongoDB
    const pdfRecord = new PdfFile({
      filename: req.file.filename,
      size: req.file.size
    });
    await pdfRecord.save();

    res.status(200).json({
      message: "✅ PDF uploaded successfully!",
      filename: req.file.filename,
      size: req.file.size
    });
  });
});

// ---- User Creation Route ----
app.post("/users", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = new User({ name, email, password });
    await user.save();
    res.status(201).json({ message: "✅ User added successfully!", user });
  } catch (err) {
    res.status(400).json({ message: "Error creating user: " + err.message });
  }
});

// ---- Start Server ----
const PORT = 3000; // Change if needed
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
