require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testModel(modelName) {
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        await model.generateContent("Reply ok");
        console.log(`[SUCCESS] ${modelName} works!`);
    } catch (e) {
        console.log(`[FAIL] ${modelName}:`, e.message);
    }
}

(async () => {
    await testModel("gemini-2.5-flash-lite");
    await testModel("gemini-flash-latest");
})();
