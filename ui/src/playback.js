// Exclude the current item when shuffling; zero/one-item lists remain safe.
export function nextPlaybackIndex(current, length, shuffle = false, random = Math.random) {
  if (length <= 1) return 0;
  if (!shuffle) return (current + 1) % length;
  return (current + 1 + Math.floor(Math.max(0, Math.min(0.999999, random())) * (length - 1))) % length;
}
