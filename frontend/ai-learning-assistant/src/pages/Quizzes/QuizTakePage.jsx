import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import quizService from '../../services/quizService';
import PageHeader from '../../components/common/PageHeader';
import Spinner from '../../components/common/Spinner';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';

const QuizTakePage = () => {

  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const response = await quizService.getQuizById(quizId);
        setQuiz(response.data);
      } catch (error) {
        toast.error('Failed to fetch quiz.');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId]);

  const handleOptionChange = (questionId, optionIndex) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    setSubmitting(true);

    try {
      const formattedAnswers = Object.keys(selectedAnswers).map(questionId => {
        const question = quiz.questions.find(q => q._id === questionId);
        const questionIndex = quiz.questions.findIndex(q => q._id === questionId);
        const optionIndex = selectedAnswers[questionId];
        const selectedAnswer = question.options[optionIndex];

        return { questionIndex, selectedAnswer };
      });

      await quizService.submitQuiz(quizId, formattedAnswers);

      toast.success('Quiz submitted successfully!');
      navigate(`/quizzes/${quizId}/results`);

    } catch (error) {
      toast.error(error.message || 'Failed to submit quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (!quiz || quiz.questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="items-center">
          <p className="text-purple-600 text-lg">
            Quiz not found or has no questions.
          </p>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title={quiz.title || 'Take Quiz'} />

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">

          <span className="text-sm font-semibold text-purple-700">
            Question {currentQuestionIndex + 1} of {quiz.questions.length}
          </span>

          <span className="text-sm font-medium text-purple-500">
            {answeredCount} answered
          </span>
        </div>

        <div className="relative h-2 bg-purple-100 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%`
            }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white/80 backdrop-blur-xl border-2 border-purple-200 rounded-2xl shadow-xl shadow-purple-200/40 p-6 mb-8">

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl">

          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />

          <span className="text-sm font-semibold text-purple-700">
            Question {currentQuestionIndex + 1}
          </span>

        </div>

        <h3 className="text-lg font-semibold text-slate-900 mb-6 leading-relaxed">
          {currentQuestion.question}
        </h3>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => {

            const isSelected =
              selectedAnswers[currentQuestion._id] === index;

            return (
              <label
                key={index}
                className={`group relative flex items-center p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-500/10'
                    : 'border-slate-200 bg-slate-50/50 hover:border-purple-300 hover:bg-white hover:shadow-md'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion._id}`}
                  value={index}
                  checked={isSelected}
                  onChange={() =>
                    handleOptionChange(currentQuestion._id, index)
                  }
                  className="sr-only"
                />

                <div
                  className={`shrink-0 w-5 h-5 rounded-full border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-purple-500 bg-purple-500'
                      : 'border-slate-300 bg-white group-hover:border-purple-400'
                  }`}
                >
                  {isSelected && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>

                <span
                  className={`ml-4 text-sm font-medium transition-colors duration-200 ${
                    isSelected
                      ? 'text-purple-900'
                      : 'text-slate-700 group-hover:text-slate-900'
                  }`}
                >
                  {option}
                </span>

                {isSelected && (
                  <CheckCircle2
                    className="ml-auto w-5 h-5 text-purple-500"
                    strokeWidth={2.5}
                  />
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4">

        <Button
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0 || submitting}
          variant="secondary"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
          Previous
        </Button>

        {currentQuestionIndex === quiz.questions.length - 1 ? (
          <button
            onClick={handleSubmitQuiz}
            disabled={submitting}
            className="group relative px-8 h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold text-sm rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Submit Quiz
                </>
              )}
            </span>
          </button>
        ) : (
          <Button onClick={handleNextQuestion} disabled={submitting}>
            Next
            <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuizTakePage;