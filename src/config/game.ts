export type Quality = 'low' | 'medium' | 'high' | 'ultra'

export const gameConfig = {
  seed: 240817,
  initialHour: 17.25,
  defaultQuality: 'high' as Quality,
  secondsPerDay: 18 * 60,
  fixedStep: 1 / 60,
}
