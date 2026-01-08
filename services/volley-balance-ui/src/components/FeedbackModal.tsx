import { useState } from 'react';
import { gamesApi } from '@/api/gamesApiClient';
import { CreateFeedbackDto } from '@/types/game';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  gameId: number;
}

export function FeedbackModal({ isOpen, onClose, onSubmit, gameId }: FeedbackModalProps) {
  const [overallRating, setOverallRating] = useState(0);
  const [balanceRating, setBalanceRating] = useState(0);
  const [funRating, setFunRating] = useState(0);
  const [comments, setComments] = useState('');
  const [wouldPlayAgain, setWouldPlayAgain] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!overallRating || !balanceRating || !funRating) {
      toast.error('Please provide all ratings');
      return;
    }

    setIsSubmitting(true);

    try {
      const dto: CreateFeedbackDto = {
        game_id: gameId,
        overall_rating: overallRating,
        balance_rating: balanceRating,
        fun_rating: funRating,
        comments: comments.trim() || undefined,
        would_play_again: wouldPlayAgain,
      };

      await gamesApi.submitFeedback(dto);

      // Reset form
      setOverallRating(0);
      setBalanceRating(0);
      setFunRating(0);
      setComments('');
      setWouldPlayAgain(true);

      onSubmit();
    } catch (error: any) {
      console.error('Failed to submit feedback:', error);
      toast.error(error.message || 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({
    value,
    onChange,
    label
  }: {
    value: number;
    onChange: (rating: number) => void;
    label: string;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none"
          >
            <Star
              className={cn(
                'h-6 w-6 transition-colors',
                star <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 hover:text-yellow-400'
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Game Feedback</DialogTitle>
          <DialogDescription>
            How was the game? Your feedback helps us improve future team balancing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <StarRating
            value={overallRating}
            onChange={setOverallRating}
            label="Overall Experience"
          />

          <StarRating
            value={balanceRating}
            onChange={setBalanceRating}
            label="Team Balance"
          />

          <StarRating
            value={funRating}
            onChange={setFunRating}
            label="Fun Factor"
          />

          <div className="space-y-2">
            <Label htmlFor="comments">Comments (Optional)</Label>
            <Textarea
              id="comments"
              placeholder="Share your thoughts about the game..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="play-again"
              checked={wouldPlayAgain}
              onCheckedChange={(checked) => setWouldPlayAgain(checked as boolean)}
            />
            <Label
              htmlFor="play-again"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I would play with these teams again
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
