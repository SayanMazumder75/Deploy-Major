import dotenv from 'dotenv';
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

if (!process.env.GEMINI_API_KEY) {
    console.error('FATAL ERROR: GEMINI_API_KEY is not set in the environment variables.');
    process.exit(1);
}

/**
 * Generate flashcards from text
 * @param {string} text - Document text
 * @param {number} count - Number of flashcards to generate
 * @returns {Promise<Array<{question: string, answer: string, difficulty: string}>>}
 */
export const generateFlashcards = async (text, count = 10) => {
    const prompt = `Generate exactly ${count} educational flashcards from the following text.
Format each flashcard as:
Q: [Clear, specific question]
A: [Concise, accurate answer]
D: [Difficulty level: easy, medium, or hard]

Separate each flashcard with "---"

Text:
${text.substring(0, 4000)}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            // model: "gemini-1.5-flash",
            contents: prompt,
        });

        const generatedText = response.text;

        // Parse the response
        const flashcards = [];
        const cards = generatedText.split("---").filter(c => c.trim());

        for (const card of cards) {
            const lines = card.trim().split('\n');
            let question = '', answer = '', difficulty = 'medium';

            for (const line of lines) {
                if (line.startsWith('Q:')) {
                    question = line.substring(2).trim();
                } else if (line.startsWith('A:')) {
                    answer = line.substring(2).trim();
                } else if (line.startsWith('D:')) {
                    const diff = line.substring(2).trim().toLowerCase();
                    if (['easy', 'medium', 'hard'].includes(diff)) {
                        difficulty = diff;
                    }
                }
            }
            if (question && answer) {
                flashcards.push({ question, answer, difficulty });
            }
        }

        return flashcards.slice(0, count);
    } catch (error) {
        console.error('Gemini API error:', error);
        throw new Error('Failed to generate flashcards');
    }
};

// /**
//  * Generate quiz questions
//  * @param {string} text - Document text
//  * @param {number} numQuestions - Number of questions
//  * @returns {Promise<Array<{question: string, options: Array, correctAnswer: string, explanation: string, difficulty: string}>>}
//  */
// export const generateQuiz = async (text, numQuestions = 5) => {
//     const prompt = `Generate exactly ${numQuestions} multiple choice questions from the following text.
// Format each question as:
// Q: [Question]
// O1: [Option 1]
// O2: [Option 2]
// O3: [Option 3]
// O4: [Option 4]
// C: [Correct option – exactly as written above]
// E: [Brief explanation]
// D: [Difficulty: easy, medium, or hard]

// Separate questions with "---"

// Text:
// ${text.substring(0, 15000)}`;

//     try {
//         const response = await ai.models.generateContent({
//             model: "gemini-2.5-flash-lite",
//             contents: prompt,
//         });

//         const generatedText = response.text;

//         const questions = [];
//         const questionBlocks = generatedText.split("---").filter(q => q.trim());

//         for (const block of questionBlocks) {
//             const lines = block.trim().split('\n');
//             let question = '', options = [], correctAnswer = '', explanation = '', difficulty = 'medium';

//             for (const block of questionBlocks) {
//                 const lines = block.trim().split('\n');
//                 let question = '', options = [], correctAnswer = '', explanation = '', difficulty = 'medium';

//                 for (const line of lines) {
//                     const trimmed = line.trim();
//                     if (trimmed.startsWith('Q:')) {
//                         question = trimmed.substring(2).trim();
//                     } else if (trimmed.match(/^O\d:/)) {
//                         options.push(trimmed.substring(3).trim());
//                     } else if (trimmed.startsWith('C:')) {
//                         correctAnswer = trimmed.substring(2).trim();
//                     } else if (trimmed.startsWith('E:')) {
//                         explanation = trimmed.substring(2).trim();
//                     } else if (trimmed.startsWith('D:')) {
//                         const diff = trimmed.substring(2).trim().toLowerCase();
//                         if (['easy', 'medium', 'hard'].includes(diff)) {
//                             difficulty = diff;
//                         }
//                     }
//                 }

//                 if (question && options.length === 4 && correctAnswer) {
//                     questions.push({ question, options, correctAnswer, explanation, difficulty });
//                 }
//             }

//             return questions.slice(0, numQuestions);}
//         } catch (error) {
//             console.error('Gemini API error:', error);
//             throw new Error('Failed to generate quiz');
//         }
//     };

export const generateQuiz = async (text, numQuestions = 5) => {
    const prompt = `Generate exactly ${numQuestions} multiple choice questions from the following text.
Format each question as:
Q: [Question]
O1: [Option 1]
O2: [Option 2]
O3: [Option 3]
O4: [Option 4]
C: [Correct option EXACT TEXT, not O1/O2]
E: [Brief explanation]
D: [Difficulty: easy, medium, or hard]

Separate questions with "---"

Text:
${text.substring(0, 15000)}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: prompt,
        });

        const generatedText = response.text;
        console.log("GEMINI RAW OUTPUT:\n", generatedText); //hehhehe

        const questions = [];
        const questionBlocks = generatedText.split("---").filter(q => q.trim());

        for (const block of questionBlocks) {
            const lines = block.trim().split('\n');

            let question = '';
            let options = [];
            let correctAnswer = '';
            let explanation = '';
            let difficulty = 'medium';

            for (const line of lines) {
                const trimmed = line.trim();

                if (trimmed.startsWith('Q:')) {
                    question = trimmed.substring(2).trim();
                }
                else if (trimmed.match(/^O\d:/)) {
                    options.push(trimmed.substring(3).trim());
                }
                else if (trimmed.startsWith('C:')) {
                    let value = trimmed.substring(2).trim();

                    // Handle O1/O2 format
                    const match = value.match(/^O(\d)$/);
                    if (match) {
                        const index = parseInt(match[1]) - 1;
                        if (options[index]) {
                            correctAnswer = options[index];
                        }
                    } else {
                        correctAnswer = value;
                    }
                }
                else if (trimmed.startsWith('E:')) {
                    explanation = trimmed.substring(2).trim();
                }
                else if (trimmed.startsWith('D:')) {
                    const diff = trimmed.substring(2).trim().toLowerCase();
                    if (['easy', 'medium', 'hard'].includes(diff)) {
                        difficulty = diff;
                    }
                }
            }

            if (question && options.length === 4 && correctAnswer) {
                questions.push({
                    question,
                    options,
                    correctAnswer,
                    explanation,
                    difficulty
                });
            }
        }

        return questions.slice(0, numQuestions);

    } catch (error) {
        console.error('FULL ERROR:', error);
        throw error; // 👈 VERY IMPORTANT
    }
};



/**
 * Generate document summary
 * @param {string} text - Document text
 * @returns {Promise<string>}
 */
export const generateSummary = async (text) => {
    const prompt = `
Create well-structured study notes from the provided document.

Formatting Rules:
- Use proper markdown formatting
- Add clear headings and subheadings
- Leave blank lines between sections
- Use bullet points where necessary
- Make important terms bold using markdown
- Keep spacing clean and readable
- Organize content like professional study notes
- Make it easy for students to revise

The response should feel like clean digital study notes.


Text:
${text.substring(0, 20000)}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: prompt,
        });
        const generatedText = response.text;
        return generatedText;
    } catch (error) {
        console.error('Gemini API error:', error);
        throw new Error('Failed to generate summary');
    }
};

/**
 * Chat with document context
 * @param {string} question - User question
 * @param {Array<Object>} chunks - Relevant document chunks
 * @returns {Promise<string>}
 */
export const chatWithContext = async (
    question,
    chunks,
    previousMessages = []
) => {
    const context = chunks.map((c, i) => `[Chunk ${i + 1}]\n${c.content}`).join('\n\n');
    const conversationHistory = previousMessages //PHASE 2
        .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join('\n');

    const prompt = `
You are an intelligent AI Learning Tutor for college students.

Your job is to:
- teach concepts clearly
- explain in beginner-friendly language
- help students prepare for exams and viva
- give examples when useful
- simplify difficult topics
- encourage learning
- answer follow-up questions naturally

IMPORTANT RULES:
- Use the document context as primary reference
- If the user asks something slightly beyond the document, still help them
- If needed, expand using your own educational knowledge
- Format answers properly using headings and bullet points
- For technical subjects, explain step-by-step
- For programming, include examples when useful
- If the student seems confused, explain more simply
- Be conversational and supportive

PREVIOUS CONVERSATION:
${conversationHistory}

DOCUMENT CONTEXT:
${context}

STUDENT QUESTION:
${question}

AI TUTOR RESPONSE:
`;


    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: prompt,
        });

        const generatedText = response.text;
        return generatedText;
    } catch (error) {
        console.error('Gemini API error:', error);
        throw new Error('Failed to process chat request');
    }
};

/**
 * Explain a specific concept
 * @param {string} concept - Concept to explain
 * @param {string} context - Relevant context
 * @returns {Promise<string>}
 */
export const explainConcept = async (concept, context) => {
    const prompt = `Explain the concept of "${concept}" based on the following context.
Provide a clear, educational explanation that's easy to understand.
Include examples if relevant.

Context:
${context.substring(0, 10000)}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: prompt,
        });
        const generatedText = response.text;
        return generatedText;
    } catch (error) {
        console.error('Gemini API error:', error);
        throw new Error('Failed to explain concept');
    }
};

//AI ACTION CHANGE AND MODIFICATION (VIVA)
export const generateVivaQuestions = async (text) => {
    const prompt = `
Generate professional viva and oral exam questions from the study material.

IMPORTANT FORMATTING RULES:
- Use markdown formatting
- Group questions into sections using ## headings
- Add numbering for every question
- Leave spacing between questions
- Keep sections visually separated
- Make the output clean and readable for students
- Avoid huge continuous text blocks

EXAMPLE FORMAT:

## General Concepts

1. What is software design?

2. Explain modularity in software engineering.

3. What is abstraction?

## Advanced Topics

4. Explain coupling and cohesion.

5. What is architectural design?

STUDY MATERIAL:
${text.substring(0, 4000)}
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            // model: "gemini-1.5-flash",
            contents: prompt,
        });

        return response.text;

    } catch (error) {
        console.error('Gemini API error:', error);
        throw new Error('Failed to generate viva questions');
    }
};

// For Revison notes
export const generateRevisionNotes = async (text) => {
    const prompt = `
Create professional revision notes from the provided study material.

Formatting Rules:
- Use markdown formatting
- Add proper headings and subheadings
- Leave blank lines between sections
- Use bullet points for important concepts
- Highlight keywords using bold markdown
- Keep notes concise but readable
- Structure content like premium study notes
- Make it ideal for exam revision

STUDY MATERIAL:
${text.substring(0, 4000)}
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: prompt,
        });

        return response.text;

    } catch (error) {
        console.error('Gemini API error:', error);
        throw new Error('Failed to generate revision notes');
    }
};

//Memory Tricks
export const generateMemoryTricks = async (text) => {
    const prompt = `
Create visually well-structured memory tricks and mnemonics from the study material.

IMPORTANT FORMATTING RULES:
- Use proper markdown formatting
- Use ## headings for each memory trick section
- Leave blank lines between sections
- Use bullet points where appropriate
- Highlight keywords using bold markdown
- Keep tricks short, memorable, and visually clean
- Each trick should feel separated like flash-style revision notes
- Avoid long paragraphs
- Make the response highly readable for students

GOOD FORMAT EXAMPLE:

## Memory Trick 1

**Keyword:** Example

- Point 1
- Point 2

## Memory Trick 2

**Mnemonic:** Example

- Easy explanation

STUDY MATERIAL:
${text.substring(0, 4000)}
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: prompt,
        });

        return response.text;

    } catch (error) {
        console.error('Gemini API error:', error);
        throw new Error('Failed to generate memory tricks');
    }
};

// ─── ADD THESE FUNCTIONS TO YOUR geminiService.js ────────────────────────────

export const generateVivaQuestion = async (text, topic, personality, previousQuestions = []) => {
    const personalityPrompts = {
        teacher: `You are a calm, encouraging university professor conducting a viva exam. 
Ask clear, educational questions. Be supportive but thorough. 
Use phrases like "Good, now tell me...", "Can you elaborate on...", "Interesting, what about..."`,

        friendly: `You are a friendly senior student helping a junior prepare for viva. 
Ask questions casually and warmly. Keep it relaxed but educational.
Use phrases like "Okay so explain to me...", "That's cool! But what about...", "Hmm, do you know..."`,

        strict: `You are a strict, no-nonsense viva examiner. You expect precise, accurate answers.
Ask tough, direct questions. Show no mercy for vague answers. Create real exam pressure.
Use phrases like "Define exactly...", "That is incorrect. Explain properly...", "Give me a precise answer for..."`,

        motivational: `You are an enthusiastic motivational tutor who makes learning exciting.
Ask questions with energy and encouragement. Celebrate correct answers. 
Use phrases like "Amazing! Now challenge yourself with...", "You're doing great! Let's try...", "Come on, you know this one!"`
    };

    const previousQsList = previousQuestions.length > 0
        ? `\nPrevious questions already asked (DO NOT repeat these):\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
        : '';

    const prompt = `
${personalityPrompts[personality] || personalityPrompts.teacher}

You are conducting a VOICE viva exam on this study material.

RULES:
- Ask ONE question at a time
- Keep the question SHORT (1-2 sentences max) — it will be spoken aloud
- Focus on the topic: "${topic || 'general concepts from the document'}"
- Make it progressively harder if this is not the first question
- Return ONLY the question, nothing else — no labels, no explanation
${previousQsList}

STUDY MATERIAL:
${text.substring(0, 3000)}

Ask the next viva question now:
`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: prompt,
    });

    return response.text.trim();
};

export const evaluateVivaAnswer = async (question, answer, personality, documentText) => {
    const personalityFeedback = {
        teacher: "Give warm, educational feedback. Correct mistakes gently. Explain what was missing.",
        friendly: "Give casual, encouraging feedback. Keep it short and friendly.",
        strict: "Give direct, blunt feedback. Point out every mistake. No sugarcoating.",
        motivational: "Give highly enthusiastic feedback. Celebrate what was right, motivate to improve."
    };

    const prompt = `
You are a viva examiner. Evaluate the student's answer.

${personalityFeedback[personality] || personalityFeedback.teacher}

RULES:
- Keep feedback SHORT (2-4 sentences max) — it will be spoken aloud
- First say if the answer was correct, partially correct, or incorrect
- Then give the key missing point if any
- End with a transition to the next question like "Now let's move on" or "Good, next question"
- Return ONLY the feedback, no labels

QUESTION: ${question}
STUDENT ANSWER: ${answer}

DOCUMENT CONTEXT:
${documentText.substring(0, 1000)}

Your feedback:
`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: prompt,
    });

    return response.text.trim();
};

