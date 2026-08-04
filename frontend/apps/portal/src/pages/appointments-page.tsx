import { Card, CardContent, CardHeader, CardTitle } from '@smart-business/ui';

export function AppointmentsPage() {
  return (
    <section className="page-grid">
      <div className="page-intro">
        <p className="eyebrow">Customer area</p>
        <h1>My appointments</h1>
        <p>
          Your upcoming and previous appointments will appear here after authentication is enabled.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>No appointments yet</CardTitle>
        </CardHeader>
        <CardContent>Use a business booking link to schedule your first service.</CardContent>
      </Card>
    </section>
  );
}
