// services/reportService.js (Refactored to Document Per Period Model)
const reportRepository = require("../repo/reportRepository");
const dayjs = require("dayjs");
const buddhistEra = require("dayjs/plugin/buddhistEra");
require("dayjs/locale/th");
dayjs.extend(buddhistEra);
dayjs.locale("th");

// Helper function to get the current period key
const getCurrentPeriod = () => {
  const now = dayjs();
  // Format for DB key: 'YYYY-MM' (e.g., '2025-10')
  const dbPeriod = now.format("YYYY-MM");
  // Format for Reply Text: 'ต.ค.68'
  const replyMonth = now.format("MMM");
  const replyYear = now.format("BB");

  return { dbPeriod, replyMonth, replyYear, dateObject: now.toDate() };
};

// ... existing createReplyText ...
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

    let statusText = "ส่งแล้ว";

    if (existingVillage) {
      statusText = `ส่งแล้ว ${existingVillage.lastUpdated}`;
    }

    replyText += `${village} ${statusText}\n`;
  });
  return replyText;
};

/**
 * จัดการ Logic คำสั่ง "!รายงานไลน์ต.ควนโดน" โดยค้นหารายงานตามรอบเดือน
 * (ลบ Logic การรีเซ็ตที่เปราะบางออกไป)
 */
const getReportSummary = async () => {
  const { dbPeriod, replyMonth, replyYear } = getCurrentPeriod();

  // ดึงรายงานตามตำบลและรอบเดือน (ใช้ Key: subdistrict + dbPeriod)
  const report = await reportRepository.findReportByPeriod("ควนโดน", dbPeriod);

  return createReplyText(report, replyMonth, replyYear);
};

/**
 * บันทึกข้อมูลรายงานลงในสถานะรอการยืนยัน (Pending State)
 */
const savePendingReport = async (details, userId) => {
  // ดึงรอบเดือนและ Date Object ของเวลาปัจจุบัน
  const { dbPeriod, dateObject } = getCurrentPeriod();

  // 1. เตรียม formattedTime (Business Logic ในการจัดรูปแบบเวลา)
  const now = dayjs();

  // *** NEW LOGIC: ใช้เลขวันที่ของวันปัจจุบัน (DD) ***
  const currentDay = now.format("DD");

  const thaiMonth = now.format("MMM");
  const thaiYear = now.format("BB");

  // สร้าง formattedTime โดยใช้เลขวันที่ปัจจุบัน
  const formattedTime = `${currentDay} ${thaiMonth}${thaiYear}`;

  // 2. สั่ง Repository ให้บันทึกข้อมูลชั่วคราว
  await reportRepository.savePendingReport(
    userId,
    details,
    formattedTime,
    dateObject,
    dbPeriod
  );
};

/**
 * ประมวลผลคำสั่ง "ตรวจงาน" เพื่อยืนยันและบันทึกรายงานฉบับสมบูรณ์
 */
const processConfirmation = async (userId) => {
  const pendingReport = await reportRepository.findPendingReport(userId);

  if (!pendingReport) {
    return null;
  }

  const { details, formattedTime, dateObject, monthYear } = pendingReport;

  // 2. ทำการบันทึกรายงานฉบับสมบูรณ์ (ใช้ Logic ใหม่ของ upsertVillageUpdate)
  await reportRepository.upsertVillageUpdate(
    details,
    formattedTime,
    dateObject,
    monthYear
  );

  // 3. ลบรายงานที่รอการยืนยัน
  await reportRepository.deletePendingReport(userId);

  // 4. เตรียมข้อความแจ้งเตือนสำหรับ Push Message
  return `***มีผู้ส่งรายงานไลน์ (ยืนยันแล้ว)\nหมู่ที่: ${details.village}\nตำบล: ${details.subdistrict}\nวันที่ส่ง: ${formattedTime}`;
};

module.exports = {
  getReportSummary,
  savePendingReport,
  processConfirmation,
};
