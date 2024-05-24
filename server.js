const express = require('express');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const path = require('path');

const app = express();
const port = 3000;

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname))); // Serve static files from the root directory

// Endpoint to generate answer to specific questions
app.post('/question-answer', async (req, res) => {
    const { qnSpecific, ansSpecific } = req.body;
    const qnaprompt = `Given the following interview question and candidate's response, generate a STAR formatted answer. Ensure each part of STAR is clearly labeled.
    Interview Question: ${qnSpecific}
    Candidate's Response: ${ansSpecific}
    
    STAR Format:
    ## Situation:
    ## Task:
    ## Action:
    ## Result:`;

    console.log('Received question:', qnSpecific);
    console.log('Received answer:', ansSpecific);

    try {
        const generationConfig = {
            stopSequences: ["red"],
            maxOutputTokens: 200,
            temperature: 0.9,
            topP: 0.1,
            topK: 16,
        };

        // The Gemini 1.5 models are versatile and work with both text-only and multimodal prompts
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest', generationConfig });

        const qnaresult = await model.generateContent(qnaprompt);
        const qnaresponse = await qnaresult.response;
        const text = await qnaresponse.text();

        console.log('Raw API response text:', text);

        // Adjust the parsing logic
        const starParts = {
            situation: '',
            task: '',
            action: '',
            result: ''
        };

        const situationMatch = text.match(/## Situation:(.*?)(##|$)/s);
        console.log('Situation Match:', situationMatch);
        const taskMatch = text.match(/## Task:(.*?)(##|$)/s);
        console.log('Task Match:', taskMatch);
        const actionMatch = text.match(/## Action:(.*?)(##|$)/s);
        console.log('Action Match:', actionMatch);
        const resultMatch = text.match(/## Result:(.*?)(##|$)/s);
        console.log('Result Match:', resultMatch);

        starParts.situation = situationMatch ? situationMatch[1].trim() : '';
        starParts.task = taskMatch ? taskMatch[1].trim() : '';
        starParts.action = actionMatch ? actionMatch[1].trim() : '';
        starParts.result = resultMatch ? resultMatch[1].trim() : '';

        console.log('Extracted STAR Parts:', starParts);

        res.json({ starresponse: starParts });

    } catch (error) {
        console.error("Error generating STAR response:", error);
        res.status(500).json({ error: 'Failed to generate questions' });
    }
});














// Endpoint to generate questions
app.post('/generate-questions', async (req, res) => {
    const { role } = req.body;
    const prompt = `List 3 interview questions and their rationale for the role of ${role}. Ensure each question is preceded by '## Question:' and each rationale is preceded by '## Rationale:'. Each question and rationale should be separated by a blank line.`;

    console.log('Received role:', role); // Log the received role

    try {
        const generationConfig = {
            stopSequences: ["red"],
            maxOutputTokens: 200,
            temperature: 0.9,
            topP: 0.1,
            topK: 16,
        };

        // The Gemini 1.5 models are versatile and work with both text-only and multimodal prompts
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest', generationConfig });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = await response.text();

        console.log('Raw API response text:', text);

        // Adjust the splitting logic
        const blocks = text.split('## ').slice(1);
        console.log('Blocks after splitting:', blocks);

        const questions = [];
        for (let i = 0; i < blocks.length; i += 2) {
            const questionBlock = blocks[i].trim();
            const rationaleBlock = blocks[i + 1] ? blocks[i + 1].trim() : '';

            if (questionBlock.startsWith('Question:') && rationaleBlock.startsWith('Rationale:')) {
                const question = questionBlock.replace('Question:', '').trim();
                const rationale = rationaleBlock.replace('Rationale:', '').trim();

                console.log(`Extracted Question: ${question}`);
                console.log(`Extracted Rationale: ${rationale}`);

                questions.push({ question, rationale });
            }
        }

        console.log("Generated Questions:", questions); // Log the generated questions

        res.json({ questions });
    } catch (error) {
        console.error("Error generating questions:", error);
        res.status(500).json({ error: 'Failed to generate questions' });
    }
});

// Handle all other routes by serving the index.html file
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
