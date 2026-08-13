import { useAuth, useAuthActions } from '@smart-business/auth';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@smart-business/ui';
import { type PropsWithChildren, type ReactNode } from 'react';

export interface ProtectedRouteProps extends PropsWithChildren {
  requiresOrganizationAccess?: boolean;
}

interface AccessStateProps {
  action?: ReactNode;
  children: ReactNode;
  title: string;
}

function AccessState({ action, children, title }: AccessStateProps) {
  return (
    <section className="access-state page-grid" aria-live="polite">
      <div className="page-intro access-state-intro">
        <p className="eyebrow">Private area</p>
        <h1>Pick up where you left off.</h1>
        <p>
          Keep your appointments and professional workspace private with a secure Smart Business
          session.
        </p>
      </div>
      <Card className="access-state-card">
        <CardHeader className="access-state-card-header">
          <span aria-hidden="true" className="access-state-mark">
            SB
          </span>
          <h2 className="access-state-title">{title}</h2>
        </CardHeader>
        <CardContent className="access-state-card-content">
          <div className="stack">
            <p>{children}</p>
            {action && <div>{action}</div>}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export function ProtectedRoute({
  children,
  requiresOrganizationAccess = false,
}: ProtectedRouteProps) {
  const { actor, status } = useAuth();
  const { refreshSession, signIn } = useAuthActions();

  if (status === 'loading') {
    return (
      <section className="access-state page-grid" aria-busy="true" aria-live="polite">
        <div className="page-intro access-state-intro">
          <p className="eyebrow">Private area</p>
          <h1>Getting your space ready.</h1>
          <p>We are confirming your secure session before showing private information.</p>
        </div>
        <Card className="access-state-card">
          <CardHeader className="access-state-card-header">
            <span aria-hidden="true" className="access-state-mark access-state-mark-loading" />
            <CardTitle>Checking your access</CardTitle>
          </CardHeader>
          <CardContent className="access-state-card-content">
            Protected information is loading.
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
          <Button
            className="access-state-action access-state-action-secondary"
            type="button"
            onClick={() => void refreshSession()}
            variant="outline"
          >
            Try again
          </Button>
        }
      >
        We could not confirm your session. Try again before viewing protected information.
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
          <Button className="access-state-action" type="button" onClick={() => signIn()}>
            {status === 'anonymous' ? 'Sign in' : 'Sign in again'}
          </Button>
        }
      >
        {denied
          ? 'Your account cannot access this area. Sign in again if you need to use a different account.'
          : expired
            ? 'Sign in again to continue where you left off.'
            : 'Sign in to view your protected information.'}
      </AccessState>
    );
  }

  if (!actor) {
    return (
      <AccessState
        title="Session unavailable"
        action={
          <Button
            className="access-state-action access-state-action-secondary"
            type="button"
            onClick={() => void refreshSession()}
            variant="outline"
          >
            Try again
          </Button>
        }
      >
        We could not confirm your account details. Try again before viewing protected information.
      </AccessState>
    );
  }

  if (requiresOrganizationAccess && actor.organizationAccess.length === 0) {
    return (
      <AccessState title="No organization access">
        Your account is signed in, but it does not have an active organization relationship for the
        professional workspace.
      </AccessState>
    );
  }

  return children;
}
