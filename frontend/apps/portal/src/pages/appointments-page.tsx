import { useAuth } from '@smart-business/auth';
import { Link } from 'react-router-dom';

import { PasskeyGuidance } from '../components/passkey-guidance';

export function AppointmentsPage() {
  const { actor } = useAuth();

  return (
    <section className="appointments-empty page-grid">
      <div className="page-intro">
        <p className="eyebrow">Customer area</p>
        <h1>My appointments</h1>
        <p>Your upcoming and previous appointments will appear here.</p>
      </div>
      <div className="appointment-empty-card">
        <div className="appointment-empty-rail" aria-hidden="true">
          <span>09</span>
          <i />
          <span>11</span>
          <i />
          <span>14</span>
        </div>
        <p className="eyebrow">Your schedule</p>
        <h2>No appointments yet.</h2>
        <p>When you book a service, its time and details will appear here.</p>
        <Link className="appointment-empty-action" to="/book">
          Book a service
        </Link>
      </div>
      {actor?.verifiedEmail && <PasskeyGuidance />}
    </section>
  );
}
