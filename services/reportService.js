// services/reportService.js
const reportRepository = require("../repo/reportRepository");

// ฟังก์ชันสำหรับสร้างข้อความตอบกลับ (ย้ายมาจาก webhook.js)
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

  const villages = Array.isArray(report?.villages) ? report.villages : [];

  allVillages.forEach((village) => {
    const villageNumber = village.slice(2);
    const existingVillage = villages.find((v) => v.village === villageNumber);

    let statusText = "ยังไม่ส่ง";

    if (existingVillage) {
      statusText = `ส่งแล้ว ${existingVillage.lastUpdated}`;
    }

    replyText += `${village} ${statusText}\n`;
  });
  return replyText;
};

/**
 * จัดการ Logic คำสั่ง "!รายงานไลน์ต.ควนโดน" รวมถึงการตรวจสอบเดือนและรีเซ็ตข้อมูล
 * @returns {Promise<string>} ข้อความตอบกลับสำหรับ LINE
 */
const getReportSummary = async () => {
  // ดึงรายงานปัจจุบันจาก Repository
  let report = await reportRepository.findReportBySubdistrict("ควนโดน");

  const date = new Date();
  const month = date.toLocaleString("th-TH", { month: "short" });
  const year = (date.getFullYear() + 543).toString().slice(-2);

  const lastUpdatedVillages = report?.villages || [];

  // Logic ตรวจสอบว่าเดือนเปลี่ยนหรือไม่
  if (lastUpdatedVillages.length > 0) {
    // Regex เพื่อดึงชื่อเดือนภาษาไทยย่อ (ต.ค., พ.ย. เป็นต้น)
    const regexMonth = /(\p{Script=Thai}+\.\p{Script=Thai}\.)/u;
    const reportMonthMatch =
      lastUpdatedVillages[0]?.lastUpdated.match(regexMonth);

    // ถ้าเดือนที่เก็บในฐานข้อมูลไม่ตรงกับเดือนปัจจุบัน
    if (reportMonthMatch && reportMonthMatch[1] !== month) {
      // สั่ง Repository ให้ลบข้อมูลหมู่บ้านทั้งหมด
      await reportRepository.resetVillages("ควนโดน");
      // ดึงรายงานที่ถูกรีเซ็ตแล้ว
      report = await reportRepository.findReportBySubdistrict("ควนโดน");
    }
  } else {
    // ถ้าไม่มีข้อมูลเลย ให้สร้าง report เปล่า
    report = { villages: [] };
  }

  // สร้างข้อความตอบกลับ
  return createReplyText(report, month, year);
};

/**
 * จัดการ Logic การอัปเดตข้อมูลการส่งรายงานของหมู่บ้าน
 * @param {Object} details - { village: string, subdistrict: string, date: string } (จาก extractDetails)
 * @returns {Promise<string>} ข้อความแจ้งเตือนที่จะ Push ไปยังกลุ่มอื่น
 */
const updateVillageReport = async (details) => {
  // 1. เตรียม formattedTime (Business Logic ในการจัดรูปแบบเวลา)
  const date = new Date();
  const options = {
    timeZone: "Asia/Bangkok",
    month: "short",
    year: "2-digit",
  };
  const formattedDate = date.toLocaleString("th-TH", options);
  const [day, month, year] = formattedDate.split(" "); // ดึง เดือน และ ปี
  const formattedTime = `${details.date} ${month}${year}`; // ใช้เลขวันที่จากข้อความที่ผู้ใช้ส่ง

  // 2. สั่ง Repository ให้อัปเดต/เพิ่มข้อมูล
  await reportRepository.upsertVillageUpdate(details, formattedTime);

  // 3. เตรียมข้อความแจ้งเตือน
  return `***มีผู้ส่งรายงานไลน์\nหมู่ที่: ${details.village}\nตำบล: ${details.subdistrict}\nวันที่ส่ง: ${formattedTime}`;
};

module.exports = {
  getReportSummary,
  updateVillageReport,
};
