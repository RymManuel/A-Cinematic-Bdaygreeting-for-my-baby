import { HER_NAME } from './photos';

export interface NarrationCue {
  start: number; // seconds
  end: number;
  lines: string[];
  big?: boolean; // larger emphasis text (e.g. the name / final lines)
  serif?: boolean;
}

// Total experience ~ 155 seconds
export const TOTAL_DURATION = 158;

export const NARRATION: NarrationCue[] = [
  // OPENING — typewriter style discovery
  { start: 2.5, end: 6.5, lines: ['Scanning Observable Universe...'] },
  { start: 7, end: 10.5, lines: ['Analyzing 13.8 Billion Years...'] },
  { start: 11, end: 14.5, lines: ['Searching For Something Extraordinary...'] },
  { start: 15, end: 17.5, lines: ['Searching . . .'] },
  { start: 18, end: 21, lines: ['1 Anomaly Found'], big: true },
  { start: 22.5, end: 28, lines: [HER_NAME], big: true, serif: true },

  // SCENE 2 — Cosmic discovery
  { start: 31, end: 36, lines: ['Some people exist.', 'Some people change worlds.'] },
  { start: 37, end: 42, lines: ['One person changed mine.'], big: true },

  // SCENE 3 transition text
  { start: 45, end: 50, lines: ['A universe of moments...', 'all of them, you.'] },

  // SCENE 5 — Constellation
  { start: 84, end: 90, lines: ['The stars are drawing something...'] },

  // SCENE 6 — Multiverse
  { start: 104, end: 109, lines: ['Testing every reality...'] },
  { start: 120, end: 125, lines: ['Outcome Consistent Across All Timelines.'] },
  { start: 125.5, end: 132, lines: ['Across Infinite Universes...', 'I Would Still Choose You.'], big: true },

  // SCENE 8 — Final analysis (over the heart)
  { start: 137, end: 140, lines: ['Analysis Complete.'] },
  { start: 140.5, end: 143.5, lines: ['After Searching Infinite Galaxies...'] },
  { start: 144, end: 147, lines: ['After Reviewing Every Possibility...'] },
  { start: 147.5, end: 150, lines: ['One Conclusion Remains.'] },
  { start: 150.5, end: 154, lines: ['Thank You For Existing.'], big: true },
  { start: 154.5, end: 158, lines: [`Happy Birthday, ${HER_NAME}`, 'You make this universe better.'], big: true, serif: true },
];

// Universe verification entries for Scene 6
export const UNIVERSES = [
  '#0001', '#0247', '#1893', '#18472', '#42069', '#88231', '#314159', '#999999',
];
