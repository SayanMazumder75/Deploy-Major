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
// AI Meeting Recorder — lazy-loaded so the recorder bundle (socket.io-client,
// MediaRecorder code, large CSS) is fetched only when the user actually opens
// the feature. The pages live in src/features/meetingRecorder/.
const MeetingRecorderDashboardPage = React.lazy(() => import('./features/meetingRecorder/pages/MeetingRecorderDashboardPage'));
const MeetingRecorderDetailPage = React.lazy(() => import('./features/meetingRecorder/pages/MeetingRecorderDetailPage'));
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
              from the sidebar; routes themselves stay open so future auth /
              subscription gating can be layered in without restructuring. */}
          <Route path="/meeting-recorder" element={<MeetingRecorderDashboardPage />} />
          <Route path="/meeting-recorder/:id" element={<MeetingRecorderDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/study-vault" element={<StudyVaultPage />} />
          <Route path="/calendar" element={<StudyCalendarPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
    </Router>
  );
}

export default App;