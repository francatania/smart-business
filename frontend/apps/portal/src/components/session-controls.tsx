import { useAuth, useAuthActions } from '@smart-business/auth';
import { Button } from '@smart-business/ui';

export function SessionControls() {
  const { status, actor } = useAuth();
  const { accountSecurityUrl, refreshSession, signIn, signOut } = useAuthActions();

  if (status === 'loading') {
    return <span className="session-message">Checking session…</span>;
  }

  if (status === 'authenticated' && actor) {
    return (
      <div className="session-controls">
        <span className="session-message">{actor.displayName}</span>
        <a href={accountSecurityUrl}>Account security</a>
        <Button onClick={() => void signOut()} size="small" variant="outline">
          Sign out
        </Button>
      </div>
    );
  }

  if (status === 'unavailable') {
    return (
      <div className="session-controls">
        <span className="session-message">Session unavailable.</span>
        <Button onClick={() => void refreshSession()} size="small" variant="outline">
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="session-controls">
      {status === 'expired' && <span className="session-message">Your session ended.</span>}
      {status === 'access-denied' && (
        <span className="session-message">Your account cannot access this area.</span>
      )}
      <Button onClick={() => signIn()} size="small" variant="outline">
        {status === 'anonymous' ? 'Sign in' : 'Sign in again'}
      </Button>
    </div>
  );
}
