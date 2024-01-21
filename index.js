import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import validator from "validator";

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

async function handleUrl(url) {
  // Requested URL is already validated
  // Call the function to log the current time
  logCurrentTime();

  try {
    console.log("Entered the try catch");
    const result = await Url.findOne({ original_URL: url });
    console.log("after the first findOne");

    if (result) {
      console.log("Found record:", result);
      return {
        original_url: result.original_URL,
        short_url: result.short_URL,
      };
    } else {
      console.log("Enter the else block");
      // Create new document in the database
      const highestShortURLDoc = await Url.findOne({}, "short_URL").sort({
        short_URL: -1,
      });

      let shortURL = highestShortURLDoc
        ? parseInt(highestShortURLDoc.short_URL, 10) + 1
        : 1;

      console.log("Next shortURL (should be integer):", shortURL);
      console.log(typeof shortURL);

      // Ensure shortURL is a number
      if (isNaN(shortURL)) {
        throw new Error("shortURL is not a number");
      }

      // Create new record
      const newURL = await Url.create({
        original_URL: url,
        short_URL: shortURL.toString(), // Make sure short_URL is a string
      });

      console.log("Record created:", newURL);
      return {
        original_url: newURL.original_URL,
        short_url: newURL.short_URL,
      };
    }
  } catch (err) {
    console.log("Error handleUrl function:", err);
    return { error: "Internal server error" };
  }
}

// Generate random number of max 3 digits
function generateRandomNumber() {
  // Generate a random number between 0 and 999 (inclusive)
  return Math.floor(Math.random() * 1000);
}

// For logging current time
function logCurrentTime() {
  const currentDate = new Date();

  const hours = currentDate.getHours().toString().padStart(2, "0");
  const minutes = currentDate.getMinutes().toString().padStart(2, "0");
  const seconds = currentDate.getSeconds().toString().padStart(2, "0");

  console.log(`Current Time: ${hours}:${minutes}:${seconds}`);
}

async function handleShortID(shortID) {
  console.log("Line 125 handleShortID");
  try {
    const result = await Url.findOne({ short_URL: shortID });
    console.log("Line 127 handleShortID: ", result);
    if (!result) {
      return { error: "invalid url" };
    } else return result.original_URL;
  } catch (error) {
    console.log("Error at handleShortID: line 131 ", error);
    return 0;
  }
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
  const stringUrl = String(url);

  if (validator.isURL(stringUrl)) {
    try {
      const response = await handleUrl(stringUrl);
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  } else {
    res.json({ error: "invalid url" });
  }
});

app.get("/api/shorturl/:shortID", async (req, res) => {
  const shortID = parseInt(req.params.shortID);

  if (!isNaN(shortID)) {
    try {
      const originalUrl = await handleShortID(shortID);
      if (originalUrl) {
        res.redirect(originalUrl);
      } else {
        res.status(404).json({ error: "No URL found for the given short ID" });
      }
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  } else {
    res.json({ error: "invalid short ID" });
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
