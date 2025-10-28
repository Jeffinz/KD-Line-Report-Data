// config/database.js
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;

let dbClient;
let dbInstance;

/**
 * @typedef {import('mongodb').MongoClient} MongoClient
 * @typedef {import('mongodb').Db} Db
 */

/**
 * เชื่อมต่อกับ MongoDB โดยใช้ Connection String จาก Environment Variable
 * และใช้หลักการ Singleton เพื่อให้มีการเชื่อมต่อเพียงครั้งเดียว
 * @async
 * @returns {Promise<MongoClient>} MongoDB Client ที่เชื่อมต่อแล้ว
 * @throws {Error} หาก MONGODB_URI ไม่ถูกตั้งค่า หรือการเชื่อมต่อล้มเหลว
 */
const connectToMongoDB = async () => {
  if (!dbClient) {
    if (!uri) {
      throw new Error("MONGODB_URI environment variable is not set.");
    }
    try {
      dbClient = new MongoClient(uri);
      await dbClient.connect();
      // กำหนดชื่อฐานข้อมูล 'khuandon'
      dbInstance = dbClient.db("khuandon");
      console.log("Database connection established.");
    } catch (err) {
      console.error("Failed to connect to MongoDB", err);
      throw err;
    }
  }
  return dbClient;
};

/**
 * คืนค่า MongoDB Database Instance ที่เชื่อมต่อแล้ว
 * @returns {Db} MongoDB Database Instance
 * @throws {Error} หาก Database ยังไม่ได้ถูกเชื่อมต่อ
 */
const getDb = () => {
  if (!dbInstance) {
    throw new Error("Database not connected. Call connectToMongoDB first.");
  }
  return dbInstance;
};

module.exports = { connectToMongoDB, getDb };
