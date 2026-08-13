import { useAuth } from '@smart-business/auth';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';

import { AppStatus } from './components/app-status';
import { EmbeddedBrowserGuidance } from './components/embedded-browser-guidance';
import { ProtectedRoute } from './components/protected-route';
import { SessionControls } from './components/session-controls';
import { AppointmentsPage } from './pages/appointments-page';
import { BookingPage } from './pages/booking-page';
import { ProfessionalSchedulePage } from './pages/professional-schedule-page';

export function App() {
  const { actor, status } = useAuth();
  const authenticated = status === 'authenticated' && Boolean(actor);
  const hasOrganizationAccess = authenticated && Boolean(actor?.organizationAccess.length);

  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink className="brand" to="/book">
          Smart Business
        </NavLink>
        <nav aria-label="Primary navigation">
          <NavLink className={({ isActive }) => (isActive ? 'active' : '')} to="/book">
            Book
          </NavLink>
          {authenticated && (
            <NavLink className={({ isActive }) => (isActive ? 'active' : '')} to="/appointments">
              My appointments
            </NavLink>
          )}
          {hasOrganizationAccess && (
            <NavLink
              className={({ isActive }) => (isActive ? 'active' : '')}
              to="/professional/schedule"
            >
              Professional schedule
            </NavLink>
          )}
        </nav>
        <SessionControls />
      </header>
      <main>
        <EmbeddedBrowserGuidance />
        <Routes>
          <Route path="/" element={<Navigate replace to="/book" />} />
          <Route path="/book" element={<BookingPage />} />
          <Route
            path="/appointments"
            element={
              <ProtectedRoute>
                <AppointmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/professional/schedule"
            element={
              <ProtectedRoute requiresOrganizationAccess>
                <ProfessionalSchedulePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate replace to="/book" />} />
        </Routes>
      </main>
      <AppStatus />
    </div>
  );
}
