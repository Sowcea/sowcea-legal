import { ModuleDashboard } from '@/components/dashboard/ModuleDashboard';
import type { GlobalDashboardConfig } from './types';

interface Props {
  config?: GlobalDashboardConfig;
  accentColor?: string;
}

/**
 * "Vue globale" tab — the module dashboard, fed only by the Global Hub contract
 * views (global_hub_sources / v_global_hub_counters / v_global_hub_rollup_minute).
 */
export function GlobalOverviewTab(_props: Props) {
  return <ModuleDashboard />;
}
