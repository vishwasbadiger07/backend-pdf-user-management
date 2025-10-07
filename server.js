import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import multer from "multer";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ---- MongoDB Connection ----
mongoose
  .connect("mongodb://127.0.0.1:27017/mydb")
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ---- PDF Model ----
const PdfFile = mongoose.models.PdfFile || mongoose.model("PdfFile", new mongoose.Schema({
  filename: String,
  size: Number,
  uploadDate: { type: Date, default: Date.now },
}));

// ---- User Model ----
const User = mongoose.models.User || mongoose.model("User", new mongoose.Schema({
  name: String,
  email: String,
  password: String,
}));

// ---- MULTER Setup ----
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype;
    if (ext !== ".pdf" || mimeType !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed!"));
    }
    cb(null, true);
  },
});

// ---- Root Route (for live deployment) ----
app.get("/", (req, res) => {
  res.send("🚀 Backend is live! Use /users or /upload endpoints.");
});

// ---- Upload PDF ----
app.post("/upload", (req, res) => {
  upload.single("pdf")(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File too large! Max 10MB." });
      }
      return res.status(400).json({ message: "File upload error: " + err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded!" });
    }

    const pdfRecord = new PdfFile({
      filename: req.file.filename,
      size: req.file.size,
    });
    await pdfRecord.save();

    res.status(200).json({
      message: "✅ PDF uploaded successfully!",
      filename: req.file.filename,
      size: req.file.size,
    });
  });
});

// ---- Add User ----
app.post("/users", async (req, res) => {
  const { name, email, password } = req.body;
  const user = new User({ name, email, password });
  await user.save();
  res.status(201).json({ message: "✅ User added successfully!", user });
});

// ---- Start Server ----
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
