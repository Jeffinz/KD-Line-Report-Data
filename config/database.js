// config/database.js
const { MongoClient } = require("mongodb");

// ใช้ Environment Variable (ตามคำแนะนำด้านความปลอดภัย)
const uri = process.env.MONGODB_URI;

let dbClient;
let dbInstance;

/**
 * เชื่อมต่อกับ MongoDB และสร้าง DB Instance
 */
const connectToMongoDB = async () => {
  if (!dbClient) {
    if (!uri) {
      throw new Error("MONGODB_URI environment variable is not set.");
    }
    try {
      dbClient = new MongoClient(uri);
      await dbClient.connect();
      // กำหนดชื่อฐานข้อมูล 'khuandon' (ตามที่ใช้ใน webhook.js เดิม)
      dbInstance = dbClient.db("khuandon");
      console.log("Connected to MongoDB");
    } catch (err) {
      console.error("Failed to connect to MongoDB", err);
      throw err;
    }
  }
  return dbClient;
};

/**
 * คืนค่า MongoDB Database Instance ที่เชื่อมต่อแล้ว
 */
const getDb = () => {
  if (!dbInstance) {
    throw new Error("Database not connected. Call connectToMongoDB first.");
  }
  return dbInstance;
};

module.exports = { connectToMongoDB, getDb };
