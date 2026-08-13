import { Button, Card, CardContent, CardHeader, CardTitle } from '@smart-business/ui';

const embeddedBrowserPattern =
  /\b(?:FBAN|FBAV|Instagram|Line\/?|TikTok|Twitter|Snapchat)\b|;\s*wv\)/i;

export function isLikelyEmbeddedBrowser(userAgent: string): boolean {
  return embeddedBrowserPattern.test(userAgent);
}

export interface EmbeddedBrowserGuidanceProps {
  userAgent?: string;
}

export function EmbeddedBrowserGuidance({
  userAgent = globalThis.navigator?.userAgent ?? '',
}: EmbeddedBrowserGuidanceProps) {
  if (!isLikelyEmbeddedBrowser(userAgent)) {
    return null;
  }

  function openInBrowser() {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  }

  return (
    <aside className="embedded-browser-guidance" aria-labelledby="embedded-browser-title">
      <Card>
        <CardHeader>
          <CardTitle id="embedded-browser-title">Open in your browser to sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="stack">
            <p>
              This in-app browser may not support Google or passkey sign-in. Open Smart Business in
              your system browser to continue.
            </p>
            <p className="supporting-copy">
              Your session is not transferred between browsers, so you may need to sign in again.
            </p>
            <div>
              <Button type="button" onClick={openInBrowser} variant="outline">
                Open in browser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
