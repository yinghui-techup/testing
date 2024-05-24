const express = require('express');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = 3000;

const genAI = new GoogleGenerativeAI("AIzaSyCy5pwT64bxx7x3KPPQ72vwKZ--PKHfDYw");

// Middleware
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from the 'public' directory

// Endpoint to generate questions
app.post('/generate-questions', async (req, res) => {
    const { role } = req.body;
    const prompt = `List 5 interview questions for ${role}`;

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = await response.text();

        const questions = text.trim().split('\n').filter(q => q.trim() !== '');
        console.log("Generated Questions:", questions); // Log the questions

        res.json({ questions });
    } catch (error) {
        console.error("Error generating questions:", error);
        res.status(500).json({ error: 'Failed to generate questions' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
