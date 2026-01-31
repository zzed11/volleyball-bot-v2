import { Player, Team, TeamGenerationResult, TeamGenerationOptions, PlayerPosition } from '@/types/player';

const TEAM_NAMES = ['Team A', 'Team B', 'Team C'];
const NUM_TEAMS = 3;
const PLAYERS_PER_TEAM = 6;

// Number of random configurations to generate and compare
const NUM_ITERATIONS = 100;

/**
 * Calculate effective rating for balancing purposes.
 * Female players are treated as 15% weaker for team balance.
 * Original rating is preserved for display.
 */
function getEffectiveRating(player: Player): number {
  return player.gender === 'female' ? player.overall_rating * 0.85 : player.overall_rating;
}

function calculateTeamStats(players: Player[]): Omit<Team, 'name'> {
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

function getTeamEffectiveStrength(players: Player[]): number {
  if (players.length === 0) return 0;
  return players.reduce((sum, p) => sum + getEffectiveRating(p), 0) / players.length;
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
 * Calculate target distribution for a demographic group.
 * Returns [min, min, min] or [min+1, min, min] etc. based on count.
 */
function calculateTargetDistribution(count: number, numTeams: number): number[] {
  const base = Math.floor(count / numTeams);
  const remainder = count % numTeams;

  // Create base distribution
  const distribution = Array(numTeams).fill(base);

  // Add remainder to first teams
  for (let i = 0; i < remainder; i++) {
    distribution[i]++;
  }

  return distribution;
}

/**
 * Check if a distribution satisfies hard constraints.
 * When count is divisible by numTeams, all teams must have exactly count/numTeams.
 */
function isValidDistribution(actual: number[], target: number[]): boolean {
  const sortedActual = [...actual].sort((a, b) => b - a);
  const sortedTarget = [...target].sort((a, b) => b - a);

  for (let i = 0; i < sortedActual.length; i++) {
    if (sortedActual[i] !== sortedTarget[i]) return false;
  }
  return true;
}

/**
 * Calculate balance metrics for a set of teams.
 */
function evaluateBalance(teams: Team[]): {
  ratingGap: number;
  genderVariance: number;
  positionScore: number;
  femaleDistribution: number[];
  setterDistribution: number[];
} {
  const effectiveRatings = teams.map(t => getTeamEffectiveStrength(t.players));
  const ratingGap = Math.max(...effectiveRatings) - Math.min(...effectiveRatings);

  const femaleCounts = teams.map(t => t.femaleCount);
  const avgFemale = femaleCounts.reduce((a, b) => a + b, 0) / NUM_TEAMS;
  const genderVariance = femaleCounts.reduce((sum, c) => sum + Math.pow(c - avgFemale, 2), 0) / NUM_TEAMS;

  const setterCounts = teams.map(t => t.positionCounts.setter);
  const setterScore = teams.filter(t => t.positionCounts.setter >= 1).length;

  return {
    ratingGap,
    genderVariance,
    positionScore: setterScore,
    femaleDistribution: femaleCounts,
    setterDistribution: setterCounts,
  };
}

/**
 * Calculate a combined score for team balance (lower is better).
 * Heavily penalizes demographic constraint violations.
 */
function calculateBalanceScore(
  ratingGap: number,
  genderVariance: number,
  positionScore: number,
  femaleDistValid: boolean,
  setterDistValid: boolean
): number {
  let score = 0;

  // HARD CONSTRAINT PENALTIES (very high)
  if (!femaleDistValid) score += 1000;
  if (!setterDistValid) score += 500;

  // Rating gap: primary optimization factor
  score += ratingGap * 10;

  // Gender variance (soft constraint for non-perfect cases)
  score += genderVariance * 5;

  // Position score: bonus for having setters on all teams
  score += (NUM_TEAMS - positionScore) * 3;

  return score;
}

/**
 * Distribute players with hard constraints using a constraint-first approach.
 * Ensures demographic groups are distributed as evenly as possible before
 * optimizing for rating balance.
 */
function generateConstrainedConfiguration(
  availablePlayers: Player[],
  options?: TeamGenerationOptions
): Player[][] {
  const teamPlayers: Player[][] = [[], [], []];
  const assignedIds = new Set<number | string>();

  // Helper to mark player as assigned
  const assignPlayer = (player: Player, teamIdx: number) => {
    teamPlayers[teamIdx].push(player);
    assignedIds.add(player.id);
  };

  // Helper to check if team has space
  const hasSpace = (teamIdx: number) => teamPlayers[teamIdx].length < PLAYERS_PER_TEAM;

  // Handle A&V pairing constraint
  let avTeamIdx: number | null = null;
  if (options?.keepAVTogether) {
    const vovaPlayer = availablePlayers.find(p =>
      p.full_name.toLowerCase().includes('вов') ||
      p.full_name.toLowerCase().includes('vov')
    );
    const alinaPlayer = availablePlayers.find(p =>
      p.full_name.toLowerCase().includes('алин') ||
      p.full_name.toLowerCase().includes('alin')
    );

    if (vovaPlayer && alinaPlayer) {
      avTeamIdx = Math.floor(Math.random() * NUM_TEAMS);
      assignPlayer(vovaPlayer, avTeamIdx);
      assignPlayer(alinaPlayer, avTeamIdx);
    }
  }

  // Get unassigned players by category
  const getUnassigned = () => availablePlayers.filter(p => !assignedIds.has(p.id));

  const unassignedSetters = () => getUnassigned().filter(p => p.best_position === 'setter');
  const unassignedFemales = () => getUnassigned().filter(p => p.gender === 'female' && p.best_position !== 'setter');
  const unassignedMales = () => getUnassigned().filter(p => p.gender === 'male' && p.best_position !== 'setter');

  // STEP 1: Distribute SETTERS with hard constraint
  const setters = unassignedSetters();
  const setterTarget = calculateTargetDistribution(setters.length, NUM_TEAMS);
  const shuffledSetterTarget = shuffleArray([...setterTarget]); // Randomize which team gets more
  const shuffledSetters = shuffleArray(setters);

  // Track how many setters each team should get
  const setterQuota = [...shuffledSetterTarget];
  const teamOrder = shuffleArray([0, 1, 2]);

  for (const setter of shuffledSetters) {
    // Find a team that still needs a setter and has space
    let assigned = false;
    for (const teamIdx of teamOrder) {
      if (setterQuota[teamIdx] > 0 && hasSpace(teamIdx)) {
        assignPlayer(setter, teamIdx);
        setterQuota[teamIdx]--;
        assigned = true;
        break;
      }
    }
    // Fallback: assign to any team with space
    if (!assigned) {
      for (let t = 0; t < NUM_TEAMS; t++) {
        if (hasSpace(t)) {
          assignPlayer(setter, t);
          break;
        }
      }
    }
  }

  // STEP 2: Distribute FEMALES with hard constraint
  const females = unassignedFemales();
  const femaleTarget = calculateTargetDistribution(females.length, NUM_TEAMS);
  const shuffledFemaleTarget = shuffleArray([...femaleTarget]);
  const shuffledFemales = shuffleArray(females);

  const femaleQuota = [...shuffledFemaleTarget];
  const femaleTeamOrder = shuffleArray([0, 1, 2]);

  for (const female of shuffledFemales) {
    let assigned = false;
    for (const teamIdx of femaleTeamOrder) {
      if (femaleQuota[teamIdx] > 0 && hasSpace(teamIdx)) {
        assignPlayer(female, teamIdx);
        femaleQuota[teamIdx]--;
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      for (let t = 0; t < NUM_TEAMS; t++) {
        if (hasSpace(t)) {
          assignPlayer(female, t);
          break;
        }
      }
    }
  }

  // STEP 3: Distribute remaining MALES using rating-balanced approach
  const males = shuffleArray(unassignedMales());

  // Sort by effective rating for balanced snake draft
  const sortedMales = [...males].sort((a, b) => getEffectiveRating(b) - getEffectiveRating(a));

  // Randomize snake draft starting point
  let currentTeam = Math.floor(Math.random() * NUM_TEAMS);
  let direction = Math.random() < 0.5 ? 1 : -1;

  for (const player of sortedMales) {
    // Find team with space, prioritizing current team in snake order
    let attempts = 0;
    while (!hasSpace(currentTeam) && attempts < NUM_TEAMS * 2) {
      currentTeam = (currentTeam + direction + NUM_TEAMS) % NUM_TEAMS;
      attempts++;
    }

    if (hasSpace(currentTeam)) {
      assignPlayer(player, currentTeam);
    }

    // Snake pattern movement
    if (currentTeam === NUM_TEAMS - 1 && direction === 1) {
      direction = -1;
    } else if (currentTeam === 0 && direction === -1) {
      direction = 1;
    } else {
      currentTeam = (currentTeam + direction + NUM_TEAMS) % NUM_TEAMS;
    }
  }

  return teamPlayers;
}

/**
 * Main team generation function.
 * Generates multiple configurations with hard demographic constraints
 * and picks the one with best rating balance.
 */
export function generateThreeTeams(
  availablePlayers: Player[],
  options?: TeamGenerationOptions
): TeamGenerationResult {
  if (availablePlayers.length !== 18) {
    throw new Error('Exactly 18 players are required to generate 3 teams of 6');
  }

  // Calculate expected distributions for validation
  const allSetters = availablePlayers.filter(p => p.best_position === 'setter');
  const allFemales = availablePlayers.filter(p => p.gender === 'female');

  // Adjust female count if A&V constraint is active (Alina is counted separately)
  let expectedFemaleCount = allFemales.length;
  if (options?.keepAVTogether) {
    const alinaPlayer = availablePlayers.find(p =>
      p.full_name.toLowerCase().includes('алин') ||
      p.full_name.toLowerCase().includes('alin')
    );
    // If Alina is a non-setter female, she's handled in A&V constraint
    if (alinaPlayer && alinaPlayer.best_position !== 'setter') {
      expectedFemaleCount = allFemales.filter(p =>
        !p.full_name.toLowerCase().includes('алин') &&
        !p.full_name.toLowerCase().includes('alin')
      ).length;
    }
  }

  const targetSetterDist = calculateTargetDistribution(allSetters.length, NUM_TEAMS);
  const targetFemaleDist = calculateTargetDistribution(expectedFemaleCount, NUM_TEAMS);

  let bestTeams: Team[] | null = null;
  let bestScore = Infinity;
  let bestMetrics = {
    ratingGap: Infinity,
    genderVariance: Infinity,
    positionScore: 0,
    femaleDistribution: [0, 0, 0],
    setterDistribution: [0, 0, 0],
  };

  // Generate multiple configurations and pick the best valid one
  for (let i = 0; i < NUM_ITERATIONS; i++) {
    const teamPlayers = generateConstrainedConfiguration(availablePlayers, options);

    // Validate: all teams must have exactly 6 players
    if (!teamPlayers.every(t => t.length === PLAYERS_PER_TEAM)) continue;

    const teams: Team[] = teamPlayers.map((players, idx) => ({
      name: TEAM_NAMES[idx],
      ...calculateTeamStats(players),
    }));

    const metrics = evaluateBalance(teams);

    // Check if hard constraints are satisfied
    const femaleDistValid = isValidDistribution(metrics.femaleDistribution, targetFemaleDist);
    const setterDistValid = isValidDistribution(metrics.setterDistribution, targetSetterDist);

    const score = calculateBalanceScore(
      metrics.ratingGap,
      metrics.genderVariance,
      metrics.positionScore,
      femaleDistValid,
      setterDistValid
    );

    if (score < bestScore) {
      bestScore = score;
      bestTeams = teams;
      bestMetrics = metrics;
    }
  }

  // Fallback if no configuration found
  if (!bestTeams) {
    const teamPlayers = generateConstrainedConfiguration(availablePlayers, options);
    bestTeams = teamPlayers.map((players, idx) => ({
      name: TEAM_NAMES[idx],
      ...calculateTeamStats(players),
    }));
    bestMetrics = evaluateBalance(bestTeams);
  }

  const { ratingGap, genderVariance, positionScore, femaleDistribution, setterDistribution } = bestMetrics;

  // Check final constraint satisfaction
  const femaleDistValid = isValidDistribution(femaleDistribution, targetFemaleDist);
  const setterDistValid = isValidDistribution(setterDistribution, targetSetterDist);

  // Determine balance quality with improved thresholds
  let balanceQuality: 'excellent' | 'good' | 'fair';
  let balanceMessage: string;

  const perfectDemographics = femaleDistValid && setterDistValid;

  if (ratingGap <= 2 && perfectDemographics && positionScore === NUM_TEAMS) {
    balanceQuality = 'excellent';
    balanceMessage = 'Excellent balance! Teams are perfectly matched in demographics and very close in rating.';
  } else if (ratingGap <= 3.5 && perfectDemographics) {
    balanceQuality = 'excellent';
    balanceMessage = 'Excellent balance! Perfect demographic distribution with minimal rating gap.';
  } else if (ratingGap <= 5 && genderVariance <= 0.5) {
    balanceQuality = 'good';
    const messages: string[] = [];
    if (ratingGap > 3) messages.push(`Rating gap: ${ratingGap.toFixed(1)} pts`);
    if (!femaleDistValid) messages.push('Female distribution slightly uneven');
    if (positionScore < NUM_TEAMS) messages.push('Not all teams have a setter');
    balanceMessage = `Good balance. ${messages.join('. ') || 'Minor variations in distribution.'}`;
  } else {
    balanceQuality = 'fair';
    const effectiveStrengths = bestTeams.map(t => ({
      name: t.name,
      strength: getTeamEffectiveStrength(t.players)
    }));
    const strongest = effectiveStrengths.reduce((a, b) => a.strength > b.strength ? a : b);
    balanceMessage = `Fair balance. ${strongest.name} is stronger (${strongest.strength.toFixed(1)}). Female distribution: ${femaleDistribution.join('/')}.`;
  }

  return {
    teams: bestTeams,
    ratingGap: Math.round(ratingGap * 10) / 10,
    balanceQuality,
    balanceMessage,
  };
}
