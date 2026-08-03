import { Card, CardContent, CardHeader, CardTitle } from '@smart-business/ui';

import { PageHeading } from '../components/page-heading';

const metrics = [
  { label: 'Appointments', value: '—' },
  { label: 'Returning customers', value: '—' },
  { label: 'Capacity used', value: '—' },
];

export function MetricsPage() {
  return (
    <section>
      <PageHeading
        eyebrow="Performance"
        title="Metrics"
        description="Understand demand, retention, and operational capacity."
      />
      <div className="metric-grid">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader>
              <CardTitle>{metric.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <strong className="metric-value">{metric.value}</strong>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
