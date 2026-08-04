import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@smart-business/ui';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const bookingSchema = z.object({
  email: z.email('Enter a valid email address.'),
});

type BookingFields = z.infer<typeof bookingSchema>;

export function BookingPage() {
  const {
    formState: { errors, isSubmitSuccessful },
    handleSubmit,
    register,
  } = useForm<BookingFields>({ resolver: zodResolver(bookingSchema) });

  return (
    <section className="page-grid">
      <div className="page-intro">
        <p className="eyebrow">Public booking</p>
        <h1>Book your next service</h1>
        <p>
          Choose a business from its shared link. Availability and service selection arrive in the
          scheduling epic.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Start with your email</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="stack"
            onSubmit={(event) => void handleSubmit(() => undefined)(event)}
            noValidate
          >
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="field-error">{errors.email.message}</p>}
            {isSubmitSuccessful && <p>Booking details will be available soon.</p>}
            <Button type="submit">Continue</Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
