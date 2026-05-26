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
    const prompt = `Provide a concise summary of the following text, highlighting the key concepts, main ideas, and insights.
Keep the summary clear and structured.

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
You are an expert college viva examiner.

Based on the following study material, generate 10 viva voce questions.

Rules:
- Questions should test understanding
- Mix easy, medium, and difficult questions
- Questions should sound realistic for college oral exams
- Keep questions concise and clear
- Return ONLY the questions as numbered list

STUDY MATERIAL:
${text.substring(0, 15000)}
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
You are an expert academic tutor.

Create concise and well-structured revision notes from the following study material.

Rules:
- Keep notes exam-focused
- Use headings and bullet points
- Highlight key concepts
- Keep explanations concise
- Include important definitions if needed
- Make it suitable for last-minute revision

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
You are an expert study coach.

Create creative memory tricks and mnemonics from the following study material.

Rules:
- Generate easy-to-remember tricks
- Use funny or creative mnemonics if possible
- Keep explanations concise
- Make it useful for exam preparation
- Use bullet points and headings
- Focus on memorization techniques

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
