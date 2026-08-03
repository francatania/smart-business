import { NavLink, Navigate, Route, Routes } from 'react-router-dom';

import { AppStatus } from './components/app-status';
import { CalendarPage } from './pages/calendar-page';
import { ConfigurationPage } from './pages/configuration-page';
import { CustomersPage } from './pages/customers-page';
import { MetricsPage } from './pages/metrics-page';

const navigation = [
  { to: '/calendar', label: 'Calendar' },
  { to: '/customers', label: 'Customers' },
  { to: '/configuration', label: 'Configuration' },
  { to: '/metrics', label: 'Metrics' },
];

export function App() {
  return (
    <div className="admin-shell">
      <aside>
        <NavLink className="brand" to="/calendar">
          Smart Business
          <span>Administration</span>
        </NavLink>
        <nav aria-label="Administration navigation">
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
        <AppStatus />
      </aside>
      <main>
        <Routes>
          <Route path="/" element={<Navigate replace to="/calendar" />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/configuration" element={<ConfigurationPage />} />
          <Route path="/metrics" element={<MetricsPage />} />
          <Route path="*" element={<Navigate replace to="/calendar" />} />
        </Routes>
      </main>
    </div>
  );
}
