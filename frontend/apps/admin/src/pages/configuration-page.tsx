import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@smart-business/ui';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { PageHeading } from '../components/page-heading';

const configurationSchema = z.object({
  displayName: z.string().trim().min(2, 'Enter at least two characters.'),
});

type ConfigurationFields = z.infer<typeof configurationSchema>;

export function ConfigurationPage() {
  const {
    formState: { errors, isSubmitSuccessful },
    handleSubmit,
    register,
  } = useForm<ConfigurationFields>({ resolver: zodResolver(configurationSchema) });

  return (
    <section>
      <PageHeading
        eyebrow="Workspace"
        title="Configuration"
        description="Brand and organize the business workspace."
      />
      <Card>
        <CardHeader>
          <CardTitle>Business identity</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="stack"
            onSubmit={(event) => void handleSubmit(() => undefined)(event)}
            noValidate
          >
            <label htmlFor="displayName">Display name</label>
            <input id="displayName" {...register('displayName')} />
            {errors.displayName && <p className="field-error">{errors.displayName.message}</p>}
            {isSubmitSuccessful && <p>Configuration persistence will be enabled later.</p>}
            <Button type="submit">Save configuration</Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
