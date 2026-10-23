export const CHECKIN_MOODS = ['glowing', 'calm', 'tired', 'missing', 'stressed', 'grateful'] as const;
export type CheckinMood = typeof CHECKIN_MOODS[number];

const PROMPTS = [
  'What made you smile today?',
  'One thing you appreciated about us this week?',
  'What would make tomorrow feel easier?',
  'A small moment you want to remember?',
  'How can I make you feel closer tonight?',
  'What are you looking forward to together?',
  'Something that felt hard today?',
  'A compliment you have been holding onto?',
  'Where should our next little date be?',
  'What song is stuck in your head?',
  'A memory that still makes you laugh?',
  'What does love look like for you today?',
];

export function utcDay(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

export function promptForDay(day: string) {
  let hash = 2166136261;
  for (let i = 0; i < day.length; i++) hash = Math.imul(hash ^ day.charCodeAt(i), 16777619);
  return PROMPTS[Math.abs(hash) % PROMPTS.length];
}

export function isCheckinMood(value: string): value is CheckinMood {
  return (CHECKIN_MOODS as readonly string[]).includes(value);
}
