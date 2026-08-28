import { UserProfile, RunRecord, Territory, LeaderboardEntry, Badge } from '../types';

const STORAGE_KEYS = {
  USER_PROFILE: 'geofit_user_profile',
  RUNS: 'geofit_runs',
  TERRITORIES: 'geofit_territories',
  LEADERBOARD: 'geofit_leaderboard',
  SETTINGS: 'geofit_settings',
  ACTIVE_USER_ID: 'geofit_active_user_id',
  GOOGLE_MAPS_KEY: 'geofit_google_maps_key',
};

const DEFAULT_BADGES: Badge[] = [
  {
    id: 'first_capture',
    name: 'First Landfall',
    description: 'Complete your first closed-loop territory capture',
    icon: '🚩',
    category: 'territory',
  },
  {
    id: 'hectare_hero',
    name: 'Hectare Hero',
    description: 'Capture a single territory larger than 5,000 m²',
    icon: '🏰',
    category: 'territory',
  },
  {
    id: 'domain_ruler',
    name: 'Domain Ruler',
    description: 'Accumulate over 25,000 m² of total claimed territory',
    icon: '👑',
    category: 'territory',
  },
  {
    id: 'distance_5k',
    name: '5K Pathfinder',
    description: 'Complete a single run longer than 5 kilometers',
    icon: '⚡',
    category: 'distance',
  },
  {
    id: 'loop_artist',
    name: 'Loop Artist',
    description: 'Successfully close 5 territory loops',
    icon: '🌀',
    category: 'streak',
  },
];

const INITIAL_USER: UserProfile = {
  userId: 'user_local_1',
  name: 'Runner Alpha',
  email: 'runner@geofit.io',
  totalDistanceMeters: 0,
  totalTerritoryMeters: 0,
  totalRuns: 0,
  bestRunMeters: 0,
  bestTerritoryMeters: 0,
  createdAt: Date.now(),
};

const INITIAL_LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    userId: 'bot_1',
    name: 'Elena Rostova',
    totalTerritoryMeters: 58400,
    totalDistanceMeters: 32600,
    runsCount: 14,
  },
  {
    rank: 2,
    userId: 'bot_2',
    name: 'Marcus Vance',
    totalTerritoryMeters: 44200,
    totalDistanceMeters: 26800,
    runsCount: 11,
  },
  {
    rank: 3,
    userId: 'bot_3',
    name: 'Kai Takahashi',
    totalTerritoryMeters: 38900,
    totalDistanceMeters: 21500,
    runsCount: 9,
  },
  {
    rank: 4,
    userId: 'bot_4',
    name: 'Jordan Hayes',
    totalTerritoryMeters: 27300,
    totalDistanceMeters: 18200,
    runsCount: 8,
  },
  {
    rank: 5,
    userId: 'bot_5',
    name: 'Sofia Chen',
    totalTerritoryMeters: 19800,
    totalDistanceMeters: 14700,
    runsCount: 6,
  },
];

export class StorageService {
  private static instance: StorageService;

  private constructor() {
    this.initializeDefaults();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private initializeDefaults() {
    if (!localStorage.getItem(STORAGE_KEYS.USER_PROFILE)) {
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(INITIAL_USER));
    }
    if (!localStorage.getItem(STORAGE_KEYS.RUNS)) {
      localStorage.setItem(STORAGE_KEYS.RUNS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TERRITORIES)) {
      localStorage.setItem(STORAGE_KEYS.TERRITORIES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LEADERBOARD)) {
      localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(INITIAL_LEADERBOARD));
    }
  }

  public getUserProfile(): UserProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return data ? JSON.parse(data) : INITIAL_USER;
    } catch {
      return INITIAL_USER;
    }
  }

  public updateUserProfile(profile: Partial<UserProfile>): UserProfile {
    const current = this.getUserProfile();
    const updated: UserProfile = { ...current, ...profile };
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated));
    this.updateLeaderboardForUser(updated);
    return updated;
  }

  public getRuns(): RunRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RUNS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public saveRun(run: RunRecord): void {
    const runs = this.getRuns();
    runs.unshift(run);
    localStorage.setItem(STORAGE_KEYS.RUNS, JSON.stringify(runs));

    // Update User Profile Stats
    const user = this.getUserProfile();
    const newTotalDistance = user.totalDistanceMeters + run.distanceMeters;
    const newTotalRuns = user.totalRuns + 1;
    const newBestRun = Math.max(user.bestRunMeters, run.distanceMeters);

    this.updateUserProfile({
      totalDistanceMeters: newTotalDistance,
      totalRuns: newTotalRuns,
      bestRunMeters: newBestRun,
    });
  }

  public getTerritories(): Territory[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TERRITORIES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public saveTerritory(territory: Territory): void {
    const territories = this.getTerritories();
    territories.unshift(territory);
    localStorage.setItem(STORAGE_KEYS.TERRITORIES, JSON.stringify(territories));

    // Update User Profile Total Territory
    const user = this.getUserProfile();
    const newTotalTerritory = user.totalTerritoryMeters + territory.areaMeters;
    const newBestTerritory = Math.max(user.bestTerritoryMeters, territory.areaMeters);

    this.updateUserProfile({
      totalTerritoryMeters: newTotalTerritory,
      bestTerritoryMeters: newBestTerritory,
    });
  }

  public getLeaderboard(): LeaderboardEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);
      const list: LeaderboardEntry[] = data ? JSON.parse(data) : INITIAL_LEADERBOARD;
      const user = this.getUserProfile();

      // Ensure current user is on leaderboard
      const userEntryIndex = list.findIndex(e => e.userId === user.userId);
      const userEntry: LeaderboardEntry = {
        rank: 0,
        userId: user.userId,
        name: user.name,
        totalTerritoryMeters: user.totalTerritoryMeters,
        totalDistanceMeters: user.totalDistanceMeters,
        runsCount: user.totalRuns,
        isCurrentUser: true,
      };

      if (userEntryIndex >= 0) {
        list[userEntryIndex] = userEntry;
      } else {
        list.push(userEntry);
      }

      // Sort by primary metric: Total Territory (as mandated by GEOFIT specification)
      list.sort((a, b) => b.totalTerritoryMeters - a.totalTerritoryMeters || b.totalDistanceMeters - a.totalDistanceMeters);

      // Re-assign ranks
      list.forEach((item, index) => {
        item.rank = index + 1;
        item.isCurrentUser = item.userId === user.userId;
      });

      return list;
    } catch {
      return INITIAL_LEADERBOARD;
    }
  }

  private updateLeaderboardForUser(user: UserProfile) {
    const leaderboard = this.getLeaderboard();
    localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(leaderboard));
  }

  public getBadges(): Badge[] {
    const user = this.getUserProfile();
    const territories = this.getTerritories();
    const runs = this.getRuns();

    return DEFAULT_BADGES.map(badge => {
      let isUnlocked = false;
      if (badge.id === 'first_capture' && territories.length > 0) isUnlocked = true;
      if (badge.id === 'hectare_hero' && user.bestTerritoryMeters >= 5000) isUnlocked = true;
      if (badge.id === 'domain_ruler' && user.totalTerritoryMeters >= 25000) isUnlocked = true;
      if (badge.id === 'distance_5k' && user.bestRunMeters >= 5000) isUnlocked = true;
      if (badge.id === 'loop_artist' && territories.length >= 5) isUnlocked = true;

      return {
        ...badge,
        unlockedAt: isUnlocked ? Date.now() : undefined,
      };
    });
  }

  public getGoogleMapsApiKey(): string {
    return localStorage.getItem(STORAGE_KEYS.GOOGLE_MAPS_KEY) || ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string) || '';
  }

  public setGoogleMapsApiKey(key: string): void {
    if (!key) {
      localStorage.removeItem(STORAGE_KEYS.GOOGLE_MAPS_KEY);
    } else {
      localStorage.setItem(STORAGE_KEYS.GOOGLE_MAPS_KEY, key.trim());
    }
  }

  public resetAllData(): void {
    localStorage.clear();
    this.initializeDefaults();
  }
}

export const storageService = StorageService.getInstance();
