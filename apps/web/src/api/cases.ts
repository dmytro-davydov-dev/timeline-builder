import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type {
  Case,
  CaseStatistics,
  ChatResponse,
  ChatTurn,
  EventFilters,
  GroupedByBodyPart,
  GroupedByDay,
  ImportSummary,
  MedicalEvent,
  TreatmentGap,
} from '../types';

// All server state goes through TanStack Query, keyed by caseId
// (docs/Architecture.md §7.3) — filtering re-fetches via query params rather
// than filtering client-side, so it stays correct as case sizes grow.

export function useImportCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await apiClient.post<ImportSummary>(
        '/cases/import',
        form,
      );
      return data;
    },
    onSuccess: (summary) => {
      queryClient.invalidateQueries({ queryKey: ['case', summary.caseId] });
    },
  });
}

/**
 * Backs the root route's auto-open behavior: Phase 1 is
 * single-case-per-session with no case switcher (docs/PRD-Case-Management.md
 * §2), so on startup the app should skip the Upload screen and jump
 * straight into whatever case exists — the DefaultCaseSeeder-created demo
 * case (apps/api/src/excel-import/default-case-seeder.service.ts) on a
 * fresh install, or a user's own case afterward. `retry: false` so a 404
 * (no case exists yet, e.g. the seed asset is missing) fails fast and falls
 * back to the Upload screen instead of retrying for several seconds.
 */
export function useDefaultCase() {
  return useQuery({
    queryKey: ['case', 'default'],
    queryFn: async () => {
      const { data } = await apiClient.get<Case>('/cases/default');
      return data;
    },
    retry: false,
  });
}

export function useCase(caseId: string | undefined) {
  return useQuery({
    queryKey: ['case', caseId],
    queryFn: async () => {
      const { data } = await apiClient.get<Case>(`/cases/${caseId}`);
      return data;
    },
    enabled: Boolean(caseId),
  });
}

export function useSetMilestone(caseId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { label: string; date: string }) => {
      const { data } = await apiClient.patch<Case>(
        `/cases/${caseId}/milestones`,
        input,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    },
  });
}

export function useEvents(caseId: string | undefined, filters: EventFilters) {
  return useQuery({
    queryKey: ['events', caseId, filters],
    queryFn: async () => {
      const { data } = await apiClient.get<MedicalEvent[]>(
        `/cases/${caseId}/events`,
        { params: filters },
      );
      return data;
    },
    enabled: Boolean(caseId),
  });
}

export function useStatistics(caseId: string | undefined) {
  return useQuery({
    queryKey: ['statistics', caseId],
    queryFn: async () => {
      const { data } = await apiClient.get<CaseStatistics>(
        `/cases/${caseId}/statistics`,
      );
      return data;
    },
    enabled: Boolean(caseId),
  });
}

export function useGroupedByBodyPart(caseId: string | undefined) {
  return useQuery({
    queryKey: ['grouped-by-body-part', caseId],
    queryFn: async () => {
      const { data } = await apiClient.get<GroupedByBodyPart[]>(
        `/cases/${caseId}/events/grouped-by-body-part`,
      );
      return data;
    },
    enabled: Boolean(caseId),
  });
}

export function useTreatmentGaps(caseId: string | undefined, thresholdDays = 0) {
  return useQuery({
    queryKey: ['treatment-gaps', caseId, thresholdDays],
    queryFn: async () => {
      const { data } = await apiClient.get<TreatmentGap[]>(
        `/cases/${caseId}/events/gaps`,
        { params: { thresholdDays } },
      );
      return data;
    },
    enabled: Boolean(caseId),
  });
}

export function useGroupedByDay(caseId: string | undefined) {
  return useQuery({
    queryKey: ['grouped-by-day', caseId],
    queryFn: async () => {
      const { data } = await apiClient.get<GroupedByDay[]>(
        `/cases/${caseId}/events/grouped-by-day`,
      );
      return data;
    },
    enabled: Boolean(caseId),
  });
}

export function useChat(caseId: string | undefined) {
  return useMutation({
    mutationFn: async (input: { message: string; history: ChatTurn[] }) => {
      const { data } = await apiClient.post<ChatResponse>(
        `/cases/${caseId}/chat`,
        input,
      );
      return data;
    },
  });
}
