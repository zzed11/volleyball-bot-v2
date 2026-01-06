import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { balanceApi, CreatePlayerDto, UpdatePlayerDto } from '@/api/balanceApiClient';
import { Player } from '@/types/player';
import { toast } from 'sonner';

export function usePlayers() {
  return useQuery({
    queryKey: ['players'],
    queryFn: async (): Promise<Player[]> => {
      return await balanceApi.getPlayers();
    },
  });
}

export function useCreatePlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (player: CreatePlayerDto) => {
      return await balanceApi.createPlayer(player);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success('Player added successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to add player: ' + error.message);
    },
  });
}

export function useUpdatePlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdatePlayerDto & { id: number }) => {
      return await balanceApi.updatePlayer(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success('Player updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update player: ' + error.message);
    },
  });
}

export function useDeletePlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await balanceApi.deletePlayer(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success('Player deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete player: ' + error.message);
    },
  });
}
