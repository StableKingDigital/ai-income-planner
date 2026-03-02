require("dotenv").config();
const express = require("express");
const OpenAI = require("openai");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let lastPlan = "";

// Load homepage
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// Generate Execution Plan
app.post("/plan", async (req, res) => {
  try {
    const { skills, hours, comfort, urgency, incomeGoal } = req.body;

    const prompt = `
You are a revenue execution operator.

User profile:
- Skills: ${skills}
- Weekly hours: ${hours}
- Comfortable speaking to clients: ${comfort}
- Needs income within 30 days: ${urgency}
- Monthly income target: ${incomeGoal}

Your job:
Generate ONE clear income execution path.

Rules:
- No multiple options.
- No motivational tone.
- No blog-style advice.
- Tactical only.
- Include scripts.
- Include close logic.
- Must fit weekly hour constraint.
- If urgency is "yes", prioritize fast close services.
- If comfort is "no", reduce high-pressure sales.

Respond EXACTLY in this structure:

==============================
FIRST DEAL EXECUTION PLAN
==============================

YOU WILL SELL:
TARGET:
WHY THEY WILL PAY:
WHERE TO FIND THEM:
EXACT MESSAGE TO SEND:
WHAT TO SAY ON THE CALL:
HOW TO CLOSE:
HOW TO DELIVER FAST:
HOW TO INCREASE PRICE:
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You think like a disciplined revenue operator. You give direct execution instructions."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.4
    });

    lastPlan = completion.choices[0].message.content;

    res.json({ plan: lastPlan });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Plan generation failed." });
  }
});

// Follow-up Handler (Structured & Tactical)
app.post("/followup", async (req, res) => {
  try {
    const { question } = req.body;

    if (!lastPlan) {
      return res.json({ reply: "Generate a plan first." });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are a tactical revenue execution operator.

Follow-up answers must:
- Stay structured.
- No generic advice.
- No long essays.
- Provide step-by-step actions.
- Provide scripts when relevant.
- Include objection handling if relevant.

Respond in this structure:

==============================
EXECUTION FOLLOW-UP
==============================

STEP 1:
STEP 2:
STEP 3:

SCRIPT (if needed):

OBJECTION RESPONSE (if needed):

NEXT MOVE:
`
        },
        { role: "user", content: `Original Plan:\n${lastPlan}` },
        { role: "user", content: `Follow-up Question:\n${question}` }
      ],
      temperature: 0.4
    });

    res.json({ reply: completion.choices[0].message.content });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Follow-up failed." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});