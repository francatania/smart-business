import { useAuthActions } from '@smart-business/auth';

export function PasskeyGuidance() {
  const { accountSecurityUrl } = useAuthActions();

  return (
    <aside className="passkey-guidance" aria-labelledby="passkey-guidance-title">
      <span aria-hidden="true" className="passkey-guidance-mark">
        +
      </span>
      <div>
        <h2 id="passkey-guidance-title">Make the next sign-in quicker</h2>
        <p>
          Add an optional passkey using your device screen lock, fingerprint, or face recognition.
        </p>
      </div>
      <a className="passkey-guidance-link" href={accountSecurityUrl}>
        Add a passkey
      </a>
    </aside>
  );
}
