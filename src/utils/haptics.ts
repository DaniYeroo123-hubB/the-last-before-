/**
 * Offline-friendly safe Haptic feedback engine using the Web Vibration API.
 */
export const HAPTIC_PATTERNS = {
  // Light single tap - perfect for standard navigation, minor toggles
  light: 15,
  
  // Medium click - perfect for important actions like saving, start timers, adding alarms
  medium: 30,
  
  // Heavy strike - perfect for resets, triggers, or dismisses
  heavy: 60,
  
  // Subtle micro-tick - perfect for stopwatches and fast counting dials
  tick: 5,
  
  // High-success pulse chord
  success: [40, 60, 40],
  
  // Warning/Error double buzz
  error: [60, 50, 120],
  
  // Custom double pulse for repeating alarm clicks
  pulse: [80, 80],
};

class HapticEngine {
  private isEnabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dy_haptics_enabled');
      const hasVibrator = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
      if (stored !== null) {
        this.isEnabled = (stored === 'true') && hasVibrator;
      } else {
        this.isEnabled = hasVibrator;
      }
    }
  }

  setHapticsEnabled(enabled: boolean) {
    const hasVibrator = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
    this.isEnabled = enabled && hasVibrator;
    localStorage.setItem('dy_haptics_enabled', enabled ? 'true' : 'false');
  }

  isHapticsEnabled() {
    return this.isEnabled;
  }

  // Trigger a custom vibration pattern
  vibrate(pattern: keyof typeof HAPTIC_PATTERNS | number | number[]) {
    if (!this.isEnabled) return;
    try {
      if (typeof pattern === 'string') {
        const preconfigured = HAPTIC_PATTERNS[pattern as keyof typeof HAPTIC_PATTERNS];
        navigator.vibrate(preconfigured);
      } else {
        navigator.vibrate(pattern);
      }
    } catch (e) {
      console.warn('Haptic feedback blocked by browser sandbox or failed to execute:', e);
    }
  }

  // Specific high-level semantic triggers
  light() {
    this.vibrate('light');
  }

  medium() {
    this.vibrate('medium');
  }

  heavy() {
    this.vibrate('heavy');
  }

  tick() {
    this.vibrate('tick');
  }

  success() {
    this.vibrate('success');
  }

  error() {
    this.vibrate('error');
  }

  pulse() {
    this.vibrate('pulse');
  }
}

export const haptics = new HapticEngine();
export default haptics;
