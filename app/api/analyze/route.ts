export const runtime = "nodejs";
import { InferenceClient } from "@huggingface/inference";
import { NextResponse } from "next/server";

const hfToken = process.env.HF_TOKEN;

if (!hfToken) {
  console.error("HF_TOKEN is missing");
}

const hf = hfToken ? new InferenceClient(hfToken) : null;

export async function POST(req: Request) {
  try {

    if (!hf) {
      return NextResponse.json(
        { analysis: "AI service not configured (missing HF_TOKEN)" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { analysis: "Invalid request body" },
        { status: 400 }
      );
    }

    const {
      aqi = 0,
      pm25 = 0,
      temp = 0,
      desc = "ไม่ทราบสภาพอากาศ",
      nextEvent = "ไม่มีนัดหมาย",
      question = null,
      city = "พื้นที่ของคุณ",
      forecast = [],
      trend = {},
    } = body;

    /* =========================
       VOICE COMMAND DETECTION
    ========================== */

    if (question) {

      const q = question.toLowerCase();

      if (
        q.includes("เปิดเครื่องกรอง") ||
        q.includes("เปิดเครื่องฟอก")
      ) {
        return NextResponse.json({
          action: "PURIFIER_ON",
          analysis: "เปิดเครื่องกรองอากาศให้แล้วครับ",
        });
      }

      if (
        q.includes("ปิดเครื่องกรอง") ||
        q.includes("ปิดเครื่องฟอก")
      ) {
        return NextResponse.json({
          action: "PURIFIER_OFF",
          analysis: "ปิดเครื่องกรองอากาศเรียบร้อยแล้วครับ",
        });
      }

      if (
        q.includes("สถานะเครื่องฟอก") ||
        q.includes("เครื่องฟอกทำงานไหม")
      ) {
        return NextResponse.json({
          analysis:
            pm25 > 50
              ? "ตอนนี้ฝุ่นค่อนข้างสูง แนะนำให้เปิดเครื่องฟอกอากาศ"
              : "ตอนนี้อากาศยังดี เครื่องฟอกอาจยังไม่จำเป็น",
        });
      }
    }

    /* =========================
       Risk Calculation
    ========================== */

    let riskScore = 0;
    let riskReason: string[] = [];

    if (aqi > 150) {
      riskScore += 40;
      riskReason.push("ค่าฝุ่น AQI อันตราย");
    } else if (aqi > 100) {
      riskScore += 25;
      riskReason.push("AQI เริ่มกระทบสุขภาพ");
    }

    if (pm25 > 120) {
      riskScore += 40;
      riskReason.push("PM2.5 อันตรายมาก");
    } else if (pm25 > 75) {
      riskScore += 25;
      riskReason.push("PM2.5 สูง");
    } else if (pm25 > 50) {
      riskScore += 15;
      riskReason.push("PM2.5 เริ่มกระทบสุขภาพ");
    }

    if (
      desc?.toLowerCase().includes("rain") ||
      desc?.includes("ฝน")
    ) {
      riskScore += 20;
      riskReason.push("มีฝน ถนนลื่น");
    }

    if (temp > 37) {
      riskScore += 15;
      riskReason.push("อุณหภูมิสูง");
    }

    let riskLevel: "ต่ำ" | "ปานกลาง" | "สูง" = "ต่ำ";

    if (riskScore > 70) riskLevel = "สูง";
    else if (riskScore > 40) riskLevel = "ปานกลาง";

    /* =========================
       Forecast Summary
    ========================== */

    const forecastText =
      Array.isArray(forecast) && forecast.length
        ? forecast
            .map(
              (d: any) =>
                `${d.date ?? "-"} ${d.temp ?? "-"}°C ฝน ${d.rain ?? 0}%`
            )
            .join("\n")
        : "ไม่มีข้อมูลแนวโน้ม";

    const hotDays = trend?.hotDays ?? 0;
    const rainDays = trend?.rainDays ?? 0;

    /* =========================
       AI PROMPT
    ========================== */

    const systemPrompt = `
คุณคือ TrueX AI ระบบช่วยตัดสินใจอัจฉริยะ

ข้อมูลวันนี้:
เมือง: ${city}
อุณหภูมิ: ${temp}°C
สภาพอากาศ: ${desc}
AQI: ${aqi}
PM2.5: ${pm25}
ระดับความเสี่ยง: ${riskLevel}
สาเหตุ: ${riskReason.length ? riskReason.join(", ") : "ไม่มีความเสี่ยงเด่นชัด"}
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
- ให้คำแนะนำที่ใช้ได้จริง
- หาก PM2.5 สูง ให้แนะนำเปิดเครื่องฟอกอากาศ
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
      max_tokens: 180,
      temperature: 0.2,
    });

    const aiText =
      response?.choices?.[0]?.message?.content ?? "";

    if (!aiText) {
      return NextResponse.json(
        { analysis: "AI ไม่สามารถสร้างคำตอบได้" },
        { status: 500 }
      );
    }

    const cleaned = aiText
      .trim()
      .replace(/\*/g, "")
      .replace(/#/g, "");

    return NextResponse.json({
      analysis: cleaned,
      meta: {
        riskLevel,
        riskReason,
        riskScore,
      },
    });

  } catch (error) {

    console.error("AI API Error:", error);

    return NextResponse.json(
      {
        analysis:
          "ระบบวิเคราะห์ขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง",
      },
      { status: 500 }
    );
  }
}