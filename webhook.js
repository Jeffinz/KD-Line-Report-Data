const express = require("express");
const line = require("@line/bot-sdk");
const { connectToMongoDB } = require("../models/db");
const { extractDetails, isValidSubdistrict } = require("../utils/helpers");

const router = express.Router();
const lineConfig = require("../config/lineConfig");
const client = new line.Client(lineConfig);

// ฟังก์ชันสำหรับสร้างข้อความตอบกลับ
const createReplyText = (report, month, year) => {
  let replyText = `อัพเดทการส่งรายงานทางไลน์\n${month}${year} ต.ควนโดน\n\n`;
  const allVillages = [
    "ม.1",
    "ม.2",
    "ม.3",
    "ม.4",
    "ม.5",
    "ม.6",
    "ม.7",
    "ม.8",
    "ม.9",
    "ม.10",
  ];

  // เช็คว่า report.villages มีค่าและเป็น array
  const villages = Array.isArray(report?.villages) ? report.villages : [];

  // ถ้ามีหมู่บ้านในรายงาน
  if (villages.length === 0) {
    // ถ้าไม่มีข้อมูลในฐานข้อมูลให้เพิ่มข้อมูลหมู่บ้านทั้งหมด
    allVillages.forEach((village) => {
      replyText += `${village} ส่งแล้ว ${month}${year}\n`;
    });
  } else {
    // ถ้ามีข้อมูลในฐานข้อมูลให้แสดงตามที่มี
    allVillages.forEach((village) => {
      const existingVillage = villages.find(
        (v) => v.village === village.slice(2) // เปรียบเทียบเลขหมู่บ้าน
      );
      const lastUpdated = existingVillage
        ? existingVillage.lastUpdated
        : `${month}${year}`; // ใช้วันที่ที่ส่งคำสั่ง

      replyText += `${village} ส่งแล้ว ${lastUpdated}\n`;
    });
  }
  return replyText;
};

// ฟังก์ชันเพื่อจัดการกับการอัปเดตข้อมูลหมู่บ้าน
const handleVillageUpdate = async (details, collection, formattedTime) => {
  const existingReport = await collection.findOne({
    subdistrict: details.subdistrict,
  });

  if (existingReport) {
    const existingVillage = existingReport?.villages.find(
      (village) => village.village === details.village
    );

    if (existingVillage) {
      // อัปเดตเวลาในหมู่บ้านที่มีอยู่แล้ว
      await collection.updateOne(
        {
          _id: existingReport._id,
          "villages.village": details.village,
        },
        { $set: { "villages.$.lastUpdated": formattedTime } }
      );
    } else {
      // เพิ่มหมู่บ้านใหม่
      await collection.updateOne(
        { _id: existingReport._id },
        {
          $push: {
            villages: {
              village: details.village,
              lastUpdated: formattedTime,
            },
          },
        }
      );
    }

    // จัดเรียงหมู่บ้าน
    const updatedReport = await collection.findOne({ _id: existingReport._id });
    const sortedVillages = updatedReport.villages.sort(
      (a, b) => parseInt(a.village) - parseInt(b.village)
    );
    await collection.updateOne(
      { _id: existingReport._id },
      { $set: { villages: sortedVillages } }
    );
  } else {
    // ถ้าไม่มีข้อมูลในฐานข้อมูล ให้สร้างข้อมูลใหม่
    await collection.insertOne({
      subdistrict: details.subdistrict,
      villages: [
        {
          village: details.village,
          lastUpdated: formattedTime,
        },
      ],
    });
  }
};

router.post("/", async (req, res) => {
  const events = req.body.events;

  try {
    // เชื่อมต่อ MongoDB
    const dbClient = await connectToMongoDB();
    const db = dbClient.db("khuandon");
    const collection = db.collection("villageReports");

    await Promise.all(
      events.map(async (event) => {
        if (event.type === "message" && event.message.type === "text") {
          const targetGroupIds = [
            "Cdec64a26b5f02c163e83c4a15919921c",
            "YOUR_GROUP_ID",
          ];

          const message = event.message.text;

          // หากข้อความคือคำสั่ง "!รายงานไลน์ต.ควนโดน"
          if (message === "!รายงานไลน์ต.ควนโดน") {
            let report = await collection.findOne({ subdistrict: "ควนโดน" });

            const date = new Date();
            const month = date.toLocaleString("th-TH", { month: "short" });
            const year = (date.getFullYear() + 543).toString().slice(-2);

            // ตรวจสอบว่าเดือนในฐานข้อมูลต่างจากเดือนปัจจุบันหรือไม่
            const lastUpdatedVillages = report.villages || [];
            const currentMonthYear = `${month}${year}`;

            // ถ้าเดือนในฐานข้อมูลต่างกับเดือนปัจจุบัน
            if (lastUpdatedVillages.length > 0) {
              const regexMonth = /(\p{Script=Thai}+\.\p{Script=Thai}\.)/u;
              const reportMonth =
                lastUpdatedVillages[0]?.lastUpdated.match(regexMonth);
              if (reportMonth[1] !== month) {
                // ลบข้อมูลหมู่บ้านทั้งหมดในเดือนเก่า
                await collection.updateOne(
                  { subdistrict: "ควนโดน" },
                  { $set: { villages: [] } } // ลบข้อมูลหมู่บ้านทั้งหมด
                );
                report = await collection.findOne({ subdistrict: "ควนโดน" });
              }
            } else {
              // ถ้าไม่มีข้อมูลในฐานข้อมูลเลย ให้สร้างข้อมูลใหม่
              report = { villages: [] };
            }

            // สร้างข้อความตอบกลับหลังจากลบข้อมูลเก่าแล้ว
            const replyText = report
              ? createReplyText(report, month, year)
              : createReplyText({}, month, year);

            // ส่งข้อความไปยังผู้ใช้
            return client.replyMessage(event.replyToken, {
              type: "text",
              text: replyText,
            });
          }

          // ตรวจสอบว่ามีการส่งข้อความจากกลุ่มที่ต้องการ
          if (!targetGroupIds.includes(event.source.groupId)) {
            return;
          }

          const details = extractDetails(message);

          // ตรวจสอบความถูกต้องของข้อมูล
          if (!details.isValid || !isValidSubdistrict(details.subdistrict)) {
            return;
          }

          // สร้าง formattedTime โดยใช้วันที่และเวลาปัจจุบัน
          const date = new Date();
          const options = {
            timeZone: "Asia/Bangkok",
            day: "numeric",
            month: "short",
            year: "2-digit",
          };
          const day1 = details.date;
          const formattedDate = date.toLocaleString("th-TH", options);
          const [day, month, year] = formattedDate.split(" ");
          const formattedTime = `${day1} ${month}${year}`;

          // อัปเดตข้อมูลหมู่บ้าน
          await handleVillageUpdate(details, collection, formattedTime);

          // ส่งข้อความไปยังกลุ่ม
          const targetGroupId = "C589c719e7a665cf13563094d46ad449c"; // ID ของกลุ่มที่คุณต้องการส่งข้อความไป
          const replyText = `***มีผู้ส่งรายงานไลน์\nหมู่ที่: ${details.village}\nตำบล: ${details.subdistrict}\nวันที่ส่ง: ${formattedTime}`;

          return client.pushMessage(targetGroupId, {
            type: "text",
            text: replyText,
          });
        }
      })
    );
    res.status(200).send("OK");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
