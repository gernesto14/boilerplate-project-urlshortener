import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import validator from "validator";
import validUrl from "valid-url";

const app = express();
// Basic Configuration
const port = process.env.PORT;

// Parse URL-encoded data from incoming requests
app.use(express.urlencoded({ extended: true }));

// Connect to db
// MongoDB connection URL

// Connect to the MongoDB database
mongoose.connect(process.env.DATABASE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Check for successful connection
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB!");
});

// Create Schema for url
// keys: original-url and short-url
const urlSchema = new mongoose.Schema({
  original_URL: { type: String, unique: true, required: true },
  short_URL: { type: Number, unique: true, required: true },
});

// Create Model for url
const Url = mongoose.model("Url", urlSchema);

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

function isValidHttpWwwUrl(url) {
  const regex =
    /^(http:\/\/www\.|https:\/\/www\.)[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/i;
  return regex.test(url);
}

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

app.post("/api/shorturl", async (req, res) => {
  const { url } = req.body;

  if (validUrl.isWebUri(url)) {
    try {
      const result = await Url.findOne({ original_URL: url });

      if (result) {
        res.json({
          original_url: result.original_URL,
          short_url: result.short_URL,
        });
      } else {
        // Create new document in the database
        const highestShortURLDoc = await Url.findOne({}, "short_URL").sort({
          short_URL: -1,
        });

        // Get new shortURL number
        let shortURL = highestShortURLDoc
          ? parseInt(highestShortURLDoc.short_URL, 10) + 1
          : 1;

        // Create new record
        const newURL = await Url.create({
          original_URL: url,
          short_URL: shortURL,
        });

        res.json({
          original_url: newURL.original_URL,
          short_url: newURL.short_URL,
        });
      }
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  } else {
    res.json({ error: "invalid url" });
  }
});

app.get("/api/shorturl/:shortID?", async (req, res) => {
  const shortID = req.params.shortID;

  if (shortID) {
    try {
      const result = await Url.findOne({ short_URL: shortID });
      if (result) {
        res.redirect(result.original_URL);
      } else {
        res.status(404).json({ error: "No URL found for the given short ID" });
      }
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  } else {
    res.json({ error: "invalid short ID: ", shortID });
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
