// services/reportService.js (Business Logic Layer)
const reportRepository = require("../repo/reportRepository");
const dayjs = require("dayjs");
const buddhistEra = require("dayjs/plugin/buddhistEra");
require("dayjs/locale/th");
dayjs.extend(buddhistEra);
dayjs.locale("th");

/**
 * @typedef {Object} PeriodDetails
 * @property {string} dbPeriod - รอบเดือนในรูปแบบ 'YYYY-MM' สำหรับใช้ในฐานข้อมูล
 * @property {string} replyMonth - ชื่อเดือนย่อภาษาไทยสำหรับใช้ในข้อความตอบกลับ
 * @property {string} replyYear - ปี พ.ศ. สองหลักสำหรับใช้ในข้อความตอบกลับ
 * @property {Date} dateObject - Date object ของวันที่ปัจจุบัน
 */

/**
 * สร้างรายละเอียดรอบเดือนปัจจุบัน
 * @returns {PeriodDetails} รายละเอียดรอบเดือนปัจจุบัน
 */
const getCurrentPeriod = () => {
  const now = dayjs();

  const dbPeriod = now.format("YYYY-MM");
  const replyMonth = now.format("MMM");
  const replyYear = now.format("BB");

  return { dbPeriod, replyMonth, replyYear, dateObject: now.toDate() };
};

/**
 * สร้างข้อความตอบกลับรายงานสรุปตามลำดับหมู่บ้าน
 * @param {Object|null} report - เอกสารรายงานของเดือนปัจจุบัน
 * @param {string} month - ชื่อเดือนย่อภาษาไทย
 * @param {string} year - ปี พ.ศ. สองหลัก
 * @returns {string} ข้อความรายงานสรุป
 */
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

  // วนตาม Master List เพื่อให้แน่ใจว่าผลลัพธ์เรียงลำดับเสมอ
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
 * จัดการ Logic คำสั่ง "!รายงานไลน์ต.ควนโดน" โดยค้นหารายงานตามรอบเดือน
 * @async
 * @returns {Promise<string>} ข้อความตอบกลับสำหรับ LINE
 */
const getReportSummary = async () => {
  const { dbPeriod, replyMonth, replyYear } = getCurrentPeriod();

  // ดึงรายงานตามตำบลและรอบเดือน
  const report = await reportRepository.findReportByPeriod("ควนโดน", dbPeriod);

  return createReplyText(report, replyMonth, replyYear);
};

/**
 * บันทึกข้อมูลรายงานลงในสถานะรอการยืนยัน (Pending State)
 * @async
 * @param {Object} details - { village: string, subdistrict: string }
 * @param {string} userId - ID ของผู้ใช้ที่ส่งข้อความ
 * @returns {Promise<void>}
 */
const savePendingReport = async (details, userId) => {
  // ดึงรอบเดือนและ Date Object ของเวลาปัจจุบัน
  const { dbPeriod, dateObject } = getCurrentPeriod();

  // 1. เตรียม formattedTime โดยใช้เลขวันที่ของวันปัจจุบัน
  const now = dayjs();
  const currentDay = now.format("DD");
  const thaiMonth = now.format("MMM");
  const thaiYear = now.format("BB");
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
 * @async
 * @param {string} userId - ID ของผู้ใช้
 * @returns {Promise<string|null>} ข้อความแจ้งเตือนสำหรับ Push Message หรือ null ถ้าไม่มีรายงานรอ
 */
const processConfirmation = async (userId) => {
  const pendingReport = await reportRepository.findPendingReport(userId);

  if (!pendingReport) {
    return null;
  }

  const { details, formattedTime, dateObject, monthYear } = pendingReport;

  // 1. ทำการบันทึกรายงานฉบับสมบูรณ์ลงใน Collection หลัก
  await reportRepository.upsertVillageUpdate(
    details,
    formattedTime,
    dateObject,
    monthYear
  );

  // 2. ลบรายงานที่รอการยืนยัน
  await reportRepository.deletePendingReport(userId);

  // 3. เตรียมข้อความแจ้งเตือนสำหรับ Push Message
  return `***มีผู้ส่งรายงานไลน์ (ยืนยันแล้ว)\nหมู่ที่: ${details.village}\nตำบล: ${details.subdistrict}\nวันที่ส่ง: ${formattedTime}`;
};

module.exports = {
  getReportSummary,
  savePendingReport,
  processConfirmation,
};
