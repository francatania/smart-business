import { createApiClient } from '@smart-business/api-client';
import { useQuery } from '@tanstack/react-query';

import { publicConfig } from '../config';

const api = createApiClient(publicConfig.apiBaseUrl);

export function AppStatus() {
  const systemInfo = useQuery({
    queryKey: ['system-info'],
    queryFn: async () => {
      const { data, error } = await api.GET('/system/info');
      if (error || !data) throw new Error('The platform API is unavailable.');
      return data;
    },
  });

  return (
    <footer className="app-footer">
      {systemInfo.isSuccess
        ? `${systemInfo.data.name} · ${systemInfo.data.version}`
        : systemInfo.isError
          ? 'API unavailable'
          : 'Connecting…'}
    </footer>
  );
}
