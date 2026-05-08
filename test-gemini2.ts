import { extractClinicalData } from './src/services/geminiService';

async function test() {
  const dummyBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAANSURBVBhXY3jP4PgfAAWpA36yH8L/AAAAAElFTkSuQmCC"; // 1x1 pixel
  try {
    const res = await extractClinicalData(dummyBase64, 'hemodialysis', 'patient');
    console.log("Success:", res);
  } catch (e) {
    console.log("Error:", e);
  }
}
test();
