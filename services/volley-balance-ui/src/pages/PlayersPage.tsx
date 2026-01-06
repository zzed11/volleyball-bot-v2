import { useState } from 'react';
import { Header } from '@/components/Header';
import { PlayerCard } from '@/components/PlayerCard';
import { FIFAPlayerCard } from '@/components/FIFAPlayerCard';
import { PlayerForm } from '@/components/PlayerForm';
import { PlayerDetailSheet } from '@/components/PlayerDetailSheet';
import { usePlayers, useCreatePlayer, useUpdatePlayer, useDeletePlayer } from '@/hooks/usePlayers';
import { Player } from '@/types/player';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Users, Loader2, Grid3x3, CreditCard } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export default function PlayersPage() {
  const { data: players, isLoading, error } = usePlayers();
  const createPlayer = useCreatePlayer();
  const updatePlayer = useUpdatePlayer();
  const deletePlayer = useDeletePlayer();

  const [formOpen, setFormOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [viewMode, setViewMode] = useState<'normal' | 'fifa'>('normal');

  const handleAddClick = () => {
    setEditingPlayer(null);
    setFormOpen(true);
  };

  const handleEditClick = (player: Player) => {
    setEditingPlayer(player);
    setDetailOpen(false);
    setFormOpen(true);
  };

  const handleDeleteClick = (player: Player) => {
    setPlayerToDelete(player);
    setDetailOpen(false);
    setDeleteConfirmOpen(true);
  };

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer(player);
    setDetailOpen(true);
  };

  const handleFormSubmit = (data: any) => {
    if (editingPlayer) {
      updatePlayer.mutate({ id: editingPlayer.id, ...data }, {
        onSuccess: () => setFormOpen(false),
      });
    } else {
      createPlayer.mutate(data, {
        onSuccess: () => setFormOpen(false),
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (playerToDelete) {
      deletePlayer.mutate(playerToDelete.id, {
        onSuccess: () => {
          setDeleteConfirmOpen(false);
          setPlayerToDelete(null);
        },
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Players</h1>
            <p className="text-muted-foreground mt-1">
              Manage your volleyball community roster
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'normal' | 'fifa')}>
              <ToggleGroupItem value="normal" aria-label="Normal view">
                <Grid3x3 className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="fifa" aria-label="FIFA card view">
                <CreditCard className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            <Button onClick={handleAddClick} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Player
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-destructive">Failed to load players</p>
          </div>
        ) : players && players.length > 0 ? (
          viewMode === 'fifa' ? (
            <div className="flex flex-wrap gap-6 justify-center">
              {players.map((player) => (
                <FIFAPlayerCard
                  key={player.id}
                  player={player}
                  onClick={() => handlePlayerClick(player)}
                  variant={player.overall_rating >= 90 ? 'icon' : player.overall_rating >= 85 ? 'special' : 'gold'}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {players.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onClick={() => handlePlayerClick(player)}
                  onEdit={() => handleEditClick(player)}
                  onDelete={() => handleDeleteClick(player)}
                />
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No players yet</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              Start building your volleyball roster
            </p>
            <Button onClick={handleAddClick} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Player
            </Button>
          </div>
        )}
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingPlayer ? 'Edit Player' : 'Add New Player'}
            </DialogTitle>
          </DialogHeader>
          <PlayerForm
            player={editingPlayer || undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => setFormOpen(false)}
            isLoading={createPlayer.isPending || updatePlayer.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Player Detail Sheet */}
      <PlayerDetailSheet
        player={selectedPlayer}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={() => selectedPlayer && handleEditClick(selectedPlayer)}
        onDelete={() => selectedPlayer && handleDeleteClick(selectedPlayer)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Player</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {playerToDelete?.full_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
