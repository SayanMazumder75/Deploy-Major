import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import aiService from '../../services/aiService';
import ReactMarkdown from 'react-markdown';

const VoiceTutor = ({ documentId }) => {

    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const recognitionRef = useRef(null);

    const lastQuestionRef = useRef('');






    const detectConfusion = (text) => {

        const confusionPhrases = [
            'i dont understand',
            "i don't understand",
            'confused',
            'hard',
            'difficult',
            'again',
            'simpler',
            'simple',
            'simply',
            'easy',
            'easier',
            'more simply',
            'explain it',
            'not clear',
            'can you repeat',
            'explain again',
            'explain it more',
            'explain it simply',
            'explain it again',
        ];
       

        const lowerText = text.toLowerCase();

        return confusionPhrases.some((phrase) =>
            lowerText.includes(phrase)
        );
    };

    const speakResponse = (text) => {

        if (!window.speechSynthesis) {
            return;
        }

        const cleanText = text.replace(/[#*_`>-]/g, '');

        const utterance =
            new SpeechSynthesisUtterance(cleanText);

        utterance.lang = 'en-US';
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        setIsSpeaking(true);

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);

        utterance.onend = () => {
            setIsSpeaking(false);
        };
    };

    const stopSpeaking = () => {

        window.speechSynthesis.cancel();

        setIsSpeaking(false);

    };

   const askVoiceTutor = async (question) => {

    const isConfused = detectConfusion(question);

    console.log("==========");
    console.log("QUESTION:", question);
    console.log("IS CONFUSED:", isConfused);
    console.log("LAST QUESTION:", lastQuestionRef.current);
    console.log("==========");

    try {

        setAiLoading(true);

        let finalQuestion = question;

        // Save normal questions
        if (!isConfused) {
            lastQuestionRef.current = question;
        }

        // Remove "Explain" from normal questions
        if (
            question.toLowerCase().startsWith("explain ")
        ) {
            finalQuestion =
                question.replace(/explain\s+/i, "");
        }

        // Follow-up mode
        if (
            isConfused &&
            lastQuestionRef.current
        ) {

            console.log(
                "FOLLOW UP MODE ACTIVATED"
            );

            const originalTopic =
                lastQuestionRef.current.replace(
                    /explain\s+/i,
                    ""
                );

            finalQuestion = `
Topic: ${originalTopic}

The student did not understand the previous explanation.

Teach the topic again.

Requirements:
- Very simple language
- Beginner friendly
- Short sentences
- Real life examples
- Step by step

Do NOT explain the student's sentence.

Do NOT explain phrases like:
"Explain it more simply"
"Explain it again"
"Can you explain"

Start directly teaching the topic.
`;
        }

        console.log(
            "FINAL QUESTION SENT:"
        );
        console.log(finalQuestion);

        const response =
            await aiService.explainConcept(
                documentId,
                finalQuestion
            );

        setAiResponse(
            response.explanation
        );

        speakResponse(
            response.explanation
        );

    } catch (error) {

        console.error(error);

        toast.error(
            'Failed to get AI response'
        );

    } finally {

        setAiLoading(false);

    }
};

    useEffect(() => {

        const SpeechRecognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.log(
                'Speech Recognition not supported'
            );
            return;
        }

        const recognition =
            new SpeechRecognition();

        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {

            setIsListening(true);

        };

        recognition.onend = () => {

            setIsListening(false);

        };

        recognition.onresult = (event) => {

            let text =
                event.results[0][0].transcript;

            text =
                text.charAt(0).toUpperCase() +
                text.slice(1);

            setTranscript(text);

            askVoiceTutor(text);

        };

        recognition.onerror = (event) => {

            console.error(
                'Speech recognition error:',
                event.error
            );

            setIsListening(false);

        };

        recognitionRef.current =
            recognition;

    }, []);

    const startListening = () => {

        if (!recognitionRef.current) {

            toast.error(
                'Speech recognition not supported'
            );

            return;
        }

        setTranscript('');
        setAiResponse('');

        window.speechSynthesis.cancel();

        recognitionRef.current.start();

    };

    return (

        <div className="bg-white rounded-3xl p-10 shadow-sm border border-purple-100">

            <div className="text-center">

                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-violet-500 to-pink-500 flex items-center justify-center text-white text-4xl shadow-xl">
                    🎤
                </div>

                <h2 className="text-3xl font-bold mt-6 text-gray-800">
                    Voice Tutor
                </h2>

                <p className="text-gray-500 mt-3 max-w-xl mx-auto leading-7">
                    Speak naturally with your AI tutor. Ask questions about your
                    document and get explanations instantly.
                </p>


                <div className="flex justify-center gap-4 mt-8">

                    <button
                        onClick={startListening}
                        className="px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold shadow-lg hover:scale-105 transition-all duration-300"
                    >
                        🎤 Start Speaking
                    </button>

                    {isSpeaking && (

                        <button
                            onClick={stopSpeaking}
                            className="px-8 py-4 rounded-2xl bg-red-500 text-white font-semibold shadow-lg hover:bg-red-600 transition-all duration-300"
                        >
                            ⏹ Stop Speaking
                        </button>

                    )}


                </div>

                {isListening && (
                    <p className="mt-4 text-red-500 font-medium animate-pulse">
                        🎤 Listening...
                    </p>
                )}

                {isSpeaking && (
                    <p className="mt-4 text-blue-500 font-medium animate-pulse">
                        🔊 AI Tutor Speaking...
                    </p>
                )}

                {transcript && (

                    <div className="mt-10 max-w-2xl mx-auto bg-purple-50 border border-purple-200 rounded-2xl p-6 text-left">

                        <h3 className="font-bold text-purple-700 mb-3">
                            You said:
                        </h3>

                        <p className="text-gray-700 leading-8">
                            {transcript}
                        </p>

                    </div>

                )}

                {aiLoading && (

                    <div className="mt-8 text-center">

                        <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-purple-50 border border-purple-200">

                            <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse"></div>

                            <span className="text-purple-700 font-medium">
                                AI Tutor is thinking...
                            </span>

                        </div>

                    </div>

                )}

                {aiResponse && (

                    <div className="mt-8 max-w-4xl mx-auto bg-gradient-to-r from-violet-50 to-pink-50 border border-purple-200 rounded-3xl p-8 text-left shadow-sm">

                        <div className="flex items-center gap-3 mb-6">

                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 flex items-center justify-center text-white text-xl shadow-md">
                                🧠
                            </div>

                            <div>

                                <h3 className="font-bold text-xl text-gray-800">
                                    AI Voice Tutor
                                </h3>

                                <p className="text-sm text-gray-500">
                                    Personalized explanation
                                </p>

                            </div>

                        </div>

                        <ReactMarkdown
                            components={{
                                p: ({ children }) => (
                                    <p className="mb-5 leading-8 text-gray-700">
                                        {children}
                                    </p>
                                ),

                                strong: ({ children }) => (
                                    <strong className="font-bold text-gray-900">
                                        {children}
                                    </strong>
                                ),

                                li: ({ children }) => (
                                    <li className="mb-2 text-gray-700">
                                        {children}
                                    </li>
                                ),

                                h2: ({ children }) => (
                                    <h2 className="text-2xl font-bold mt-6 mb-4">
                                        {children}
                                    </h2>
                                ),
                            }}
                        >
                            {aiResponse}
                        </ReactMarkdown>

                    </div>

                )}

            </div>

        </div>

    );

};

export default VoiceTutor;