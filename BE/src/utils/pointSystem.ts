// Trophy and XP scoring system with streak logic

export class PointSystem {
  // Trophy: only from tournament
  static calculateTrophy(isCorrect: boolean, currentStreak: number = 0): number {
    if (isCorrect) {
      // If this completes a 3-streak, grant bonus
      if (currentStreak >= 2) {
        // Already 2 correct, this is 3rd
        return 14; // +14 total (includes the +10 base)
      }
      return 10; // Single correct or 1-2 streak
    } else {
      // Wrong answer resets streak
      return -3;
    }
  }

  // XP: from quiz, writing, pronunciation
  static calculateXP(isCorrect: boolean, currentStreak: number = 0): number {
    if (isCorrect) {
      // Same logic as trophy - if 3rd correct in row, +14
      if (currentStreak >= 2) {
        return 14;
      }
      return 10;
    } else {
      return -3;
    }
  }

  // Check if user can join tournament
  static canJoinTournament(totalXP: number): boolean {
    return totalXP >= 1000;
  }

  // Get streak status
  static getStreakInfo(answers: boolean[]): { correctCount: number; total: number } {
    let correctCount = 0;
    for (const isCorrect of answers) {
      if (isCorrect) {
        correctCount++;
      } else {
        break; // Streak breaks
      }
    }
    return { correctCount, total: answers.length };
  }
}

// Track per-session streak during quiz/tournament
export class SessionStreakTracker {
  private correctStreak: number = 0;

  updateStreak(isCorrect: boolean): number {
    if (isCorrect) {
      this.correctStreak++;
    } else {
      this.correctStreak = 0;
    }
    return this.correctStreak;
  }

  getCurrentStreak(): number {
    return this.correctStreak;
  }

  reset(): void {
    this.correctStreak = 0;
  }
}
