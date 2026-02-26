import { HfInference } from "@huggingface/inference";
import { NextResponse } from "next/server";

const hf = new HfInference(process.env.HF_TOKEN);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      aqi = 0,
      temp = 0,
      desc = "ไม่ทราบสภาพอากาศ",
      nextEvent = "ไม่มีนัดหมาย",
      question = null,
      city = "พื้นที่ของคุณ",
      forecast = [],
      trend = {},
    } = body;

    let riskScore = 0;
    let riskLevel = "ต่ำ";
    let riskReason = "";

    // AQI
    if (aqi > 150) {
      riskScore += 40;
      riskReason += "ค่าฝุ่นอันตราย ";
    } else if (aqi > 100) {
      riskScore += 25;
      riskReason += "ค่าฝุ่นเริ่มกระทบสุขภาพ ";
    }

    // ฝน
    if (desc.toLowerCase().includes("rain") || desc.includes("ฝน")) {
      riskScore += 20;
      riskReason += "มีฝน ถนนลื่น ";
    }

    // อุณหภูมิ
    if (temp > 37) {
      riskScore += 15;
      riskReason += "อุณหภูมิสูง ";
    }

    // สรุประดับความเสี่ยง
    if (riskScore > 70) riskLevel = "สูง";
    else if (riskScore > 40) riskLevel = "ปานกลาง";
    else riskLevel = "ต่ำ";

    /* =========================
       📅 Forecast Summary
    ========================== */

    const forecastText = forecast.length
      ? forecast
          .map(
            (d: any) =>
              `${d.date} ${d.temp}°C ฝน ${d.rain}%`
          )
          .join("\n")
      : "ไม่มีข้อมูลแนวโน้ม";

    const hotDays = trend?.hotDays ?? 0;
    const rainDays = trend?.rainDays ?? 0;

    /* =========================
       🧠 AI PROMPT
    ========================== */

    const systemPrompt = `
คุณคือ TrueX AI ระบบช่วยตัดสินใจอัจฉริยะ

ข้อมูลวันนี้:
เมือง: ${city}
อุณหภูมิ: ${temp}°C
สภาพอากาศ: ${desc}
AQI: ${aqi}
ระดับความเสี่ยง: ${riskLevel}
สาเหตุ: ${riskReason || "ไม่มีความเสี่ยงเด่นชัด"}
นัดหมาย: '${nextEvent}'

แนวโน้ม 5 วัน:
${forecastText}

สถิติแนวโน้ม:
วันร้อนจัด (>35°C): ${hotDays} วัน
วันฝนตกหนัก (>50%): ${rainDays} วัน

กฎการตอบ:
- ตอบสั้น ไม่เกิน 3 ประโยค
- ห้ามเกริ่นนำ
- วิเคราะห์จากข้อมูลทั้งหมด
- ถามเรื่องสัปดาห์ให้ใช้ trend
- ให้คำแนะนำที่ใช้ได้จริง
- ปิดท้ายด้วยระดับความเสี่ยง (ต่ำ / ปานกลาง / สูง)
`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    if (question) {
      messages.push({
        role: "user",
        content: question,
      });
    }

    const response = await hf.chatCompletion({
      model: "meta-llama/Meta-Llama-3-8B-Instruct",
      messages,
      max_tokens: 150,
      temperature: 0.3,
    });

    let result = response.choices[0].message.content || "";
    result = result.trim().replace(/\*/g, "").replace(/#/g, "");

    return NextResponse.json({
      analysis: result,
      meta: {
        riskLevel,
        riskReason,
        riskScore,
      },
    });

  } catch (error) {
    console.error("AI API Error:", error);

    return NextResponse.json({
      analysis: "ระบบวิเคราะห์ขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง",
    });
  }
}
