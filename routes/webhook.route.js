// routes/webhook.route.js
const express = require("express");
const line = require("@line/bot-sdk");
const { extractDetails, isValidSubdistrict } = require("../utils/lineUtils");
const reportService = require("../services/reportService"); // เรียกใช้ Service Layer

const router = express.Router();

// ใช้ Environment Variables สำหรับ Line Config (ตามคำแนะนำก่อนหน้า)
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new line.Client(lineConfig);

// ใช้ Environment Variables สำหรับ Group IDs (ตามคำแนะนำก่อนหน้า)
const TARGET_GROUP_IDS = [
  process.env.TARGET_GROUP_ID_1,
  process.env.TARGET_GROUP_ID_2,
];
const NOTIFICATION_GROUP_ID = process.env.NOTIFICATION_GROUP_ID; // C589c719e7a665cf13563094d46ad449c

router.post("/", async (req, res) => {
  const events = req.body.events;

  try {
    await Promise.all(
      events.map(async (event) => {
        // ใช้ try...catch ภายใน map เพื่อให้ Event อื่นๆ ทำงานต่อไปได้หากมี Error
        try {
          if (event.type === "message" && event.message.type === "text") {
            const message = event.message.text;

            // 1. Handle Report Summary Command
            if (message === "!รายงานไลน์ต.ควนโดน") {
              // เรียก Service Layer เพื่อจัดการ Logic และดึงข้อความตอบกลับ
              const replyText = await reportService.getReportSummary();

              return client.replyMessage(event.replyToken, {
                type: "text",
                text: replyText,
              });
            }

            // 2. Handle Village Report Submission

            // ตรวจสอบว่ามีการส่งข้อความจากกลุ่มที่ต้องการ
            if (!TARGET_GROUP_IDS.includes(event.source.groupId)) {
              return;
            }

            const details = extractDetails(message);

            // ตรวจสอบความถูกต้องของข้อมูล
            if (!details.isValid || !isValidSubdistrict(details.subdistrict)) {
              return;
            }

            // เรียก Service Layer เพื่ออัปเดตข้อมูลและดึงข้อความแจ้งเตือน
            const pushMessageText = await reportService.updateVillageReport(
              details
            );

            // ส่งข้อความไปยังกลุ่มแจ้งเตือน
            return client.pushMessage(NOTIFICATION_GROUP_ID, {
              type: "text",
              text: pushMessageText,
            });
          }
        } catch (error) {
          console.error("Error processing LINE event:", error);
          // ไม่ส่งข้อความกลับในกรณีที่เกิด Error
        }
      })
    );
    res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook processing failed:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
