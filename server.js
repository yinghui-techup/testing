const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bodyParser = require('body-parser');

const prisma = new PrismaClient();
const app = express();
const path = require('path');
const fs = require('fs');


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
    //const totalApplications = applications.length;
    //const firstInterviews = applications.filter(a => a.firstInterview).length;
    //const finalInterviews = applications.filter(a => a.finalInterview).length;
    //const offers = applications.filter(a => a.offer).length;

    //const firstInterviewRate = (firstInterviews / totalApplications * 100).toFixed(2);
    //const finalInterviewRate = (finalInterviews / firstInterviews * 100).toFixed(2);
    //const offerRate = (offers / finalInterviews * 100).toFixed(2);

    const totalApplications = applications.length;
    const firstInterviews = applications.filter(a => a.firstInterview).length;
    const secondInterviews = applications.filter(a => a.secondInterview).length;
    const finalInterviews = applications.filter(a => a.finalInterview).length;
    const offers = applications.filter(a => a.offer).length;
    
    const firstInterviewRate = totalApplications > 0 ? (firstInterviews / totalApplications * 100).toFixed(2) : "0.00";
    const secondInterviewRate = firstInterviews > 0 ? (secondInterviews / firstInterviews * 100).toFixed(2) : "0.00";
    const finalInterviewRate = secondInterviews > 0 ? (finalInterviews / secondInterviews * 100).toFixed(2) : "0.00";
    const offerRate = finalInterviews > 0 ? (offers / finalInterviews * 100).toFixed(2) : "0.00";
    



    res.render('pages/index', {
        applications,
        totalApplications,
        firstInterviews,
        secondInterviews,
        finalInterviews,
        offers,
        firstInterviewRate,
        secondInterviewRate,
        finalInterviewRate,
        offerRate
    });
});


// adding industries
//const industries = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'industries.json'), 'utf8'));

// Route to display the form
app.get('/create', (req, res) => {
    fs.readFile(path.join(__dirname, 'data', 'industries.json'), 'utf8', (err, data) => {
        if (err) {
            // Properly handle the error, maybe render an error page or send an error status
            console.error("Failed to read industries file:", err);
            res.status(500).send("Error loading page data.");
            return;
        }
        const industries = JSON.parse(data).industries;
        res.render('pages/create', { industries });
    });
});


app.post('/applications', async (req, res) => {
    console.log(req.body);  // Log the full request body to see what is being submitted

    const {
        name,
        company,
        role,
        industry,
        status,
        applied,
        firstInterview,
        secondInterview,
        finalInterview,
        offer,
        notes
    } = req.body;

    try {
        await prisma.jobApplication.create({
            data: {
                name,
                company,
                role,
                industry,
                status,
                applied: applied === 'on',  // Checkboxes return 'on' if checked
                firstInterview: firstInterview === 'on',
                secondInterview: secondInterview === 'on',
                finalInterview: finalInterview === 'on',
                offer: offer === 'on',
                notes
            }
        });
        res.redirect('/job-tracker'); // Adjust the redirect to your success page
    } catch (error) {
        console.error('Failed to create job application:', error);
        res.status(500).send('Error creating job application');
    }

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




///////////////////////////THIS IS TO CREATE FUNNEL VIEW///////////////







