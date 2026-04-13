import { Routes, Route } from 'react-router-dom';
import { Navbar } from '../../components/student/Navbar';
import Profile from '../../components/student/Profile';
import { PlacementOffers } from '../../components/student/PlacementOffers';
import ResumeAnalyzer from './ResumeAnalyzer';
import MockInterview from './MockInterview';
import { ChatbotWidget } from '../../components/student/ChatbotWidget';
import { useAuth } from '../../context/AuthContext';

export default function StudentDashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route index element={<Profile />} />
          <Route path="offers" element={<PlacementOffers />} />
          <Route path="resume" element={<ResumeAnalyzer />} />
          <Route path="mock-interview" element={<MockInterview />} />
        </Routes>
      </main>
      <ChatbotWidget />
    </div>
  );
}