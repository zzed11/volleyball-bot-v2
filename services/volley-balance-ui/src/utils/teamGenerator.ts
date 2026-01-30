import { Player, Team, TeamGenerationResult, TeamGenerationOptions, PlayerPosition } from '@/types/player';

const TEAM_NAMES = ['Team A', 'Team B', 'Team C'];

// Number of random configurations to generate and compare
const NUM_ITERATIONS = 50;

/**
 * Calculate effective rating for balancing purposes.
 * Female players are treated as 15% weaker for team balance.
 * Original rating is preserved for display.
 */
function getEffectiveRating(player: Player): number {
  return player.gender === 'female' ? player.overall_rating * 0.85 : player.overall_rating;
}

function calculateTeamStats(players: Player[]): Omit<Team, 'name'> {
  // Use original ratings for display purposes
  const averageRating = players.reduce((sum, p) => sum + p.overall_rating, 0) / players.length;
  const femaleCount = players.filter(p => p.gender === 'female').length;

  const positionCounts: Record<PlayerPosition, number> = {
    setter: 0,
    outside_hitter: 0,
    middle_blocker: 0,
    opposite: 0,
    libero: 0,
    universal: 0,
  };

  players.forEach(p => {
    positionCounts[p.best_position]++;
  });

  return { players, averageRating, femaleCount, positionCounts };
}

/**
 * Calculate effective team strength for balancing.
 * Uses effectiveRating to account for female 15% reduction.
 */
function getTeamEffectiveStrength(players: Player[]): number {
  return players.reduce((sum, p) => sum + getEffectiveRating(p), 0) / players.length;
}

function evaluateBalance(teams: Team[]): { ratingGap: number; genderVariance: number; positionScore: number } {
  // Use effective ratings for balance calculation
  const effectiveRatings = teams.map(t => getTeamEffectiveStrength(t.players));
  const ratingGap = Math.max(...effectiveRatings) - Math.min(...effectiveRatings);

  const femaleCounts = teams.map(t => t.femaleCount);
  const avgFemale = femaleCounts.reduce((a, b) => a + b, 0) / 3;
  const genderVariance = femaleCounts.reduce((sum, c) => sum + Math.pow(c - avgFemale, 2), 0) / 3;

  // Check if each team has at least one setter
  const setterScore = teams.filter(t => t.positionCounts.setter >= 1).length;
  const positionScore = setterScore;

  return { ratingGap, genderVariance, positionScore };
}

/**
 * Calculate a combined score for team balance (lower is better).
 * Weights: rating gap is most important, then setter distribution, then gender variance.
 */
function calculateBalanceScore(ratingGap: number, genderVariance: number, positionScore: number): number {
  // Lower score = better balance
  // Rating gap: primary factor (weight 10)
  // Position score: 3 = all teams have setter (subtract 5 per team with setter)
  // Gender variance: secondary factor (weight 2)
  return ratingGap * 10 + (3 - positionScore) * 5 + genderVariance * 2;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate a single random team configuration.
 * Uses true randomization with balanced distribution constraints.
 */
function generateSingleConfiguration(
  availablePlayers: Player[],
  options?: TeamGenerationOptions
): Player[][] {
  const teamPlayers: Player[][] = [[], [], []];

  // Handle A&V pairing constraint (Вова + Алина together)
  let vovaPlayer: Player | null = null;
  let alinaPlayer: Player | null = null;

  if (options?.keepAVTogether) {
    vovaPlayer = availablePlayers.find(p => p.full_name === 'Вова') || null;
    alinaPlayer = availablePlayers.find(p => p.full_name === 'Алина') || null;

    // Only apply constraint if both are selected
    if (vovaPlayer && alinaPlayer) {
      // Place A&V pair on a RANDOM team (not always Team A)
      const avTeam = Math.floor(Math.random() * 3);
      teamPlayers[avTeam].push(vovaPlayer, alinaPlayer);
    } else {
      vovaPlayer = null;
      alinaPlayer = null;
    }
  }

  // Get remaining players (excluding A&V if placed)
  const placedPlayers = new Set(teamPlayers.flat().map(p => p.id));
  const remainingPlayers = availablePlayers.filter(p => !placedPlayers.has(p.id));

  // Separate by category
  const setters = remainingPlayers.filter(p => p.best_position === 'setter');
  const females = remainingPlayers.filter(p => p.gender === 'female' && p.best_position !== 'setter');
  const otherPlayers = remainingPlayers.filter(p => p.gender === 'male' && p.best_position !== 'setter');

  // STEP 1: Distribute setters evenly with randomization
  const shuffledSetters = shuffleArray(setters);
  const teamOrder = shuffleArray([0, 1, 2]); // Random team assignment order

  for (let i = 0; i < shuffledSetters.length; i++) {
    // Find team with space that needs a setter most (round-robin with random start)
    const targetTeam = teamOrder[i % 3];
    if (teamPlayers[targetTeam].length < 6) {
      teamPlayers[targetTeam].push(shuffledSetters[i]);
    } else {
      // Find any team with space
      for (let t = 0; t < 3; t++) {
        if (teamPlayers[t].length < 6) {
          teamPlayers[t].push(shuffledSetters[i]);
          break;
        }
      }
    }
  }

  // STEP 2: Distribute females evenly with randomization
  const shuffledFemales = shuffleArray(females);
  const femaleTeamOrder = shuffleArray([0, 1, 2]);

  for (let i = 0; i < shuffledFemales.length; i++) {
    const targetTeam = femaleTeamOrder[i % 3];
    if (teamPlayers[targetTeam].length < 6) {
      teamPlayers[targetTeam].push(shuffledFemales[i]);
    } else {
      // Find any team with space
      for (let t = 0; t < 3; t++) {
        if (teamPlayers[t].length < 6) {
          teamPlayers[t].push(shuffledFemales[i]);
          break;
        }
      }
    }
  }

  // STEP 3: Distribute remaining players with RANDOMIZED balanced approach
  // Shuffle the remaining players completely
  const shuffledOthers = shuffleArray(otherPlayers);

  // Group by rating tiers (high/medium/low) and shuffle within each tier
  const sortedByRating = [...shuffledOthers].sort((a, b) => getEffectiveRating(b) - getEffectiveRating(a));
  const tierSize = Math.ceil(sortedByRating.length / 3);
  const highTier = shuffleArray(sortedByRating.slice(0, tierSize));
  const midTier = shuffleArray(sortedByRating.slice(tierSize, tierSize * 2));
  const lowTier = shuffleArray(sortedByRating.slice(tierSize * 2));

  // Combine tiers with randomized order within each
  const tieredPlayers = [...highTier, ...midTier, ...lowTier];

  // Randomize snake draft starting point and direction
  let direction = Math.random() < 0.5 ? 1 : -1;
  let currentTeam = Math.floor(Math.random() * 3);

  for (const player of tieredPlayers) {
    // Find team with space
    let attempts = 0;
    while (teamPlayers[currentTeam].length >= 6 && attempts < 6) {
      currentTeam = (currentTeam + direction + 3) % 3;
      attempts++;
    }

    if (teamPlayers[currentTeam].length < 6) {
      teamPlayers[currentTeam].push(player);
    }

    // Move to next team in snake pattern
    if (currentTeam === 2 && direction === 1) {
      direction = -1;
    } else if (currentTeam === 0 && direction === -1) {
      direction = 1;
    } else {
      currentTeam = (currentTeam + direction + 3) % 3;
    }
  }

  return teamPlayers;
}

/**
 * Main team generation function.
 * Generates multiple random configurations and picks the best balanced one.
 * This ensures true randomization while maintaining good balance.
 */
export function generateThreeTeams(
  availablePlayers: Player[],
  options?: TeamGenerationOptions
): TeamGenerationResult {
  if (availablePlayers.length !== 18) {
    throw new Error('Exactly 18 players are required to generate 3 teams of 6');
  }

  let bestTeams: Team[] | null = null;
  let bestScore = Infinity;
  let bestMetrics = { ratingGap: Infinity, genderVariance: Infinity, positionScore: 0 };

  // Generate multiple configurations and pick the best one
  for (let i = 0; i < NUM_ITERATIONS; i++) {
    const teamPlayers = generateSingleConfiguration(availablePlayers, options);

    // Ensure all teams have exactly 6 players
    const valid = teamPlayers.every(t => t.length === 6);
    if (!valid) continue;

    const teams: Team[] = teamPlayers.map((players, idx) => ({
      name: TEAM_NAMES[idx],
      ...calculateTeamStats(players),
    }));

    const { ratingGap, genderVariance, positionScore } = evaluateBalance(teams);
    const score = calculateBalanceScore(ratingGap, genderVariance, positionScore);

    if (score < bestScore) {
      bestScore = score;
      bestTeams = teams;
      bestMetrics = { ratingGap, genderVariance, positionScore };
    }
  }

  // Fallback if no valid configuration found (shouldn't happen)
  if (!bestTeams) {
    const teamPlayers = generateSingleConfiguration(availablePlayers, options);
    bestTeams = teamPlayers.map((players, idx) => ({
      name: TEAM_NAMES[idx],
      ...calculateTeamStats(players),
    }));
    const metrics = evaluateBalance(bestTeams);
    bestMetrics = metrics;
  }

  const { ratingGap, genderVariance, positionScore } = bestMetrics;

  // Determine balance quality
  let balanceQuality: 'excellent' | 'good' | 'fair';
  let balanceMessage: string;

  if (ratingGap <= 3 && genderVariance <= 1 && positionScore === 3) {
    balanceQuality = 'excellent';
    balanceMessage = 'Excellent balance! Teams are very evenly matched in rating, gender distribution, and positions.';
  } else if (ratingGap <= 5 && genderVariance <= 2) {
    balanceQuality = 'good';
    const messages: string[] = [];
    if (ratingGap > 3) messages.push(`Effective rating gap of ${ratingGap.toFixed(1)} points`);
    if (positionScore < 3) messages.push('Not all teams have a setter');
    balanceMessage = `Good balance overall. ${messages.join('. ') || 'Minor variations in distribution.'}`;
  } else {
    balanceQuality = 'fair';
    const effectiveStrengths = bestTeams.map(t => ({
      name: t.name,
      strength: getTeamEffectiveStrength(t.players)
    }));
    const strongest = effectiveStrengths.reduce((a, b) => a.strength > b.strength ? a : b);
    balanceMessage = `Fair balance. ${strongest.name} is slightly stronger by effective rating (${strongest.strength.toFixed(1)}), but positions and gender are reasonably distributed.`;
  }

  return {
    teams: bestTeams,
    ratingGap: Math.round(ratingGap * 10) / 10,
    balanceQuality,
    balanceMessage,
  };
}
