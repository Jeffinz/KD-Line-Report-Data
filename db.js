// models/db.js
const { MongoClient } = require("mongodb");

// MongoDB URI ของคุณ (ใช้ URL ที่ถูกต้องจาก MongoDB Atlas หรือ localhost)
const uri =
  "mongodb+srv://kkhemkhao:fromthefuture2744@monthly-report-line.ad3ld.mongodb.net/?retryWrites=true&w=majority&appName=monthly-report-line"; // ใส่ Connection String ที่ถูกต้อง

let dbClient;

const connectToMongoDB = async () => {
  if (!dbClient) {
    try {
      dbClient = new MongoClient(uri);
      await dbClient.connect();
      console.log("Connected to MongoDB");
    } catch (err) {
      console.error("Failed to connect to MongoDB", err);
      throw err;
    }
  }
  return dbClient; // คืนค่า dbClient ที่เชื่อมต่อแล้ว
};

module.exports = { connectToMongoDB };
