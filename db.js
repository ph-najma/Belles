// db.js - Database connection setup
const mongoose = require("mongoose");

const connectToDatabase = async () => {
  try {
    const mongoURI =
      "mongodb+srv://phnajma786:.j7Dnq5XgGQAWhN@cluster0.viosua5.mongodb.net/ecommerce?retryWrites=true&w=majority&appName=Cluster0";
    await mongoose.connect(mongoURI, {});
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
  }
};

module.exports = connectToDatabase;
