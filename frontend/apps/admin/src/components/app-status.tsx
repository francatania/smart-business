import { createApiClient } from '@smart-business/api-client';
import { useQuery } from '@tanstack/react-query';

const api = createApiClient();

export function AppStatus() {
  const systemInfo = useQuery({
    queryKey: ['system-info'],
    queryFn: async () => {
      const response = await api.GET('/system/info');
      if (response.error || !response.data) throw new Error('The platform API is unavailable.');
      return response.data;
    },
  });

  return (
    <div className="app-status">
      <span
        className={systemInfo.isSuccess ? 'status-dot online' : 'status-dot'}
        aria-hidden="true"
      />
      {systemInfo.isSuccess
        ? `${systemInfo.data.name} · ${systemInfo.data.version}`
        : 'Connecting…'}
    </div>
  );
}
