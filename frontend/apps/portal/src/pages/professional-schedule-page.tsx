import { Card, CardContent, CardHeader, CardTitle } from '@smart-business/ui';

export function ProfessionalSchedulePage() {
  return (
    <section className="page-grid">
      <div className="page-intro">
        <p className="eyebrow">Professional area</p>
        <h1>Professional schedule</h1>
        <p>
          Today’s services and customer records will be available from this mobile-first workspace.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Schedule foundation ready</CardTitle>
        </CardHeader>
        <CardContent>
          Role authorization and live appointment data are intentionally deferred.
        </CardContent>
      </Card>
    </section>
  );
}
