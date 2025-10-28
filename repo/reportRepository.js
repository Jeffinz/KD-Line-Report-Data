// repo/reportRepository.js (Refactored to Document Per Period Model)
const { getDb } = require("../config/database");

const MONTHLY_COLLECTION_NAME = "monthlyReports"; // NEW: เปลี่ยน Collection หลัก
const PENDING_COLLECTION_NAME = "pendingReports"; // คงเดิม: สำหรับ State Management

const getCollection = (name = MONTHLY_COLLECTION_NAME) =>
  getDb().collection(name);

// --- MONTHLY REPORT LOGIC (NEW) ---

/**
 * ค้นหารายงานตามตำบลและรอบเดือน
 * @param {string} subdistrict
 * @param {string} monthYear - รอบเดือนในรูปแบบ 'YYYY-MM'
 * @returns {Promise<Object|null>}
 */
const findReportByPeriod = async (subdistrict, monthYear) => {
  const collection = getCollection(MONTHLY_COLLECTION_NAME);
  // ค้นหาโดยใช้ subdistrict และ monthYear เป็น Key
  return collection.findOne({ subdistrict: subdistrict, monthYear: monthYear });
};

/**
 * อัปเดตหรือเพิ่มข้อมูลการส่งรายงานของหมู่บ้านตามรอบเดือน
 * @param {Object} details - { village: string, subdistrict: string }
 * @param {string} formattedTime - รูปแบบวันเดือนปีที่ส่ง (เช่น 31 ต.ค.68)
 * @param {Date} dateObject - Date object สำหรับติดตามเวลาที่แน่นอน
 * @param {string} monthYear - รอบเดือนในรูปแบบ 'YYYY-MM'
 * @returns {Promise<void>}
 */
const upsertVillageUpdate = async (
  details,
  formattedTime,
  dateObject,
  monthYear
) => {
  const collection = getCollection(MONTHLY_COLLECTION_NAME);
  const query = { subdistrict: details.subdistrict, monthYear: monthYear };
  const existingReport = await findReportByPeriod(
    details.subdistrict,
    monthYear
  );

  const villageData = {
    village: details.village,
    lastUpdated: formattedTime,
    lastUpdatedDate: dateObject, // เก็บ Date Object เพื่อความแม่นยำ
  };

  if (existingReport) {
    const existingVillage = existingReport.villages.find(
      (village) => village.village === details.village
    );

    if (existingVillage) {
      // อัปเดตเวลาในหมู่บ้านที่มีอยู่แล้ว
      await collection.updateOne(
        { ...query, "villages.village": details.village },
        {
          $set: {
            "villages.$.lastUpdated": formattedTime,
            "villages.$.lastUpdatedDate": dateObject,
          },
        }
      );
    } else {
      // เพิ่มหมู่บ้านใหม่
      await collection.updateOne(
        { ...query },
        { $push: { villages: villageData } }
      );
    }
  } else {
    // ถ้าไม่มีเอกสารในเดือนนี้ ให้สร้างเอกสารใหม่สำหรับรอบเดือนนั้น
    await collection.insertOne({
      subdistrict: details.subdistrict,
      monthYear: monthYear, // Key หลัก: รอบเดือน
      villages: [villageData],
    });
  }
};

// --- PENDING REPORT LOGIC (UPDATED) ---

/**
 * บันทึกรายงานเข้าสู่สถานะรอการยืนยัน (Pending)
 * (เพิ่ม dateObject และ monthYear เข้าไปเก็บ)
 */
const savePendingReport = async (
  userId,
  details,
  formattedTime,
  dateObject,
  monthYear
) => {
  const collection = getCollection(PENDING_COLLECTION_NAME);
  const data = {
    userId: userId,
    details: details,
    formattedTime: formattedTime,
    dateObject: dateObject, // NEW
    monthYear: monthYear, // NEW
    createdAt: new Date(),
  };

  await collection.updateOne(
    { userId: userId },
    { $set: data },
    { upsert: true }
  );
};

// ค้นหาและลบ Pending Reports (Logic คงเดิม)
const findPendingReport = async (userId) =>
  getCollection(PENDING_COLLECTION_NAME).findOne({ userId: userId });
const deletePendingReport = async (userId) =>
  getCollection(PENDING_COLLECTION_NAME).deleteOne({ userId: userId });

module.exports = {
  findReportByPeriod,
  upsertVillageUpdate,
  savePendingReport,
  findPendingReport,
  deletePendingReport,
};