import { Transition, Variants } from 'motion/react';

export type AnimationIntensity = 'minimal' | 'balanced' | 'supreme' | 'cinematic';

// High-fidelity spring presets matching Apple-level physics
export const SPRING_PRESETS = {
  minimal: {
    type: 'spring' as const,
    stiffness: 380,
    damping: 40,
    mass: 1,
  },
  balanced: {
    type: 'spring' as const,
    stiffness: 180,
    damping: 22,
    mass: 0.9,
  },
  supreme: {
    type: 'spring' as const,
    stiffness: 320,
    damping: 18,
    mass: 0.75, // Snappy, premium, highly energetic but physically believable
  },
  cinematic: {
    type: 'spring' as const,
    stiffness: 75,
    damping: 15,
    mass: 1.3, // Luxurious, slow-sweeping, high momentum and cinematic weight
  },
};

// Fluid cubic-bezier eases for backup / non-spring animations
export const EASE_PRESETS = {
  minimal: [0.25, 0.1, 0.25, 1.0], // Standard ease
  balanced: [0.16, 1, 0.3, 1],     // Out quart (clean & quick)
  supreme: [0.25, 1, 0.5, 1],      // Custom quick-decelerate
  cinematic: [0.85, 0, 0.15, 1],   // High-contrast, sweeping dramatic timing curve
};

/**
 * Returns a robust Transition definition matched to the user's intensity preference.
 */
export function getSpringTransition(
  intensity: AnimationIntensity = 'supreme',
  delay = 0,
  overrides?: Partial<Transition>
): Transition {
  const preset = SPRING_PRESETS[intensity] || SPRING_PRESETS.supreme;
  return {
    ...preset,
    delay,
    ...overrides,
  };
}

/**
 * Generates custom Page Transition Variants to enable highly aesthetic entrance/exit sweeps.
 */
export function getPageVariants(intensity: AnimationIntensity = 'supreme'): Variants {
  switch (intensity) {
    case 'minimal':
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
    case 'balanced':
      return {
        initial: { opacity: 0, y: 15, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -15, scale: 0.98 },
      };
    case 'supreme':
      return {
        initial: { opacity: 0, y: 25, scale: 0.96, rotateX: 5 },
        animate: { opacity: 1, y: 0, scale: 1, rotateX: 0 },
        exit: { opacity: 0, y: -25, scale: 0.96, rotateX: -5 },
      };
    case 'cinematic':
    default:
      return {
        initial: { opacity: 0, y: 40, scale: 0.92, filter: 'blur(10px)', rotateX: 10 },
        animate: { opacity: 1, y: 0, scale: 1, rotateX: 0, filter: 'blur(0px)' },
        exit: { opacity: 0, y: -40, scale: 0.92, filter: 'blur(10px)', rotateX: -10 },
      };
  }
}

/**
 * Custom micro-interactions for luxurious hover and press animations.
 */
export function getButtonMotion(intensity: AnimationIntensity = 'supreme') {
  if (intensity === 'minimal') {
    return {
      whileHover: { scale: 1.02 },
      whileTap: { scale: 0.98 },
    };
  }
  if (intensity === 'balanced') {
    return {
      whileHover: { scale: 1.05, y: -1 },
      whileTap: { scale: 0.96 },
    };
  }
  if (intensity === 'supreme') {
    return {
      whileHover: { scale: 1.08, y: -2, filter: 'brightness(1.15)' },
      whileTap: { scale: 0.94, y: 0 },
    };
  }
  // Cinematic slow bounce and float
  return {
    whileHover: { 
      scale: 1.12, 
      y: -4, 
      filter: 'brightness(1.2) drop-shadow(0 12px 20px rgba(0,0,0,0.4))',
    },
    whileTap: { 
      scale: 0.92, 
      y: 1,
      filter: 'brightness(0.95)',
    },
  };
}

/**
 * Micro-stagger utilities for lists and grid child elements.
 */
export function getStaggerContainerVariants(intensity: AnimationIntensity = 'supreme', staggerChildren = 0.05): Variants {
  if (intensity === 'minimal') {
    return {
      initial: {},
      animate: { transition: { staggerChildren: 0.02 } },
    };
  }
  return {
    initial: {},
    animate: {
      transition: {
        staggerChildren: intensity === 'cinematic' ? 0.12 : staggerChildren,
      },
    },
  };
}

export function getStaggerItemVariants(intensity: AnimationIntensity = 'supreme'): Variants {
  switch (intensity) {
    case 'minimal':
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
      };
    case 'balanced':
      return {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
      };
    case 'supreme':
      return {
        initial: { opacity: 0, y: 15, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
      };
    case 'cinematic':
    default:
      return {
        initial: { opacity: 0, y: 30, scale: 0.94, filter: 'blur(5px)' },
        animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
      };
  }
}
