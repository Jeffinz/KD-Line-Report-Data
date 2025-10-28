// server.js
const express = require("express");
const bodyParser = require("body-parser");
const webhookRoutes = require("./routes/webhook");

const app = express();
const port = process.env.PORT || 3000;

// กำหนดให้ express สามารถรับ request body ในรูปแบบ JSON
app.use(bodyParser.json());

// กำหนดเส้นทาง Webhook
app.use("/webhook", webhookRoutes);

// เริ่มเซิร์ฟเวอร์
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
