// import React, { useState, useEffect, useRef } from 'react';
// import toast from 'react-hot-toast';
// import aiService from '../../services/aiService';
// import ReactMarkdown from 'react-markdown';

// const VoiceTutor = ({ documentId }) => {

//     const [isListening, setIsListening] = useState(false);
//     const [transcript, setTranscript] = useState('');
//     const [aiResponse, setAiResponse] = useState('');
//     const [aiLoading, setAiLoading] = useState(false);
//     const [isSpeaking, setIsSpeaking] = useState(false);
//     const [language, setLanguage] = useState('English');

//     const recognitionRef = useRef(null);

//     const lastQuestionRef = useRef('');

//     const detectConfusion = (text) => {

//         const confusionPhrases = [
//             'i dont understand',
//             "i don't understand",
//             'confused',
//             'hard',
//             'difficult',
//             'again',
//             'simpler',
//             'simple',
//             'simply',
//             'easy',
//             'easier',
//             'more simply',
//             'explain it',
//             'not clear',
//             'can you repeat',
//             'explain again',
//             'explain it more',
//             'explain it simply',
//             'explain it again',
//         ];


//         const lowerText = text.toLowerCase();

//         return confusionPhrases.some((phrase) =>
//             lowerText.includes(phrase)
//         );
//     };

//     const speakResponse = (text) => {

//         if (!window.speechSynthesis) {
//             return;
//         }

//         const cleanText = text.replace(/[#*_`>-]/g, '');

//         const utterance =
//             new SpeechSynthesisUtterance(cleanText);

//         utterance.lang = 'en-US';
//         utterance.rate = 1;
//         utterance.pitch = 1;
//         utterance.volume = 1;

//         setIsSpeaking(true);

//         window.speechSynthesis.cancel();
//         window.speechSynthesis.speak(utterance);

//         utterance.onend = () => {
//             setIsSpeaking(false);
//         };
//     };

//     const stopSpeaking = () => {

//         window.speechSynthesis.cancel();

//         setIsSpeaking(false);

//     };

//     const askVoiceTutor = async (question) => {

//         const isConfused = detectConfusion(question);

//         console.log("==========");
//         console.log("QUESTION:", question);
//         console.log("IS CONFUSED:", isConfused);
//         console.log("LAST QUESTION:", lastQuestionRef.current);
//         console.log("==========");

//         try {

//             setAiLoading(true);

//             let finalQuestion = question;

//             finalQuestion = `
// Answer ONLY in ${language}.

// Student Question:
// ${question}
// `;

//             // Save normal questions
//             if (!isConfused) {
//                 lastQuestionRef.current = question;
//             }

//             // Remove "Explain" from normal questions
//             if (
//                 question.toLowerCase().startsWith("explain ")
//             ) {

//                 const topic =
//                     question.replace(/explain\s+/i, "");

//                 finalQuestion = `
// Answer ONLY in ${language}.

// Teach this topic:

// ${topic}
// `;
//             }

//             // Follow-up mode
//             if (
//                 isConfused &&
//                 lastQuestionRef.current
//             ) {

//                 console.log(
//                     "FOLLOW UP MODE ACTIVATED"
//                 );

//                 const originalTopic =
//                     lastQuestionRef.current.replace(
//                         /explain\s+/i,
//                         ""
//                     );

//                 finalQuestion = `
// Answer ONLY in ${language}.

// Topic: ${originalTopic}

// The student did not understand the previous explanation.

// Teach the topic again.

// Requirements:
// - Very simple language
// - Beginner friendly
// - Short sentences
// - Real life examples
// - Step by step

// Do NOT explain the student's sentence.

// Do NOT explain phrases like:
// "Explain it more simply"
// "Explain it again"
// "Can you explain"

// Focus ONLY on:
// ${originalTopic}
// `;
//             }


//             if (language === "Hindi") {

//                 finalQuestion = `
// You are a tutor.

// IMPORTANT RULES:
// - Answer ONLY in Hindi.
// - Use Hindi script.
// - Do NOT use English.
// - Every sentence must be in Hindi.

// ${finalQuestion}
// `;

//             }

//             else if (language === "Bengali") {

//                 finalQuestion = `
// You are a tutor.

// IMPORTANT RULES:
// - Answer ONLY in Bengali.
// - Use Bengali script.
// - Do NOT use English.
// - Every sentence must be in Bengali.

// ${finalQuestion}
// `;

//             }

//             console.log("LANGUAGE STATE:", language);
//             console.log("FINAL QUESTION SENT:");
//             console.log("LANGUAGE STATE:", language);

//             console.log("LANGUAGE:", language);
//             console.log(finalQuestion);


//             const response =
//                 await aiService.explainConcept(
//                     documentId,
//                     finalQuestion
//                 );

//             setAiResponse(
//                 response.explanation
//             );

//             speakResponse(
//                 response.explanation
//             );

//         } catch (error) {

//             console.error(error);

//             toast.error(
//                 'Failed to get AI response'
//             );

//         } finally {

//             setAiLoading(false);

//         }
//     };

//     useEffect(() => {

//         const SpeechRecognition =
//             window.SpeechRecognition ||
//             window.webkitSpeechRecognition;

//         if (!SpeechRecognition) {
//             console.log(
//                 'Speech Recognition not supported'
//             );
//             return;
//         }

//         const recognition =
//             new SpeechRecognition();

//         recognition.continuous = false;
//         recognition.interimResults = false;
//         recognition.lang = 'en-US';

//         recognition.onstart = () => {

//             setIsListening(true);

//         };

//         recognition.onend = () => {

//             setIsListening(false);

//         };

//         recognition.onresult = (event) => {

//             let text =
//                 event.results[0][0].transcript;

//             text =
//                 text.charAt(0).toUpperCase() +
//                 text.slice(1);

//             setTranscript(text);

//             askVoiceTutor(text);

//         };

//         recognition.onerror = (event) => {

//             console.error(
//                 'Speech recognition error:',
//                 event.error
//             );

//             setIsListening(false);

//         };

//         recognitionRef.current =
//             recognition;

//     }, []);

//     const startListening = () => {

//         if (!recognitionRef.current) {

//             toast.error(
//                 'Speech recognition not supported'
//             );

//             return;
//         }

//         setTranscript('');
//         setAiResponse('');

//         window.speechSynthesis.cancel();

//         recognitionRef.current.start();

//     };

//     return (

//         <div className="bg-white rounded-3xl p-10 shadow-sm border border-purple-100">

//             <div className="text-center">

//                 <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-violet-500 to-pink-500 flex items-center justify-center text-white text-4xl shadow-xl">
//                     🎤
//                 </div>

//                 <h2 className="text-3xl font-bold mt-6 text-gray-800">
//                     Voice Tutor
//                 </h2>

//                 <p className="text-gray-500 mt-3 max-w-xl mx-auto leading-7">
//                     Speak naturally with your AI tutor. Ask questions about your
//                     document and get explanations instantly.
//                 </p>

//                 <div className="mt-6">

//                     <select
//                         value={language}
//                         onChange={(e) => {
//                             console.log("SELECTED:", e.target.value);
//                             setLanguage(e.target.value);
//                         }}
//                         className="px-4 py-3 rounded-xl border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
//                     >

//                         <option value="English">
//                             English
//                         </option>

//                         <option value="Hindi">
//                             Hindi
//                         </option>

//                         <option value="Bengali">
//                             Bengali
//                         </option>

//                     </select>

//                 </div>


//                 <div className="flex justify-center gap-4 mt-8">

//                     <button
//                         onClick={startListening}
//                         className="px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold shadow-lg hover:scale-105 transition-all duration-300"
//                     >
//                         🎤 Start Speaking
//                     </button>

//                     {isSpeaking && (

//                         <button
//                             onClick={stopSpeaking}
//                             className="px-8 py-4 rounded-2xl bg-red-500 text-white font-semibold shadow-lg hover:bg-red-600 transition-all duration-300"
//                         >
//                             ⏹ Stop Speaking
//                         </button>

//                     )}


//                 </div>

//                 {isListening && (
//                     <p className="mt-4 text-red-500 font-medium animate-pulse">
//                         🎤 Listening...
//                     </p>
//                 )}

//                 {isSpeaking && (
//                     <p className="mt-4 text-blue-500 font-medium animate-pulse">
//                         🔊 AI Tutor Speaking...
//                     </p>
//                 )}

//                 {transcript && (

//                     <div className="mt-10 max-w-2xl mx-auto bg-purple-50 border border-purple-200 rounded-2xl p-6 text-left">

//                         <h3 className="font-bold text-purple-700 mb-3">
//                             You said:
//                         </h3>

//                         <p className="text-gray-700 leading-8">
//                             {transcript}
//                         </p>

//                     </div>

//                 )}

//                 {aiLoading && (

//                     <div className="mt-8 text-center">

//                         <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-purple-50 border border-purple-200">

//                             <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse"></div>

//                             <span className="text-purple-700 font-medium">
//                                 AI Tutor is thinking...
//                             </span>

//                         </div>

//                     </div>

//                 )}

//                 {aiResponse && (

//                     <div className="mt-8 max-w-4xl mx-auto bg-gradient-to-r from-violet-50 to-pink-50 border border-purple-200 rounded-3xl p-8 text-left shadow-sm">

//                         <div className="flex items-center gap-3 mb-6">

//                             <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 flex items-center justify-center text-white text-xl shadow-md">
//                                 🧠
//                             </div>

//                             <div>

//                                 <h3 className="font-bold text-xl text-gray-800">
//                                     AI Voice Tutor
//                                 </h3>

//                                 <p className="text-sm text-gray-500">
//                                     Personalized explanation
//                                 </p>

//                             </div>

//                         </div>

//                         <ReactMarkdown
//                             components={{
//                                 p: ({ children }) => (
//                                     <p className="mb-5 leading-8 text-gray-700">
//                                         {children}
//                                     </p>
//                                 ),

//                                 strong: ({ children }) => (
//                                     <strong className="font-bold text-gray-900">
//                                         {children}
//                                     </strong>
//                                 ),

//                                 li: ({ children }) => (
//                                     <li className="mb-2 text-gray-700">
//                                         {children}
//                                     </li>
//                                 ),

//                                 h2: ({ children }) => (
//                                     <h2 className="text-2xl font-bold mt-6 mb-4">
//                                         {children}
//                                     </h2>
//                                 ),
//                             }}
//                         >
//                             {aiResponse}
//                         </ReactMarkdown>

//                     </div>

//                 )}

//             </div>

//         </div>

//     );

// };

// export default VoiceTutor;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import aiService from '../../services/aiService';
import ReactMarkdown from 'react-markdown';

// ─── Language Config ──────────────────────────────────────────────────────────
const LANGUAGES = {
    English: { label: 'English', flag: '🇬🇧', speechLang: 'en-US' },
    Hindi: { label: 'हिन्दी', flag: '🇮🇳', speechLang: 'hi-IN' },
    Bengali: { label: 'বাংলা', flag: '🇧🇩', speechLang: 'bn-IN' },
};

// ─── Viva Personalities ───────────────────────────────────────────────────────
const PERSONALITIES = {
    teacher: { label: 'Professor', emoji: '👨‍🏫', color: 'from-blue-500 to-indigo-500', desc: 'Calm & educational' },
    friendly: { label: 'Friendly', emoji: '😊', color: 'from-green-500 to-teal-500', desc: 'Relaxed & warm' },
    strict: { label: 'Strict Examiner', emoji: '😤', color: 'from-red-500 to-orange-500', desc: 'No mercy mode' },
    motivational: { label: 'Motivator', emoji: '🔥', color: 'from-yellow-500 to-pink-500', desc: 'High energy' },
};

// ─── Confusion Detection ──────────────────────────────────────────────────────
const CONFUSION_PHRASES = [
    "i don't understand", "i dont understand", "don't get it", "confused",
    "hard", "difficult", "again", "simpler", "simple", "simply", "easy",
    "easier", "explain it", "not clear", "can you repeat", "explain again",
    "समझ नहीं", "समझाओ", "फिर से", "বুঝলাম না", "আবার", "সহজ",
];

const isConfusedQuestion = (text) =>
    CONFUSION_PHRASES.some(p => text.toLowerCase().includes(p));

// ─── Build Tutor Prompt ───────────────────────────────────────────────────────
const LANG_PROMPTS = {
    English: `You are a friendly AI tutor. Answer ONLY in English. Be clear and educational.`,
    Hindi: `अत्यंत महत्वपूर्ण: केवल हिंदी में उत्तर दें। देवनागरी लिपि का उपयोग करें। एक भी अंग्रेजी शब्द नहीं।`,
    Bengali: `অত্যন্ত গুরুত্বপূর্ণ: শুধুমাত্র বাংলায় উত্তর দিন। বাংলা লিপি ব্যবহার করুন। ইংরেজি নয়।`,
};

const buildTutorPrompt = (question, langKey, lastTopic) => {
    const confused = isConfusedQuestion(question);
    const isExplain = question.toLowerCase().startsWith('explain ');
    const topic = isExplain ? question.replace(/^explain\s+/i, '').trim() : question;
    const sys = LANG_PROMPTS[langKey];

    if (confused && lastTopic) {
        return {
            instruction: `${sys}\n\nRe-explain "${lastTopic}" very simply with real-life examples and short sentences. Do NOT explain the student's confusion phrase. Focus ONLY on: "${lastTopic}"`,
            resolvedTopic: lastTopic
        };
    }
    if (isExplain) {
        return {
            instruction: `${sys}\n\nTeach this topic clearly: "${topic}"\nUse headings, simple examples, step-by-step.`,
            resolvedTopic: topic
        };
    }
    return {
        instruction: `${sys}\n\nStudent question: "${question}"\nAnswer clearly and helpfully.`,
        resolvedTopic: question
    };
};

// ─── Main Component ───────────────────────────────────────────────────────────
const VoiceTutor = ({ documentId }) => {
    // Mode
    const [mode, setMode] = useState('tutor'); // 'tutor' | 'viva'

    // Shared
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [language, setLanguage] = useState('English');
    const [aiLoading, setAiLoading] = useState(false);

    // Tutor mode
    const [transcript, setTranscript] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [history, setHistory] = useState([]);
    const [sessionActive, setSessionActive] = useState(false);
    const lastTopicRef = useRef('');

    // Viva mode
    const [vivaPersonality, setVivaPersonality] = useState('teacher');
    const [vivaTopic, setVivaTopic] = useState('');
    const [vivaActive, setVivaActive] = useState(false);
    const [vivaQuestion, setVivaQuestion] = useState('');
    const [vivaAnswer, setVivaAnswer] = useState('');
    const [vivaFeedback, setVivaFeedback] = useState('');
    const [vivaExchanges, setVivaExchanges] = useState([]);
    const [vivaPhase, setVivaPhase] = useState('idle'); // idle | questioning | answering | evaluating | done
    const [vivaScore, setVivaScore] = useState(0);
    const [vivaStartTime, setVivaStartTime] = useState(null);
    const [vivaDuration, setVivaDuration] = useState(0);
    const previousQuestionsRef = useRef([]);

    // Refs
    const recognitionRef = useRef(null);
    const languageRef = useRef('English');
    const vivaModeRef = useRef('tutor');
    const vivaPhaseRef = useRef('idle');
    const vivaQuestionRef = useRef('');

    useEffect(() => { languageRef.current = language; }, [language]);
    useEffect(() => { vivaModeRef.current = mode; }, [mode]);
    useEffect(() => { vivaPhaseRef.current = vivaPhase; }, [vivaPhase]);
    useEffect(() => { vivaQuestionRef.current = vivaQuestion; }, [vivaQuestion]);

    // ── TTS ──────────────────────────────────────────────────────────────────
    const speakResponse = useCallback((text, onDone) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();

        const cleanText = text.replace(/[#*_`>]/g, '').replace(/\n+/g, ' ').trim();
        if (!cleanText) { onDone?.(); return; }

        const doSpeak = () => {
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = LANGUAGES[languageRef.current]?.speechLang || 'en-US';
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 1;

            const voices = window.speechSynthesis.getVoices();
            const base = utterance.lang.split('-')[0];
            const voice = voices.find(v => v.lang === utterance.lang)
                || voices.find(v => v.lang.startsWith(base) && v.name.includes('Google'))
                || voices.find(v => v.lang.startsWith(base));
            if (voice) utterance.voice = voice;

            let keepAlive;
            utterance.onstart = () => {
                keepAlive = setInterval(() => {
                    if (!window.speechSynthesis.speaking) { clearInterval(keepAlive); return; }
                    window.speechSynthesis.pause();
                    window.speechSynthesis.resume();
                }, 10000);
            };
            utterance.onend = () => { clearInterval(keepAlive); setIsSpeaking(false); onDone?.(); };
            utterance.onerror = (e) => {
                clearInterval(keepAlive);
                setIsSpeaking(false);
                if (e.error !== 'interrupted') console.error('TTS error:', e.error);
                onDone?.();
            };

            setIsSpeaking(true);
            window.speechSynthesis.speak(utterance);
        };

        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
            window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; doSpeak(); };
        } else {
            setTimeout(doSpeak, 200);
        }
    }, []);

    const stopSpeaking = useCallback(() => {
        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
    }, []);

    // ── Tutor AI Call ─────────────────────────────────────────────────────────
    const askVoiceTutor = useCallback(async (question) => {
        const { instruction, resolvedTopic } = buildTutorPrompt(question, languageRef.current, lastTopicRef.current);
        if (!isConfusedQuestion(question)) lastTopicRef.current = resolvedTopic;

        setHistory(prev => [...prev, { role: 'user', content: question }]);
        try {
            setAiLoading(true);
            const response = await aiService.explainConcept(documentId, instruction);
            const explanation = response.explanation;
            setAiResponse(explanation);
            setHistory(prev => [...prev, { role: 'assistant', content: explanation }]);
            speakResponse(explanation);
        } catch (error) {
            console.error('VoiceTutor error:', error);
            toast.error('Failed to get AI response.');
        } finally {
            setAiLoading(false);
        }
    }, [documentId, speakResponse]);

    // ── Viva: Get next question ───────────────────────────────────────────────
    const fetchVivaQuestion = useCallback(async () => {
        try {
            setAiLoading(true);
            setVivaPhase('questioning');
            const res = await aiService.generateVivaQuestion(
                documentId,
                vivaTopic,
                vivaPersonality,
                previousQuestionsRef.current
            );
            const q = res.question;
            setVivaQuestion(q);
            previousQuestionsRef.current = [...previousQuestionsRef.current, q];

            // Speak the question, then start listening for answer
            speakResponse(q, () => {
                setVivaPhase('answering');
                setTimeout(() => startVivaListening(), 500);
            });
        } catch (err) {
            console.error(err);
            toast.error('Failed to generate viva question.');
            setVivaPhase('idle');
        } finally {
            setAiLoading(false);
        }
    }, [documentId, vivaTopic, vivaPersonality, speakResponse]);

    // ── Viva: Evaluate answer ─────────────────────────────────────────────────
    const evaluateVivaAnswer = useCallback(async (answer) => {
        try {
            setAiLoading(true);
            setVivaPhase('evaluating');
            const res = await aiService.evaluateVivaAnswer(
                documentId,
                vivaQuestionRef.current,
                answer,
                vivaPersonality
            );
            const feedback = res.feedback;
            setVivaFeedback(feedback);

            // Score logic
            const lower = feedback.toLowerCase();
            const quality = lower.includes('incorrect') || lower.includes('wrong') ? 'poor'
                : lower.includes('partially') || lower.includes('partial') ? 'partial'
                    : 'good';
            const points = quality === 'good' ? 10 : quality === 'partial' ? 5 : 0;
            setVivaScore(prev => prev + points);

            setVivaExchanges(prev => [...prev, {
                question: vivaQuestionRef.current,
                answer,
                feedback,
                quality,
                timestamp: new Date()
            }]);

            // Speak feedback, then ask next question
            speakResponse(feedback, () => {
                setTimeout(() => fetchVivaQuestion(), 1000);
            });
        } catch (err) {
            console.error(err);
            toast.error('Failed to evaluate answer.');
            setVivaPhase('answering');
        } finally {
            setAiLoading(false);
        }
    }, [documentId, vivaPersonality, speakResponse, fetchVivaQuestion]);

    // ── Speech Recognition ────────────────────────────────────────────────────
    const startVivaListening = useCallback(() => {
        if (!recognitionRef.current || vivaPhaseRef.current !== 'answering') return;
        recognitionRef.current.lang = LANGUAGES[languageRef.current]?.speechLang || 'en-US';
        try { recognitionRef.current.start(); } catch (e) { console.warn(e); }
    }, []);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);

        recognition.onresult = (event) => {
            const raw = event.results[0][0].transcript;
            const text = raw.charAt(0).toUpperCase() + raw.slice(1);

            if (vivaModeRef.current === 'viva') {
                setVivaAnswer(text);
                evaluateVivaAnswer(text);
            } else {
                setTranscript(text);
                askVoiceTutor(text);
            }
        };

        recognition.onerror = (event) => {
            setIsListening(false);
            if (event.error === 'not-allowed') {
                toast.error('Microphone access denied.');
            }
        };

        recognitionRef.current = recognition;
    }, [askVoiceTutor, evaluateVivaAnswer]);

    // ── Start Tutor Listening ─────────────────────────────────────────────────
    const startListening = () => {
        if (!recognitionRef.current || isListening) return;
        const unlock = new SpeechSynthesisUtterance('');
        unlock.volume = 0;
        window.speechSynthesis.speak(unlock);
        stopSpeaking();
        setTranscript('');
        setAiResponse('');
        setSessionActive(true);
        recognitionRef.current.lang = LANGUAGES[language]?.speechLang || 'en-US';
        try { recognitionRef.current.start(); } catch (e) { console.warn(e); }
    };

    // ── Start Viva Session ────────────────────────────────────────────────────
    const startViva = () => {
        setVivaActive(true);
        setVivaExchanges([]);
        setVivaScore(0);
        setVivaQuestion('');
        setVivaAnswer('');
        setVivaFeedback('');
        setVivaPhase('idle');
        setVivaStartTime(Date.now());
        previousQuestionsRef.current = [];

        const unlock = new SpeechSynthesisUtterance('');
        unlock.volume = 0;
        window.speechSynthesis.speak(unlock);

        const p = PERSONALITIES[vivaPersonality];
        const intro = `Viva exam starting. I am your ${p.label}. ${vivaTopic ? `We will focus on ${vivaTopic}.` : 'I will ask questions from your document.'} Let us begin.`;
        speakResponse(intro, () => setTimeout(fetchVivaQuestion, 500));
    };

    // ── End Viva Session ──────────────────────────────────────────────────────
    const isEndingRef = useRef(false);

    const endViva = async () => {
        if (isEndingRef.current) return; // prevent double clicks
        isEndingRef.current = true;

        // Force stop everything immediately
        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
        setIsListening(false);

        try { recognitionRef.current?.stop(); } catch (e) { }

        setVivaPhase('done');

        const duration = Math.floor((Date.now() - vivaStartTime) / 1000);
        setVivaDuration(duration);

        const total = vivaExchanges.length * 10;
        const pct = total > 0 ? Math.round((vivaScore / total) * 100) : 0;

        try {
            await aiService.saveVivaSession(documentId, {
                personality: vivaPersonality,
                topic: vivaTopic || 'General',
                exchanges: vivaExchanges,
                score: pct,
                duration,
            });
            toast.success('Viva session saved!');
        } catch (e) {
            console.error(e);
        } finally {
            isEndingRef.current = false;
        }
    };

    const clearTutor = () => {
        stopSpeaking();
        setTranscript('');
        setAiResponse('');
        setHistory([]);
        lastTopicRef.current = '';
        setSessionActive(false);
    };

    const currentLangConfig = LANGUAGES[language];

    // ─── RENDER ───────────────────────────────────────────────────────────────
    return (
        <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-purple-100 max-w-4xl mx-auto">

            {/* ── Mode Toggle ── */}
            <div className="flex justify-center mb-8">
                <div className="bg-gray-100 p-1 rounded-2xl flex gap-1">
                    <button
                        onClick={() => { setMode('tutor'); stopSpeaking(); setVivaActive(false); setVivaPhase('idle'); }}
                        className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${mode === 'tutor'
                            ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-md'
                            : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        🎓 Tutor Mode
                    </button>
                    <button
                        onClick={() => { setMode('viva'); stopSpeaking(); setSessionActive(false); }}
                        className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${mode === 'viva'
                            ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md'
                            : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        🎯 Viva Mode
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════════
                TUTOR MODE
            ══════════════════════════════════════════ */}
            {mode === 'tutor' && (
                <>
                    {/* Header */}
                    <div className="text-center">
                        <div className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-4xl shadow-xl transition-all duration-300 ${isListening ? 'ring-4 ring-red-400 ring-offset-4 animate-pulse scale-110' : isSpeaking ? 'ring-4 ring-blue-400 ring-offset-4' : ''}`}>
                            {isListening ? '🔴' : isSpeaking ? '🔊' : '🎤'}
                        </div>
                        <h2 className="text-3xl font-bold mt-5 text-gray-800">Voice Tutor</h2>
                        <p className="text-gray-500 mt-2 max-w-lg mx-auto text-sm leading-7">
                            Ask anything. Say <em>"explain [topic]"</em> or <em>"explain again simply"</em>.
                        </p>
                    </div>

                    {/* Language */}
                    <div className="flex justify-center gap-3 mt-6 flex-wrap">
                        {Object.entries(LANGUAGES).map(([key, val]) => (
                            <button key={key} onClick={() => { setLanguage(key); stopSpeaking(); }}
                                className={`px-5 py-2.5 rounded-xl font-semibold text-sm border-2 transition-all duration-200 ${language === key ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white border-transparent shadow-md scale-105' : 'bg-white text-gray-600 border-purple-200 hover:border-purple-400'}`}>
                                {val.flag} {val.label}
                            </button>
                        ))}
                    </div>

                    {/* Tips */}
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                        {[{ tip: '"Explain photosynthesis"', emoji: '📚' }, { tip: '"Explain again simply"', emoji: '🔄' }, { tip: '"What is IoT?"', emoji: '❓' }].map(({ tip, emoji }) => (
                            <span key={tip} className="text-xs bg-purple-50 text-purple-600 px-3 py-1.5 rounded-full border border-purple-100">{emoji} {tip}</span>
                        ))}
                    </div>

                    {/* Controls */}
                    <div className="flex justify-center gap-3 mt-8 flex-wrap">
                        <button onClick={startListening} disabled={isListening || aiLoading}
                            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isListening ? '🔴 Listening...' : '🎤 Start Speaking'}
                        </button>
                        {isSpeaking && (
                            <button onClick={stopSpeaking} className="px-8 py-4 rounded-2xl bg-red-500 text-white font-semibold shadow-lg hover:bg-red-600 transition-all">⏹ Stop</button>
                        )}
                        {sessionActive && (
                            <button onClick={clearTutor} className="px-6 py-4 rounded-2xl bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200 transition-all">🗑 Clear</button>
                        )}
                    </div>

                    {/* Status */}
                    <div className="flex justify-center gap-4 mt-4">
                        {isListening && <p className="text-red-500 font-medium animate-pulse text-sm">🎤 Listening in {currentLangConfig.label}...</p>}
                        {isSpeaking && <p className="text-blue-500 font-medium animate-pulse text-sm">🔊 AI Tutor Speaking...</p>}
                    </div>

                    {/* Transcript */}
                    {transcript && (
                        <div className="mt-8 bg-purple-50 border border-purple-200 rounded-2xl p-5 text-left">
                            <h3 className="font-bold text-purple-700 mb-2 text-xs uppercase tracking-wide">You said</h3>
                            <p className="text-gray-800 leading-7">{transcript}</p>
                        </div>
                    )}

                    {/* Loading */}
                    {aiLoading && (
                        <div className="mt-6 flex justify-center">
                            <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-purple-50 border border-purple-200">
                                <div className="flex gap-1">
                                    {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                                </div>
                                <span className="text-purple-700 font-medium">AI Tutor is thinking...</span>
                            </div>
                        </div>
                    )}

                    {/* Response */}
                    {aiResponse && (
                        <div className="mt-6 bg-gradient-to-br from-violet-50 to-pink-50 border border-purple-200 rounded-3xl p-7 text-left shadow-sm">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-lg shadow-md">🧠</div>
                                <div>
                                    <h3 className="font-bold text-gray-800">AI Voice Tutor</h3>
                                    <p className="text-xs text-gray-500">{currentLangConfig.label} · Personalized explanation</p>
                                </div>
                            </div>
                            <div className="prose prose-sm max-w-none">
                                <ReactMarkdown components={{
                                    p: ({ children }) => <p className="mb-4 leading-8 text-gray-700">{children}</p>,
                                    strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
                                    li: ({ children }) => <li className="mb-2 text-gray-700 ml-4 list-disc">{children}</li>,
                                    ul: ({ children }) => <ul className="mb-4">{children}</ul>,
                                    ol: ({ children }) => <ol className="mb-4 list-decimal ml-4">{children}</ol>,
                                    h2: ({ children }) => <h2 className="text-lg font-bold mt-4 mb-2 text-gray-900">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-2 text-gray-800">{children}</h3>,
                                    code: ({ children }) => <code className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
                                }}>{aiResponse}</ReactMarkdown>
                            </div>
                            {!isSpeaking && (
                                <button onClick={() => speakResponse(aiResponse)} className="mt-4 text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1.5">
                                    🔊 Hear again
                                </button>
                            )}
                        </div>
                    )}

                    {/* History */}
                    {history.length > 2 && (
                        <div className="mt-6">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Session History ({Math.floor(history.length / 2)} exchanges)</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {history.slice(0, -2).map((msg, i) => (
                                    <div key={i} className={`text-xs px-4 py-2.5 rounded-xl ${msg.role === 'user' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-gray-50 text-gray-600 border border-gray-100'}`}>
                                        <span className="font-semibold mr-2">{msg.role === 'user' ? '🎤 You:' : '🧠 Tutor:'}</span>
                                        {msg.content.length > 120 ? msg.content.slice(0, 120) + '...' : msg.content}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ══════════════════════════════════════════
                VIVA MODE
            ══════════════════════════════════════════ */}
            {mode === 'viva' && (
                <>
                    {/* ── Setup Screen ── */}
                    {!vivaActive && (
                        <div className="text-center">
                            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-4xl shadow-xl">🎯</div>
                            <h2 className="text-3xl font-bold mt-5 text-gray-800">Viva Mode</h2>
                            <p className="text-gray-500 mt-2 text-sm max-w-md mx-auto leading-7">
                                Experience real viva pressure. The AI asks questions, you answer by voice. Sessions are saved for review.
                            </p>

                            {/* Personality Selector */}
                            <div className="mt-8">
                                <h3 className="font-bold text-gray-700 mb-4">Choose your Examiner</h3>
                                <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                                    {Object.entries(PERSONALITIES).map(([key, val]) => (
                                        <button key={key} onClick={() => setVivaPersonality(key)}
                                            className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 ${vivaPersonality === key ? `bg-gradient-to-br ${val.color} text-white border-transparent shadow-lg scale-105` : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                                            <div className="text-2xl mb-1">{val.emoji}</div>
                                            <div className={`font-bold text-sm ${vivaPersonality === key ? 'text-white' : 'text-gray-800'}`}>{val.label}</div>
                                            <div className={`text-xs mt-0.5 ${vivaPersonality === key ? 'text-white/80' : 'text-gray-500'}`}>{val.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Topic Input */}
                            <div className="mt-6 max-w-md mx-auto">
                                <input
                                    type="text"
                                    value={vivaTopic}
                                    onChange={e => setVivaTopic(e.target.value)}
                                    placeholder="Topic to focus on (optional, e.g. IoT, OSI model)"
                                    className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm text-gray-700"
                                />
                            </div>

                            {/* Start Button */}
                            <button onClick={startViva}
                                className="mt-6 px-10 py-4 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-lg shadow-xl hover:scale-105 transition-all duration-300">
                                🚀 Start Viva
                            </button>

                            <p className="text-xs text-gray-400 mt-3">Make sure your microphone is enabled</p>
                        </div>
                    )}

                    {/* ── Active Viva ── */}
                    {vivaActive && vivaPhase !== 'done' && (
                        <div>
                            {/* Viva Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${PERSONALITIES[vivaPersonality].color} flex items-center justify-center text-2xl shadow-md`}>
                                        {PERSONALITIES[vivaPersonality].emoji}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">{PERSONALITIES[vivaPersonality].label}</h3>
                                        <p className="text-xs text-gray-500">Question {vivaExchanges.length + 1} · Score: {vivaScore}pts</p>
                                    </div>
                                </div>
                                <button
                                    onClick={endViva}
                                    disabled={isEndingRef.current}
                                    className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-all disabled:opacity-50">
                                    End Session
                                </button>
                            </div>

                            {/* Animated mic */}
                            <div className="flex justify-center mb-6">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-xl transition-all duration-300 ${vivaPhase === 'answering' && isListening
                                    ? 'bg-red-500 ring-4 ring-red-300 ring-offset-4 animate-pulse scale-110'
                                    : vivaPhase === 'questioning' && isSpeaking
                                        ? 'bg-gradient-to-br from-blue-500 to-indigo-500 ring-4 ring-blue-300 ring-offset-4'
                                        : 'bg-gradient-to-br from-red-500 to-orange-500'}`}>
                                    {vivaPhase === 'answering' && isListening ? '🔴' : isSpeaking ? '🔊' : '🎯'}
                                </div>
                            </div>

                            {/* Status */}
                            <div className="text-center mb-6">
                                {vivaPhase === 'questioning' && isSpeaking && (
                                    <p className="text-blue-600 font-medium animate-pulse">🔊 Examiner is asking...</p>
                                )}
                                {vivaPhase === 'answering' && isListening && (
                                    <p className="text-red-500 font-bold animate-pulse text-lg">🎤 Answer now! Listening...</p>
                                )}
                                {vivaPhase === 'answering' && !isListening && !aiLoading && (
                                    <button onClick={startVivaListening}
                                        className="px-8 py-3 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all animate-pulse">
                                        🎤 Tap to Answer
                                    </button>
                                )}
                                {vivaPhase === 'evaluating' && (
                                    <p className="text-orange-500 font-medium animate-pulse">⏳ Evaluating your answer...</p>
                                )}
                                {aiLoading && (
                                    <div className="flex justify-center mt-2">
                                        <div className="flex gap-1">
                                            {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Current Question */}
                            {vivaQuestion && (
                                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-4">
                                    <h4 className="text-xs font-bold text-red-600 uppercase tracking-wide mb-2">Question</h4>
                                    <p className="text-gray-800 font-medium leading-7">{vivaQuestion}</p>
                                </div>
                            )}

                            {/* Student Answer */}
                            {vivaAnswer && (
                                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 mb-4">
                                    <h4 className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-2">Your Answer</h4>
                                    <p className="text-gray-700 leading-7">{vivaAnswer}</p>
                                </div>
                            )}

                            {/* Feedback */}
                            {vivaFeedback && (
                                <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-4">
                                    <h4 className="text-xs font-bold text-green-600 uppercase tracking-wide mb-2">Examiner Feedback</h4>
                                    <p className="text-gray-700 leading-7">{vivaFeedback}</p>
                                </div>
                            )}

                            {/* Past Exchanges */}
                            {vivaExchanges.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                                        Past Questions ({vivaExchanges.length})
                                    </h4>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {vivaExchanges.map((ex, i) => (
                                            <div key={i} className={`text-xs px-4 py-2.5 rounded-xl border flex items-start gap-2 ${ex.quality === 'good' ? 'bg-green-50 border-green-200' : ex.quality === 'partial' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                                                <span>{ex.quality === 'good' ? '✅' : ex.quality === 'partial' ? '⚠️' : '❌'}</span>
                                                <span className="text-gray-700">{ex.question.length > 80 ? ex.question.slice(0, 80) + '...' : ex.question}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Viva Results ── */}
                    {vivaPhase === 'done' && (
                        <div className="text-center">
                            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-4xl shadow-xl">🏆</div>
                            <h2 className="text-2xl font-bold mt-5 text-gray-800">Viva Complete!</h2>

                            {/* Score */}
                            <div className="mt-6 grid grid-cols-3 gap-4 max-w-sm mx-auto">
                                {[
                                    { label: 'Questions', value: vivaExchanges.length, emoji: '❓' },
                                    { label: 'Score', value: `${vivaExchanges.length > 0 ? Math.round((vivaScore / (vivaExchanges.length * 10)) * 100) : 0}%`, emoji: '🎯' },
                                    { label: 'Duration', value: `${Math.floor(vivaDuration / 60)}m ${vivaDuration % 60}s`, emoji: '⏱' },
                                ].map(({ label, value, emoji }) => (
                                    <div key={label} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                        <div className="text-2xl">{emoji}</div>
                                        <div className="font-bold text-xl text-gray-800 mt-1">{value}</div>
                                        <div className="text-xs text-gray-500">{label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Weak Topics */}
                            {vivaExchanges.filter(e => e.quality !== 'good').length > 0 && (
                                <div className="mt-6 max-w-md mx-auto bg-red-50 border border-red-200 rounded-2xl p-5 text-left">
                                    <h4 className="font-bold text-red-700 mb-3 text-sm">⚠️ Topics to Revise</h4>
                                    <div className="space-y-1">
                                        {vivaExchanges.filter(e => e.quality !== 'good').map((ex, i) => (
                                            <p key={i} className="text-xs text-red-600">• {ex.question.slice(0, 70)}...</p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Q&A Review */}
                            <div className="mt-6 max-w-2xl mx-auto text-left space-y-3">
                                <h4 className="font-bold text-gray-700 text-sm">📋 Full Review</h4>
                                {vivaExchanges.map((ex, i) => (
                                    <div key={i} className={`rounded-2xl p-5 border ${ex.quality === 'good' ? 'bg-green-50 border-green-200' : ex.quality === 'partial' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                                        <p className="font-semibold text-gray-800 text-sm mb-1">Q{i + 1}: {ex.question}</p>
                                        <p className="text-gray-600 text-sm mb-1"><span className="font-medium">Your answer:</span> {ex.answer || 'No answer'}</p>
                                        <p className="text-gray-500 text-xs">{ex.feedback}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Restart */}
                            <button onClick={() => { setVivaActive(false); setVivaPhase('idle'); }}
                                className="mt-8 px-10 py-4 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold shadow-xl hover:scale-105 transition-all">
                                🔄 Try Again
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default VoiceTutor;
