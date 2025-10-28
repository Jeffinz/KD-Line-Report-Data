// repo/reportRepository.js (Data Access Layer)
const { getDb } = require("../config/database");

const MONTHLY_COLLECTION_NAME = "monthlyReports"; // Collection หลัก (Document Per Period)
const PENDING_COLLECTION_NAME = "pendingReports"; // Collection สำหรับ State Management

/**
 * @typedef {import('mongodb').Db} Db
 * @typedef {import('mongodb').Collection} Collection
 */

/**
 * คืนค่า MongoDB Collection ตามชื่อที่ระบุ
 * @param {string} [name=MONTHLY_COLLECTION_NAME] - ชื่อ Collection
 * @returns {Collection} MongoDB Collection
 */
const getCollection = (name = MONTHLY_COLLECTION_NAME) =>
  getDb().collection(name);

// --- MONTHLY REPORT LOGIC ---

/**
 * ค้นหารายงานตามตำบลและรอบเดือน
 * @async
 * @param {string} subdistrict
 * @param {string} monthYear - รอบเดือนในรูปแบบ 'YYYY-MM'
 * @returns {Promise<Object|null>} เอกสารรายงานหรือ null
 */
const findReportByPeriod = async (subdistrict, monthYear) => {
  const collection = getCollection(MONTHLY_COLLECTION_NAME);
  return collection.findOne({ subdistrict: subdistrict, monthYear: monthYear });
};

/**
 * อัปเดตหรือเพิ่มข้อมูลการส่งรายงานของหมู่บ้านตามรอบเดือน
 * @async
 * @param {Object} details - { village: string, subdistrict: string }
 * @param {string} formattedTime - รูปแบบวันเดือนปีที่ส่ง (เช่น 31 ต.ค.68)
 * @param {Date} dateObject - Date object ของวันที่ส่ง
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
    lastUpdatedDate: dateObject,
  };

  if (existingReport) {
    const existingVillage = existingReport.villages.find(
      (village) => village.village === details.village
    );

    if (existingVillage) {
      // อัปเดตเวลาในหมู่บ้านที่มีอยู่แล้ว (Overwrite Logic)
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
    // ถ้าไม่มีเอกสารในเดือนนี้ ให้สร้างเอกสารใหม่
    await collection.insertOne({
      subdistrict: details.subdistrict,
      monthYear: monthYear,
      villages: [villageData],
    });
  }
};

// --- PENDING REPORT LOGIC (STATE MANAGEMENT) ---

/**
 * บันทึกรายงานเข้าสู่สถานะรอการยืนยัน (Pending State)
 * @async
 * @param {string} userId - ID ของผู้ใช้
 * @param {Object} details - ข้อมูลรายงานที่ผ่านการแยกแยะแล้ว
 * @param {string} formattedTime - วันที่และเดือนปีที่จัดรูปแบบแล้ว
 * @param {Date} dateObject - Date object ของวันที่ส่ง
 * @param {string} monthYear - รอบเดือนในรูปแบบ 'YYYY-MM'
 * @returns {Promise<void>}
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
    dateObject: dateObject,
    monthYear: monthYear,
    createdAt: new Date(),
  };

  // ใช้ upsert: ถ้ามีรายงานที่รอล่าสุดจาก user นี้อยู่แล้ว ให้ทับไปเลย
  await collection.updateOne(
    { userId: userId },
    { $set: data },
    { upsert: true }
  );
};

/**
 * ค้นหารายงานที่รอการยืนยันล่าสุดจากผู้ใช้
 * @async
 * @param {string} userId - ID ของผู้ใช้
 * @returns {Promise<Object|null>} เอกสารรายงานที่รอการยืนยันหรือ null
 */
const findPendingReport = async (userId) =>
  getCollection(PENDING_COLLECTION_NAME).findOne({ userId: userId });

/**
 * ลบรายงานที่รอการยืนยันเมื่อทำการบันทึกเรียบร้อยแล้ว
 * @async
 * @param {string} userId - ID ของผู้ใช้
 * @returns {Promise<void>}
 */
const deletePendingReport = async (userId) =>
  getCollection(PENDING_COLLECTION_NAME).deleteOne({ userId: userId });

module.exports = {
  findReportByPeriod,
  upsertVillageUpdate,
  savePendingReport,
  findPendingReport,
  deletePendingReport,
};
