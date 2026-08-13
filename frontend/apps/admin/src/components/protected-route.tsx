import { useAuth, useAuthActions } from '@smart-business/auth';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@smart-business/ui';
import { type PropsWithChildren, type ReactNode } from 'react';

interface AccessStateProps {
  action?: ReactNode;
  children: ReactNode;
  title: string;
}

function AccessState({ action, children, title }: AccessStateProps) {
  return (
    <section className="admin-access-state admin-page-grid" aria-live="polite">
      <div className="admin-access-intro">
        <p className="admin-access-eyebrow">Private area</p>
        <h1>Pick up where you left off.</h1>
        <p>Keep your organization workspace private with a secure Smart Business session.</p>
      </div>
      <Card className="admin-access-card">
        <CardHeader className="admin-access-card-header">
          <span aria-hidden="true" className="admin-access-mark">
            SB
          </span>
          <div>
            <p className="admin-access-eyebrow">Administration</p>
            <h1 className="admin-access-title">{title}</h1>
          </div>
        </CardHeader>
        <CardContent className="admin-access-card-content">
          <p>{children}</p>
          {action && <div>{action}</div>}
        </CardContent>
      </Card>
    </section>
  );
}

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { actor, status } = useAuth();
  const { refreshSession, signIn } = useAuthActions();

  if (status === 'loading') {
    return (
      <section className="admin-access-state admin-page-grid" aria-busy="true" aria-live="polite">
        <div className="admin-access-intro">
          <p className="admin-access-eyebrow">Private area</p>
          <h1>Getting your workspace ready.</h1>
          <p>We are confirming your secure session before showing administration tools.</p>
        </div>
        <Card className="admin-access-card">
          <CardHeader className="admin-access-card-header">
            <span aria-hidden="true" className="admin-access-mark admin-access-mark-loading" />
            <div>
              <p className="admin-access-eyebrow">Administration</p>
              <CardTitle>Checking your access</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="admin-access-card-content">
            <p>We are confirming your secure session before showing administration tools.</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (status === 'unavailable') {
    return (
      <AccessState
        title="Session unavailable"
        action={
          <Button type="button" onClick={() => void refreshSession()} variant="outline">
            Try again
          </Button>
        }
      >
        We could not confirm your session. Try again before viewing administration tools.
      </AccessState>
    );
  }

  if (status === 'anonymous' || status === 'expired' || status === 'access-denied') {
    const expired = status === 'expired';
    const denied = status === 'access-denied';
    return (
      <AccessState
        title={
          denied ? 'Access denied' : expired ? 'Your session has ended' : 'Sign in to continue'
        }
        action={
          <Button className="admin-access-action" type="button" onClick={() => signIn()}>
            {status === 'anonymous' ? 'Sign in' : 'Sign in again'}
          </Button>
        }
      >
        {denied
          ? 'Your account cannot access administration. Sign in again if you need to use a different account.'
          : expired
            ? 'Sign in again to continue where you left off.'
            : 'Sign in to use administration tools.'}
      </AccessState>
    );
  }

  if (!actor) {
    return (
      <AccessState
        title="Session unavailable"
        action={
          <Button type="button" onClick={() => void refreshSession()} variant="outline">
            Try again
          </Button>
        }
      >
        We could not confirm your account details. Try again before viewing administration tools.
      </AccessState>
    );
  }

  if (actor.organizationAccess.length === 0) {
    return (
      <AccessState title="No organization access">
        Your account is signed in, but it does not have an active organization relationship for
        administration.
      </AccessState>
    );
  }

  return children;
}
