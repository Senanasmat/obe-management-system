import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';

import AdminDashboard from './pages/admin/AdminDashboard';
import Students from './pages/admin/Students';
import Courses from './pages/admin/Courses';
import PLOs from './pages/admin/PLOs';
import CLOs from './pages/admin/CLOs';
// Placeholder only for Faculty
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import CourseView from './pages/faculty/CourseView';
import AssessmentCreation from './pages/faculty/AssessmentCreation';
import MarksEntry from './pages/faculty/MarksEntry';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
  return children;
};

// Component to handle root redirect
const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return user.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/faculty" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<Layout />}>
            <Route index element={<RootRedirect />} />

            {/* Admin Routes */}
            <Route path="admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="admin/students" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Students />
              </ProtectedRoute>
            } />
            <Route path="admin/courses" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Courses />
              </ProtectedRoute>
            } />
            <Route path="admin/plos" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PLOs />
              </ProtectedRoute>
            } />
            <Route path="admin/clos" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CLOs />
              </ProtectedRoute>
            } />

            {/* Faculty Routes */}
            <Route path="faculty" element={
              <ProtectedRoute allowedRoles={['faculty']}>
                <FacultyDashboard />
              </ProtectedRoute>
            } />
            <Route path="faculty/courses/:courseId" element={
              <ProtectedRoute allowedRoles={['faculty']}>
                <CourseView />
              </ProtectedRoute>
            } />
            <Route path="faculty/courses/:courseId/create-assessment" element={
              <ProtectedRoute allowedRoles={['faculty']}>
                <AssessmentCreation />
              </ProtectedRoute>
            } />
            <Route path="faculty/courses/:courseId/marks/:assessmentId" element={
              <ProtectedRoute allowedRoles={['faculty']}>
                <MarksEntry />
              </ProtectedRoute>
            } />

          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
