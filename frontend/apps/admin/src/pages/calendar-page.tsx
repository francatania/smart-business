import { Card, CardContent, CardHeader, CardTitle } from '@smart-business/ui';

import { PageHeading } from '../components/page-heading';

export function CalendarPage() {
  return (
    <section>
      <PageHeading
        eyebrow="Operations"
        title="Calendar"
        description="Manage daily capacity and upcoming appointments."
      />
      <div className="calendar-grid" aria-label="Calendar placeholder">
        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
          <Card key={day}>
            <CardHeader>
              <CardTitle>{day}</CardTitle>
            </CardHeader>
            <CardContent>No appointments scheduled.</CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
