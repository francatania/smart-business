import { NavLink, Navigate, Route, Routes } from 'react-router-dom';

import { AppStatus } from './components/app-status';
import { SessionControls } from './components/session-controls';
import { AppointmentsPage } from './pages/appointments-page';
import { BookingPage } from './pages/booking-page';
import { ProfessionalSchedulePage } from './pages/professional-schedule-page';

const navigation = [
  { to: '/book', label: 'Book' },
  { to: '/appointments', label: 'My appointments' },
  { to: '/professional/schedule', label: 'Professional schedule' },
];

export function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink className="brand" to="/book">
          Smart Business
        </NavLink>
        <nav aria-label="Primary navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) => (isActive ? 'active' : '')}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <SessionControls />
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Navigate replace to="/book" />} />
          <Route path="/book" element={<BookingPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/professional/schedule" element={<ProfessionalSchedulePage />} />
          <Route path="*" element={<Navigate replace to="/book" />} />
        </Routes>
      </main>
      <AppStatus />
    </div>
  );
}
