// server.js
const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config(); // ต้องเพิ่มเพื่อโหลด .env (ถ้ายังไม่ได้เพิ่ม)

// Import connectToMongoDB
const { connectToMongoDB } = require("./config/database.js");
const webhookRoutes = require("./routes/webhook.route.js");

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// เริ่มเซิร์ฟเวอร์
const startServer = async () => {
  try {
    // 1. เชื่อมต่อฐานข้อมูลก่อนเริ่ม Server
    await connectToMongoDB();
    console.log("Database connection established.");

    // 2. กำหนดเส้นทาง Webhook
    app.use("/webhook", webhookRoutes);

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1); // ออกจาก process หากเชื่อมต่อ DB ไม่ได้
  }
};

startServer();
