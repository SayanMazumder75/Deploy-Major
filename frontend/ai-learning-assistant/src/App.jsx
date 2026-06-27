import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
const LandingPage = React.lazy(() => import('./pages/Landing/LandingPage'));
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';
import NotFoundPage from './pages/Quizzes/NotFoundPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import DocumentListPage from './pages/Documents/DocumentListPage';
import DocumentDetailPage from './pages/Documents/DocumentDetailPage';
import FlashcardListPage from './pages/Flashcards/FlashcardListPage';
import FlashcardPage from './pages/Flashcards/FlashcardPage';
import QuizTakePage from './pages/Quizzes/QuizTakePage';
import QuizResultPage from './pages/Quizzes/QuizResultPage';
import ProfilePage from './pages/Profile/ProfilePage';
const MeetingAssistantPage = React.lazy(() => import('./pages/MeetingAssistant/MeetingAssistantPage'));
// AI Meeting Recorder — lazy-loaded iframe page (mirrors MeetingAssistantPage,
// without the Quick-Start onboarding section). The full recorder app lives at
// VITE_MEETING_RECORDER_URL.
const MeetingRecorderDashboardPage = React.lazy(() => import('./features/meetingRecorder/pages/MeetingRecorderDashboardPage'));
// AI Document Intelligence — premium summary pipeline with preview-before-save
// semantics. Lazy-loaded to keep the main bundle lean (uses framer-motion +
// markdown + speech-synthesis under the hood).
const AIIntelligencePage = React.lazy(() => import('./pages/AIIntelligence/AIIntelligencePage'));
const AISummaryViewerPage = React.lazy(() => import('./pages/AIIntelligence/AISummaryViewerPage'));
import ProtectedRoute from './components/auth/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import StudyVaultPage from "./pages/StudyVault/StudyVaultPage";
import StudyCalendarPage from './pages/Calendar/StudyCalendarPage';


const App = () => {
  const { loading } = useAuth()
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Router>
      <Suspense fallback={<div className="flex items-center justify-center h-screen"><p>Loading...</p></div>}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path='/dashboard' element={<DashboardPage />} />
          <Route path="/documents" element={<DocumentListPage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />
          <Route path="/flashcards" element={<FlashcardListPage />} />
          <Route path="/documents/:id/flashcards" element={<FlashcardPage />} />
          <Route path="/quizzes/:quizId" element={<QuizTakePage />} />
          <Route path="/quizzes/:quizId/results" element={<QuizResultPage />} />
          <Route path="/meeting-assistant" element={<MeetingAssistantPage />} />
          {/* AI Meeting Recorder — informational Premium popup is triggered
              from the sidebar before navigation; the page itself just
              embeds the existing recorder deployment. */}
          <Route path="/meeting-recorder" element={<MeetingRecorderDashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/study-vault" element={<StudyVaultPage />} />
          <Route path="/calendar" element={<StudyCalendarPage />} />
          {/* AI Document Intelligence — preview-before-save summaries */}
          <Route path="/ai-intelligence" element={<AIIntelligencePage />} />
          <Route path="/ai-intelligence/:id" element={<AISummaryViewerPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
    </Router>
  );
}

export default App;