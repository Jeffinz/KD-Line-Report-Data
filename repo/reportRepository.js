// repo/reportRepository.js
const { getDb } = require("../config/database");

const COLLECTION_NAME = "villageReports";

// Helper function เพื่อเรียกใช้ Collection
const getCollection = () => getDb().collection(COLLECTION_NAME);

/**
 * ค้นหารายงานทั้งหมดของตำบล
 * @param {string} subdistrict
 * @returns {Promise<Object|null>}
 */
const findReportBySubdistrict = async (subdistrict) => {
  const collection = getCollection();
  return collection.findOne({ subdistrict: subdistrict });
};

/**
 * ล้างข้อมูลหมู่บ้านทั้งหมด (ใช้เมื่อเปลี่ยนเดือน)
 * @param {string} subdistrict
 * @returns {Promise<void>}
 */
const resetVillages = async (subdistrict) => {
  const collection = getCollection();
  await collection.updateOne(
    { subdistrict: subdistrict },
    { $set: { villages: [] } }
  );
};

/**
 * อัปเดตหรือเพิ่มข้อมูลการส่งรายงานของหมู่บ้าน
 * @param {Object} details - { village: string, subdistrict: string }
 * @param {string} formattedTime - รูปแบบวันเดือนปีที่ส่ง (เช่น 31 ต.ค.68)
 * @returns {Promise<void>}
 */
const upsertVillageUpdate = async (details, formattedTime) => {
  const collection = getCollection();
  const existingReport = await findReportBySubdistrict(details.subdistrict);

  if (existingReport) {
    const existingVillage = existingReport.villages.find(
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

    // จัดเรียงหมู่บ้าน (เพื่อให้ข้อมูลใน DB เรียงลำดับเสมอ)
    const updatedReport = await findReportBySubdistrict(details.subdistrict);
    if (updatedReport) {
      const sortedVillages = updatedReport.villages.sort(
        (a, b) => parseInt(a.village) - parseInt(b.village)
      );
      await collection.updateOne(
        { _id: existingReport._id },
        { $set: { villages: sortedVillages } }
      );
    }
  } else {
    // ถ้าไม่มีข้อมูล ให้สร้างข้อมูลใหม่
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

module.exports = {
  findReportBySubdistrict,
  resetVillages,
  upsertVillageUpdate,
};
