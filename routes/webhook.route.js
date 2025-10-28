// routes/webhook.route.js
const express = require("express");
const line = require("@line/bot-sdk");
const { extractDetails, isValidSubdistrict } = require("../utils/lineUtils");
const reportService = require("../services/reportService");

const router = express.Router();

// ใช้ Environment Variables สำหรับ Line Config
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new line.Client(lineConfig);

// ใช้ Environment Variables สำหรับ Group IDs
const TARGET_GROUP_IDS = [
  process.env.TARGET_GROUP_ID_1,
  process.env.TARGET_GROUP_ID_2,
];
const NOTIFICATION_GROUP_ID = process.env.NOTIFICATION_GROUP_ID;

router.post("/", async (req, res) => {
  const events = req.body.events;

  // โค้ดสำหรับดีบั๊กชั่วคราวถูกลบออกแล้ว

  try {
    await Promise.all(
      events.map(async (event) => {
        try {
          if (event.type === "message" && event.message.type === "text") {
            const message = event.message.text;
            const userId = event.source.userId;

            // 1. Handle Report Summary Command
            if (message === "!รายงานไลน์ต.ควนโดน") {
              const replyText = await reportService.getReportSummary();

              return client.replyMessage(event.replyToken, {
                type: "text",
                text: replyText,
              });
            }

            // 2. Filter Events: ONLY check for submissions from target groups
            if (!TARGET_GROUP_IDS.includes(event.source.groupId)) {
              return;
            }

            // --- TWO-STEP VERIFICATION LOGIC ---

            // A. CHECK FOR CONFIRMATION (Second Step) - ตรวจสอบคำสั่ง "ตรวจงาน"
            if (message.includes("ตรวจงาน") && userId) {
              // ประมวลผลการยืนยันและบันทึกข้อมูลหลัก
              const pushMessageText = await reportService.processConfirmation(
                userId
              );

              if (pushMessageText) {
                // ถ้าสำเร็จ: ส่งข้อความแจ้งเตือนไปยังกลุ่มแจ้งเตือน
                return client.pushMessage(NOTIFICATION_GROUP_ID, {
                  type: "text",
                  text: pushMessageText,
                });
              }

              // ถ้าไม่พบรายงานรอ (ยืนยันล้มเหลว): ไม่ตอบกลับใดๆ
              return;
            }

            // B. CHECK FOR REPORT DATA (First Step) - ตรวจสอบข้อมูลหลัก
            const details = extractDetails(message);

            // ตรวจสอบความถูกต้องของข้อมูล (ต้องมีหมู่บ้านและตำบลครบถ้วน)
            if (details.isValid && isValidSubdistrict(details.subdistrict)) {
              // 1. บันทึกรายงานในสถานะ Pending (ใช้ Current Date ในการบันทึก)
              await reportService.savePendingReport(details, userId);

              // 2. ไม่ส่งข้อความตอบกลับใดๆ
              return;
            }

            // ถ้าไม่ใช่ทั้ง 3 กรณี
            return;
          }
        } catch (error) {
          console.error("Error processing LINE event:", error);
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
