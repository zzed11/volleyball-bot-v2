import { Player, Team, TeamGenerationResult, PlayerPosition } from '@/types/player';

const TEAM_NAMES = ['Team A', 'Team B', 'Team C'];

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

function evaluateBalance(teams: Team[]): { ratingGap: number; genderVariance: number; positionScore: number } {
  const ratings = teams.map(t => t.averageRating);
  const ratingGap = Math.max(...ratings) - Math.min(...ratings);
  
  const femaleCounts = teams.map(t => t.femaleCount);
  const avgFemale = femaleCounts.reduce((a, b) => a + b, 0) / 3;
  const genderVariance = femaleCounts.reduce((sum, c) => sum + Math.pow(c - avgFemale, 2), 0) / 3;
  
  // Check if each team has at least one setter
  const setterScore = teams.filter(t => t.positionCounts.setter >= 1).length;
  const positionScore = setterScore;
  
  return { ratingGap, genderVariance, positionScore };
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateThreeTeams(availablePlayers: Player[]): TeamGenerationResult {
  if (availablePlayers.length !== 18) {
    throw new Error('Exactly 18 players are required to generate 3 teams of 6');
  }

  // Sort players by rating (descending) for snake draft
  const sortedPlayers = [...availablePlayers].sort((a, b) => b.overall_rating - a.overall_rating);
  
  // Separate setters and other players
  const setters = sortedPlayers.filter(p => p.best_position === 'setter');
  const females = sortedPlayers.filter(p => p.gender === 'female' && p.best_position !== 'setter');
  const otherPlayers = sortedPlayers.filter(p => p.gender === 'male' && p.best_position !== 'setter');
  
  // Initialize teams
  const teamPlayers: Player[][] = [[], [], []];
  
  // First, distribute setters evenly (one per team if possible)
  const shuffledSetters = shuffleArray(setters);
  for (let i = 0; i < Math.min(3, shuffledSetters.length); i++) {
    teamPlayers[i].push(shuffledSetters[i]);
  }
  
  // Add remaining setters to teams with fewest players
  for (let i = 3; i < shuffledSetters.length; i++) {
    const smallestTeamIdx = teamPlayers
      .map((t, idx) => ({ size: t.length, idx }))
      .sort((a, b) => a.size - b.size)[0].idx;
    teamPlayers[smallestTeamIdx].push(shuffledSetters[i]);
  }
  
  // Distribute females evenly
  const shuffledFemales = shuffleArray(females);
  let femaleIdx = 0;
  while (femaleIdx < shuffledFemales.length) {
    for (let teamIdx = 0; teamIdx < 3 && femaleIdx < shuffledFemales.length; teamIdx++) {
      if (teamPlayers[teamIdx].length < 6) {
        teamPlayers[teamIdx].push(shuffledFemales[femaleIdx]);
        femaleIdx++;
      }
    }
  }
  
  // Remaining players distributed via snake draft for balance
  const remainingPlayers = [...otherPlayers].filter(
    p => !teamPlayers.flat().includes(p)
  );
  
  // Sort remaining by rating
  remainingPlayers.sort((a, b) => b.overall_rating - a.overall_rating);
  
  // Snake draft: 0,1,2,2,1,0,0,1,2...
  let direction = 1;
  let currentTeam = 0;
  
  for (const player of remainingPlayers) {
    // Find team with space that hasn't been filled
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
      currentTeam += direction;
    }
  }
  
  // Create team objects
  const teams: Team[] = teamPlayers.map((players, idx) => ({
    name: TEAM_NAMES[idx],
    ...calculateTeamStats(players),
  }));
  
  // Calculate balance metrics
  const { ratingGap, genderVariance, positionScore } = evaluateBalance(teams);
  
  // Determine balance quality
  let balanceQuality: 'excellent' | 'good' | 'fair';
  let balanceMessage: string;
  
  if (ratingGap <= 3 && genderVariance <= 1 && positionScore === 3) {
    balanceQuality = 'excellent';
    balanceMessage = 'Excellent balance! Teams are very evenly matched in rating, gender distribution, and positions.';
  } else if (ratingGap <= 5 && genderVariance <= 2) {
    balanceQuality = 'good';
    const messages: string[] = [];
    if (ratingGap > 3) messages.push(`Rating gap of ${ratingGap.toFixed(1)} points`);
    if (positionScore < 3) messages.push('Not all teams have a setter');
    balanceMessage = `Good balance overall. ${messages.join('. ') || 'Minor variations in distribution.'}`;
  } else {
    balanceQuality = 'fair';
    const strongest = teams.reduce((a, b) => a.averageRating > b.averageRating ? a : b);
    balanceMessage = `Fair balance. ${strongest.name} is slightly stronger by rating (${strongest.averageRating.toFixed(1)}), but positions and gender are reasonably distributed.`;
  }
  
  return {
    teams,
    ratingGap: Math.round(ratingGap * 10) / 10,
    balanceQuality,
    balanceMessage,
  };
}
