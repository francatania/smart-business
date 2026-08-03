import { Card, CardContent, CardHeader, CardTitle } from '@smart-business/ui';

import { PageHeading } from '../components/page-heading';

export function CustomersPage() {
  return (
    <section>
      <PageHeading
        eyebrow="Relationships"
        title="Customers"
        description="Access the customer directory owned by this business."
      />
      <Card>
        <CardHeader>
          <CardTitle>Customer directory</CardTitle>
        </CardHeader>
        <CardContent>
          Customer records will appear here after the customer epic is implemented.
        </CardContent>
      </Card>
    </section>
  );
}
