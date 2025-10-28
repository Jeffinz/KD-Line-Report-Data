// app.js (Entry Point/Server)
const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const { connectToMongoDB } = require("./config/database.js");
const webhookRoutes = require("./routes/webhook.route.js");

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

/**
 * เริ่มต้นการทำงานของ Server
 * @async
 */
const startServer = async () => {
  try {
    // 1. เชื่อมต่อฐานข้อมูลก่อนเริ่ม Server
    await connectToMongoDB();

    // 2. กำหนดเส้นทาง Webhook
    app.use("/webhook", webhookRoutes);

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
