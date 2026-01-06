import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Player, PlayerGender, PlayerPosition, PlayerPreferredSide, POSITION_LABELS } from '@/types/player';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState, useRef } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { useMemo } from 'react';

const playerSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  gender: z.enum(['male', 'female']),

  // Individual skill ratings (70-99)
  attack_rating: z.number().min(70).max(99),
  reception_rating: z.number().min(70).max(99),
  block_rating: z.number().min(70).max(99),
  setting_rating: z.number().min(70).max(99),
  serve_rating: z.number().min(70).max(99),
  physical_rating: z.number().min(70).max(99),
  mentality_rating: z.number().min(70).max(99),

  best_position: z.enum(['setter', 'outside_hitter', 'middle_blocker', 'opposite', 'libero', 'universal']),
  secondary_position: z.enum(['setter', 'outside_hitter', 'middle_blocker', 'opposite', 'libero', 'universal']).nullable(),
  experience_years: z.number().min(0).max(50).nullable(),
  height_cm: z.number().min(100).max(250).nullable(),
  preferred_side: z.enum(['left', 'right', 'no_preference']),
  notes: z.string().nullable(),
  photo_url: z.string().url('Must be a valid URL').nullable().or(z.literal('')),
});

type PlayerFormData = z.infer<typeof playerSchema>;

interface PlayerFormProps {
  player?: Player;
  onSubmit: (data: PlayerFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface RatingFieldProps {
  form: any;
  name: keyof PlayerFormData;
  label: string;
  description?: string;
}

function RatingField({ form, name, label, description }: RatingFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex justify-between items-center mb-2">
            <FormLabel className="text-sm font-medium">{label}</FormLabel>
            <span className="text-sm font-bold text-primary">{field.value}</span>
          </div>
          <FormControl>
            <Slider
              min={70}
              max={99}
              step={1}
              value={[field.value]}
              onValueChange={([value]) => field.onChange(value)}
              className="w-full"
            />
          </FormControl>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function PlayerForm({ player, onSubmit, onCancel, isLoading }: PlayerFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(player?.photo_url || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PlayerFormData>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      full_name: player?.full_name || '',
      gender: player?.gender || 'male',
      attack_rating: player?.attack_rating || 80,
      reception_rating: player?.reception_rating || 80,
      block_rating: player?.block_rating || 80,
      setting_rating: player?.setting_rating || 80,
      serve_rating: player?.serve_rating || 80,
      physical_rating: player?.physical_rating || 80,
      mentality_rating: player?.mentality_rating || 80,
      best_position: player?.best_position || 'universal',
      secondary_position: player?.secondary_position || null,
      experience_years: player?.experience_years || null,
      height_cm: player?.height_cm || null,
      preferred_side: player?.preferred_side || 'no_preference',
      notes: player?.notes || null,
      photo_url: player?.photo_url || '',
    },
  });

  // Calculate overall rating in real-time
  const overallRating = useMemo(() => {
    const values = form.watch();
    return Math.round(
      (values.attack_rating * 0.20) +
      (values.reception_rating * 0.20) +
      (values.block_rating * 0.15) +
      (values.setting_rating * 0.15) +
      (values.serve_rating * 0.15) +
      (values.physical_rating * 0.10) +
      (values.mentality_rating * 0.05)
    );
  }, [form.watch()]);

  const positions: PlayerPosition[] = ['setter', 'outside_hitter', 'middle_blocker', 'opposite', 'libero', 'universal'];

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload photo to server
  const uploadPhoto = async (): Promise<string | null> => {
    if (!selectedFile) return null;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', selectedFile);
      if (player?.id) {
        formData.append('playerId', player.id.toString());
      }

      const response = await fetch('/api/upload/player-photo', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      const data = await response.json();
      return data.photo_url;
    } catch (error) {
      console.error('Photo upload error:', error);
      throw error;
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle form submission
  const handleFormSubmit = async (data: PlayerFormData) => {
    try {
      // Upload photo first if a file is selected
      if (selectedFile) {
        const photoUrl = await uploadPhoto();
        if (photoUrl) {
          data.photo_url = photoUrl;
        }
      }

      // Submit player data
      onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
      // Still try to submit without photo if upload fails
      form.setError('photo_url', {
        message: 'Photo upload failed. Player saved without photo.',
      });
      onSubmit(data);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Basic Info */}
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter player name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Photo Upload */}
        <div className="space-y-2">
          <Label>Player Photo</Label>
          <div className="flex items-center gap-4">
            {photoPreview && (
              <div className="flex h-24 w-24 items-center justify-center rounded-xl overflow-hidden bg-muted">
                <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                {photoPreview ? 'Change Photo' : 'Upload Photo'}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Optional: Upload a photo (max 5MB)
              </p>
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="photo_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Or paste photo URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://example.com/photo.jpg"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    field.onChange(e.target.value || null);
                    if (e.target.value) {
                      setPhotoPreview(e.target.value);
                      setSelectedFile(null);
                    }
                  }}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">Alternative: Paste a direct link to player's photo</p>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-end">
            <Card className="w-full p-4 bg-primary/5 border-primary/20">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Overall Rating</p>
                <p className="text-3xl font-bold text-primary">{overallRating}</p>
                <p className="text-xs text-muted-foreground mt-1">Auto-calculated</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Technical Skills */}
        <div className="space-y-4">
          <div className="border-b pb-2">
            <h3 className="font-semibold text-lg">Technical Skills</h3>
            <p className="text-xs text-muted-foreground">Rate each skill from 70 (developing) to 99 (elite)</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <RatingField
              form={form}
              name="attack_rating"
              label="Attack"
              description="Spiking power, accuracy, variety"
            />
            <RatingField
              form={form}
              name="reception_rating"
              label="Reception"
              description="Serve receive, dig accuracy"
            />
            <RatingField
              form={form}
              name="block_rating"
              label="Block"
              description="Timing, reach, reading"
            />
            <RatingField
              form={form}
              name="setting_rating"
              label="Setting"
              description="Accuracy, decision making, tempo"
            />
            <RatingField
              form={form}
              name="serve_rating"
              label="Serve"
              description="Power, accuracy, variety"
            />
          </div>
        </div>

        {/* Physical & Mental */}
        <div className="space-y-4">
          <div className="border-b pb-2">
            <h3 className="font-semibold text-lg">Physical & Mental Attributes</h3>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <RatingField
              form={form}
              name="physical_rating"
              label="Physical"
              description="Speed, jump, endurance, strength"
            />
            <RatingField
              form={form}
              name="mentality_rating"
              label="Mentality"
              description="Focus, clutch performance, team spirit"
            />
          </div>
        </div>

        {/* Position & Details */}
        <div className="space-y-4">
          <div className="border-b pb-2">
            <h3 className="font-semibold text-lg">Position & Details</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="best_position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Best Position *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {positions.map((pos) => (
                        <SelectItem key={pos} value={pos}>
                          {POSITION_LABELS[pos]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="secondary_position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secondary Position</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                    value={field.value || 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {positions.map((pos) => (
                        <SelectItem key={pos} value={pos}>
                          {POSITION_LABELS[pos]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="experience_years"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Experience (years)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="height_cm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Height (cm)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="180"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferred_side"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Side</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select side" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="no_preference">No Preference</SelectItem>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any additional notes about this player..."
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading || uploadingPhoto}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || uploadingPhoto}>
            {uploadingPhoto ? 'Uploading Photo...' : isLoading ? 'Saving...' : player ? 'Update Player' : 'Add Player'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
