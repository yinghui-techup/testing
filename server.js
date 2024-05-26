const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bodyParser = require('body-parser');

const prisma = new PrismaClient();
const app = express();
const path = require('path');


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));  // Ensure this is set to the correct directory

// Correctly pointing to the 'public' directory
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: function (res, path, stat) {
        console.log("Serving:", path);
    }
}));

app.use(bodyParser.urlencoded({ extended: true }));
// Make node_modules accessible to the browser
app.use('/scripts', express.static(`${__dirname}/node_modules/`));


///////////////////// Middleware for the GEN AI PART//////////////////////////////////////
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
app.use(bodyParser.json());




/////////////////////Routes setup////////////////////////////////////////////////
// Routes setup will be added here

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

app.get('/', (req, res) => {
    res.render('landing');
});

// Route to serve the interview page
app.get('/interviews', (req, res) => {
    res.render('pages/interview');
});

app.get('/index', (req, res) => {
    res.render('pages/index');
});

// Handle all other routes by serving the index.html file - i am not sure if this is correct anymore
//app.get('*', (req, res) => {
//    res.sendFile(path.join(__dirname, 'interview.ejs'));
//});








/////////////////////JOB TRACKING PORTION////////////////////////////////////////////////
//------------------CREATE AND SUBMIT A RECORD------------------------------------------


app.get('/job-tracker', async (req, res) => {
    const applications = await prisma.jobApplication.findMany();
    const totalApplications = applications.length;
    const firstInterviews = applications.filter(a => a.firstInterview).length;
    const finalInterviews = applications.filter(a => a.finalInterview).length;
    const offers = applications.filter(a => a.offer).length;

    const firstInterviewRate = (firstInterviews / totalApplications * 100).toFixed(2);
    const finalInterviewRate = (finalInterviews / firstInterviews * 100).toFixed(2);
    const offerRate = (offers / finalInterviews * 100).toFixed(2);

    res.render('pages/index', {
        applications,
        totalApplications,
        firstInterviews,
        finalInterviews,
        offers,
        firstInterviewRate,
        finalInterviewRate,
        offerRate
    });
});


app.get('/create', (req, res) => {
    res.render('pages/create');
});

app.post('/applications', async (req, res) => {
    const { company, role, status } = req.body;
    await prisma.jobApplication.create({
        data: {
            company,
            role,
            status, // Add status to data creation
            hiringManager: req.body.hiringManager || '',
            applied: req.body.applied === 'on',
            firstInterview: req.body.firstInterview === 'on',
            finalInterview: req.body.finalInterview === 'on',
            offer: req.body.offer === 'on',
            notes: req.body.notes || ''
        }
    });
    res.redirect('/');
});


//------------------EDIT A RECORD------------------------------------------

app.get('/edit/:id', async (req, res) => {
    const application = await prisma.jobApplication.findUnique({
        where: { id: parseInt(req.params.id) }
    });
    res.render('pages/edit', { application });
});

app.post('/edit/:id', async (req, res) => {
    const { id } = req.params;
    await prisma.jobApplication.update({
        where: { id: parseInt(id) },
        data: {
            company: req.body.company,
            role: req.body.role,
            status: req.body.status, // Update status

            hiringManager: req.body.hiringManager,
            applied: req.body.applied === 'on',
            firstInterview: req.body.firstInterview === 'on',
            finalInterview: req.body.finalInterview === 'on',
            offer: req.body.offer === 'on',
            notes: req.body.notes
        }
    });
    res.redirect('/');
});
/////////////////////END OF JOB TRACKING PORTION////////////////////////////////////////////////




//THIS IS THE GENAI PART!!!!
//SECOND ROW JUST FOR ME TO EASY SCROLL DOWN AND IDENTIFY THIS PORTION!!!
// THIRD ONE COS I BLIND

//////////GENAI: GENERATE INTERVIEW QUESTIONS AND ANSWERS///////////////////////////////////
//------------------PROMPT TO GENERATE INTERVIEW QUESTIONS!----------------------------------------
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


//----------PROMPT TO GENERATE STAR RESPONSE TO SPECFIC INTERVIEW QUESTIONS--------------------------------
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

/////////////////////END OF STAR ANSWER PORTION////////////////////////////////////////////////



















//AFTER INTERGRATION OF BOOTSTRAP LANDING TO GENAI, THIS IS A SHOWSTOPPER SO COMMENTED OUT
//app.listen(port, () => {
//    console.log(`Server running at http://localhost:${port}`);
//});
