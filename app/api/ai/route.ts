import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API 키가 설정되지 않았습니다. .env 파일을 확인해주세요." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { action, text, title, dueDate, dDayText, currentDate } = body;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    if (action === "parse-natural-language") {
      if (!text || typeof text !== "string") {
        return NextResponse.json(
          { error: "파싱할 자연어 텍스트를 입력해주세요." },
          { status: 400 }
        );
      }

      const todayStr = currentDate || new Date().toISOString().split("T")[0];

      const prompt = `
You are an AI assistant for a university assignment deadline manager.
The current reference date is today: "${todayStr}".
Extract the assignment title and due date from the user's natural language input.

Input text: "${text}"

Rules:
1. Title: Clean assignment title (max 50 characters, remove dates/times words from title).
2. DueDate: Target date in YYYY-MM-DD format based on today's reference date (${todayStr}). If no year is specified, assume the current or next upcoming year.
3. If the parsed date is before today (${todayStr}), adjust to today or future date.
4. Output MUST be valid JSON with the exact schema:
{
  "title": "extracted assignment title",
  "dueDate": "YYYY-MM-DD",
  "summary": "brief summary of parsed result in Korean"
}
`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Gemini API Error:", errText);
        return NextResponse.json(
          { error: "Gemini API 호출에 실패했습니다." },
          { status: response.status }
        );
      }

      const data = await response.json();
      const rawJsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsedData = JSON.parse(rawJsonStr || "{}");

      return NextResponse.json({ success: true, result: parsedData });
    }

    if (action === "generate-guide") {
      if (!title || !dueDate) {
        return NextResponse.json(
          { error: "과제명과 마감일 정보가 필요합니다." },
          { status: 400 }
        );
      }

      const prompt = `
You are an expert AI study coach for college students.
Analyze the assignment titled "${title}" due on "${dueDate}" (Current status: ${dDayText}).

Generate a practical, structured study/work plan in Korean.

Output MUST be valid JSON with the exact schema:
{
  "motivation": "A 1-2 sentence motivating or realistic advice based on D-Day status (${dDayText}).",
  "todayTask": "Clear, single key task the student should complete TODAY.",
  "breakdown": [
    { "step": 1, "task": "First preparation step", "duration": "estimated time (e.g. 1시간)" },
    { "step": 2, "task": "Core execution step", "duration": "estimated time (e.g. 2시간)" },
    { "step": 3, "task": "Final review and submission step", "duration": "estimated time (e.g. 30분)" }
  ]
}
`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Gemini API Error:", errText);
        return NextResponse.json(
          { error: "Gemini API 호출에 실패했습니다." },
          { status: response.status }
        );
      }

      const data = await response.json();
      const rawJsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsedData = JSON.parse(rawJsonStr || "{}");

      return NextResponse.json({ success: true, result: parsedData });
    }

    return NextResponse.json({ error: "지원하지 않는 action입니다." }, { status: 400 });
  } catch (error: any) {
    console.error("Server API Error:", error);
    return NextResponse.json(
      { error: error.message || "서버 내부 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
