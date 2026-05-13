import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";

// const getQuizzesForDocument = async (documentId) => {
//     try {
//         const response = await axiosInstance.get(API_PATHS.QUIZZES.GET_QUIZZES_FOR_DOC(documentId));
//         // return response.data;
//         // setQuizzes(response.data);

//     } catch (error) {
//         throw error.response?.data || { message: 'Failed to fetch quizzes' };
//     }
// };
const getQuizzesForDocument = async (documentId) => {
    try {
        const response = await axiosInstance.get(
            API_PATHS.QUIZZES.GET_QUIZZES_FOR_DOC(documentId)
        );

        return response.data;

    } catch (error) {

        console.log("FULL QUIZ ERROR:", error);

        console.log("ERROR RESPONSE:", error.response);

        console.log("ERROR DATA:", error.response?.data);

        throw error.response?.data || {
            message: 'Failed to fetch quizzes'
        };
    }
};

// const getQuizById = async (quizId) => {
//     try {
//         const response = await axiosInstance.get(API_PATHS.QUIZZES.GET_QUIZ_BY_ID(quizId));
//         // return response.data;
//         setQuizzes(response.data);
//     } catch (error) {
//         throw error.response?.data || { message: 'Failed to fetch quiz' };
//     }
// };
const getQuizById = async (quizId) => {
    try {
        const response = await axiosInstance.get(
            API_PATHS.QUIZZES.GET_QUIZ_BY_ID(quizId)
        );

        return response.data;

    } catch (error) {
        throw error.response?.data || {
            message: 'Failed to fetch quiz'
        };
    }
};

const submitQuiz = async (quizId, answers) => {
    try {
        const response = await axiosInstance.post(
            API_PATHS.QUIZZES.SUBMIT_QUIZ(quizId),
            { answers }
        );
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to submit quiz' };
    }
};

const getQuizResults = async (quizId) => {
    try {
        const response = await axiosInstance.get(
            API_PATHS.QUIZZES.GET_QUIZ_RESULTS(quizId)
        );
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch quiz results' };
    }
};

const deleteQuiz = async (quizId) => {
    try {
        const response = await axiosInstance.delete(
            API_PATHS.QUIZZES.DELETE_QUIZ(quizId)
        );
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to delete quiz' };
    }
};

const quizService = {
    getQuizzesForDocument,
    getQuizById,
    submitQuiz,
    getQuizResults,
    deleteQuiz,
};

export default quizService;