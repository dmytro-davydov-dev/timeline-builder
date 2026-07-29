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
