const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bodyParser = require('body-parser');

const prisma = new PrismaClient();
const app = express();
const path = require('path');
const fs = require('fs').promises;


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


app.get('/about',(req,res)=>{
    res.render('pages/about');
});






/////////////////////JOB TRACKING PORTION////////////////////////////////////////////////
//------------------CREATE AND SUBMIT A RECORD------------------------------------------


app.get('/job-tracker', async (req, res) => {
    const applications = await prisma.jobApplication.findMany();


    const totalApplications = applications.length;
    const firstInterviews = applications.filter(a => a.firstInterview).length;
    const secondInterviews = applications.filter(a => a.secondInterview).length;
    const finalInterviews = applications.filter(a => a.finalInterview).length;
    const offers = applications.filter(a => a.offer).length;
    
    const firstInterviewRate = totalApplications > 0 ? (firstInterviews / totalApplications * 100).toFixed(0) : "0";
    const secondInterviewRate = firstInterviews > 0 ? (secondInterviews / firstInterviews * 100).toFixed(0) : "0";
    const finalInterviewRate = secondInterviews > 0 ? (finalInterviews / secondInterviews * 100).toFixed(0) : "0";
    const offerRate = finalInterviews > 0 ? (offers / finalInterviews * 100).toFixed(0) : "0";
    



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
app.get('/create', async (req, res) => {
    try {
        const industriesData = await fs.readFile(path.join(__dirname, 'data', 'industries.json'), 'utf8');
        const sourcesData = await fs.readFile(path.join(__dirname, 'data', 'sources.json'), 'utf8');
        
        const industries = JSON.parse(industriesData).industries;
        const sources = JSON.parse(sourcesData).sources;
        
        res.render('pages/create', { industries, sources });
    } catch (err) {
        // Properly handle the error, maybe render an error page or send an error status
        console.error("Failed to read file:", err);
        res.status(500).send("Error loading page data.");
    }
});


app.post('/applications', async (req, res) => {
    console.log(req.body);  // Log to ensure all data is coming through

    const {
        name,
        company,
        role,
        industry,
        source, // Make sure source is being captured
        status,
        applied,
        firstInterview,
        secondInterview,
        finalInterview,
        offer,
        notes
    } = req.body;

    console.log('Source:', source); // Verify that source is being logged correctly

    try {
        await prisma.jobApplication.create({
            data: {
                name,
                company,
                role,
                industry,
                source,  // Ensure this is included
                status,
                applied: applied === 'on',  // Convert checkbox value
                firstInterview: firstInterview === 'on',
                secondInterview: secondInterview === 'on' || false, // Handle potentially undefined values
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
    try {
        const application = await prisma.jobApplication.findUnique({
            where: { id: parseInt(req.params.id) }
        });

        if (!application) {
            res.status(404).send('Application not found');
            return;
        }

        // Paths to JSON files
        const industriesPath = path.join(__dirname, 'data', 'industries.json');
        const sourcesPath = path.join(__dirname, 'data', 'sources.json');

        // Read both files asynchronously
        const [industriesData, sourcesData] = await Promise.all([
            fs.readFile(industriesPath, 'utf8'),
            fs.readFile(sourcesPath, 'utf8')
        ]);

        // Parse data from files
        const industries = JSON.parse(industriesData).industries;
        const sources = JSON.parse(sourcesData).sources;

        // Render the edit page with application, industries, and sources data
        res.render('pages/edit', {
            application,
            industries,
            sources
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Server error');
    }
});



app.post('/edit/:id', async (req, res) => {
    const { id } = req.params;
    const {
        name,
        company,
        role,
        industry,
        source,
        status,
        applied,
        firstInterview,
        secondInterview,
        finalInterview,
        offer,
        notes
    } = req.body;

    try {
        await prisma.jobApplication.update({
            where: { id: parseInt(id) },
            data: {
                name: name,
                company: company,
                role: role,
                industry: industry,
                source: source,
                status: status,
                applied: applied === 'on',
                firstInterview: firstInterview === 'on',
                secondInterview: secondInterview === 'on',
                finalInterview: finalInterview === 'on',
                offer: offer === 'on',
                notes: notes
            }
        });
        res.redirect('/job-tracker');  // Redirect to the index or listing page
    } catch (error) {
        console.error('Failed to update job application:', error);
        res.status(500).send('Error updating job application');
    }
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
    const prompt = `Generate a concise overview for excelling in the role of ${role}. Provide the information within one paragraph only. Mark this section with "Role Advice Start:" and end it with "Role Advice End:".

    List 2 interview questions focused on hard skills necessary for the role of ${role}. Mark this section with "Hard Skills Start:" and end it with "Hard Skills End:". Ensure each question is preceded by '## Question:' and each rationale is preceded by '## Rationale:'. Each question and rationale should be separated by a blank line.
    
    List 2 interview questions focused on soft skills necessary for the role of ${role}. Start this section with "Soft Skills Start:" and end it with "Soft Skills End:". Ensure each question is preceded by '## Question:' and each rationale is preceded by '## Rationale:'. Each question and rationale should be separated by a blank line.`;
    
    try {
       /* const generationConfig = {
            stopSequences: ["Role Advice End:", "Hard Skills End:", "Soft Skills End:"],
            maxOutputTokens: 800,
            temperature: 0.7,
            topP: 0.9,
            topK: 40,
        };*/

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest'});
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = await response.text();

        console.log('Raw API response text:', text);  // For debugging

        const roleAdviceMatch = text.match(/Role Advice Start:(.*?)Role Advice End:/s);
        const hardSkillsMatch = text.match(/Hard Skills Start:([\s\S]*?)Hard Skills End:/);
        const softSkillsMatch = text.match(/Soft Skills Start:([\s\S]*?)Soft Skills End:/);

        const roleAdvice = roleAdviceMatch ? roleAdviceMatch[1].trim().replace(/#\s*$/, '') : 'No advice available.';
        const hardSkills = hardSkillsMatch ? parseQuestions(hardSkillsMatch[1].trim()) : [];
        const softSkills = softSkillsMatch ? parseQuestions(softSkillsMatch[1].trim()) : [];

        console.log('Hard Skills:', hardSkills);  // Debugging output
        console.log('Soft Skills:', softSkills);  // Debugging output

        res.json({
            roleAdvice,
            hardSkills,
            softSkills
        });
    } catch (error) {
        console.error("Error generating questions:", error);
        res.status(500).json({ error: 'Failed to generate questions' });
    }
});

function parseQuestions(text) {
    // Trim unwanted trailing "#" and split by "## Question:"
    return text.replace(/##\s*$/, '').split('## Question:').slice(1).map(question => {
        // Split each question by "## Rationale:"
        const parts = question.split('## Rationale:');
        if (parts.length >= 2) {
            return {
                question: parts[0].trim(),
                rationale: parts[1].trim() + "\n" // Adding a newline for spacing in the display.
            };
        }
        return null; // In case the split does not yield two parts.
    }).filter(q => q); // Filter out any null entries due to improper splits.
}



//----------PROMPT TO GENERATE STAR RESPONSE TO SPECFIC INTERVIEW QUESTIONS--------------------------------
// Endpoint to generate answer to specific questions


app.post('/question-answer', async (req, res) => {
    const { qnSpecific, ansSpecific } = req.body;
    console.log('Endpoint Hit: /question-answer');
    console.log('Received question:', qnSpecific);
    console.log('Received answer:', ansSpecific);

    const qnaprompt = `Given the following interview question and candidate's response, generate a STAR formatted answer. Ensure each part of STAR is clearly labeled and kept to one paragraph respectively.
    Interview Question: ${qnSpecific}
    Candidate's Response: ${ansSpecific}
    
    STAR Format:
    ## Situation:
    ## Task:
    ## Action:
    ## Result:
        
    `;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
        const result = await model.generateContent(qnaprompt);
        const response = await result.response;  // Assuming response contains the textual data
        const text = await response.text();

        console.log('Raw API response text:', text);

        // Check if the response is the special case for insufficient information
       // if (text.startsWith("Sorry, need more information.")) {
       //     res.json({ error: "Sorry, need more information." });
        //} else {
            const starParts = parseStarResponse(text);
            res.json({ starresponse: starParts });
       // }
    } catch (error) {
        console.error("Error generating STAR response:", error);
        res.status(500).json({ error: 'Failed to generate questions' });
    }
});

function parseStarResponse(text) {
    const starParts = {
        situation: '',
        task: '',
        action: '',
        result: ''
    };

    const situationMatch = text.match(/## Situation:(.*?)(##|$)/s);
    const taskMatch = text.match(/## Task:(.*?)(##|$)/s);
    const actionMatch = text.match(/## Action:(.*?)(##|$)/s);
    const resultMatch = text.match(/## Result:(.*?)(##|$)/s);

    starParts.situation = situationMatch ? situationMatch[1].trim() : '';
    starParts.task = taskMatch ? taskMatch[1].trim() : '';
    starParts.action = actionMatch ? actionMatch[1].trim() : '';
    starParts.result = resultMatch ? resultMatch[1].trim() : '';

    return starParts;
}



/////////////////////END OF STAR ANSWER PORTION////////////////////////////////////////////////











