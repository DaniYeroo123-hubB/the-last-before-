import { Theme, ThemeId } from '../types';

export interface ThemeEngineSettings {
  autoThemesEnabled: boolean;
  reducedMotion: boolean;
  batterySaver: boolean;
  animationIntensity: number;
  glowIntensity: number;
  transparency: number;
  blurLevel: number;
  favoriteThemeIds: ThemeId[];
  birthdayDate?: string;
  anniversaryDate?: string;
  specialOccasions: {
    newYear: boolean;
    christmas: boolean;
    birthday: boolean;
    anniversary: boolean;
    holiday: boolean;
  };
}

export interface WeatherInfo {
  condition: 'clear' | 'clouds' | 'rain' | 'snow' | 'storm' | 'mist';
  temperature: number | null;
  description: string;
  isAvailable: boolean;
  source: 'none' | 'geolocation' | 'fallback';
}

export interface IntelligentThemeState {
  resolvedTheme: Theme;
  scene: 'before-sunrise' | 'sunrise' | 'morning' | 'noon' | 'afternoon' | 'sunset' | 'evening' | 'midnight';
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  weather: WeatherInfo;
  specialOccasion: string | null;
  accentLabel: string;
  ambientMode: 'sunrise' | 'morning' | 'afternoon' | 'sunset' | 'night' | 'storm';
  motionScale: number;
}

export const DEFAULT_THEME_ENGINE_SETTINGS: ThemeEngineSettings = {
  autoThemesEnabled: true,
  reducedMotion: false,
  batterySaver: false,
  animationIntensity: 78,
  glowIntensity: 72,
  transparency: 72,
  blurLevel: 78,
  favoriteThemeIds: ['neon-aura', 'cyberpunk', 'rose-gold'],
  specialOccasions: {
    newYear: true,
    christmas: true,
    birthday: false,
    anniversary: false,
    holiday: true,
  },
};

export function getDefaultThemeEngineSettings(): ThemeEngineSettings {
  return {
    ...DEFAULT_THEME_ENGINE_SETTINGS,
    favoriteThemeIds: [...DEFAULT_THEME_ENGINE_SETTINGS.favoriteThemeIds],
    specialOccasions: {
      ...DEFAULT_THEME_ENGINE_SETTINGS.specialOccasions,
    },
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getSceneForTime(date: Date): IntelligentThemeState['scene'] {
  const hour = date.getHours();
  if (hour >= 0 && hour < 3) return 'midnight';
  if (hour >= 3 && hour < 5) return 'before-sunrise';
  if (hour >= 5 && hour < 7) return 'sunrise';
  if (hour >= 7 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 13) return 'noon';
  if (hour >= 13 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'sunset';
  if (hour >= 20 && hour < 23) return 'evening';
  return 'midnight';
}

function getSeasonForDate(date: Date): IntelligentThemeState['season'] {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

function getSpecialOccasion(date: Date, settings: ThemeEngineSettings): string | null {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const currentKey = `${month}-${day}`;

  if (settings.specialOccasions.newYear && currentKey === '1-1') return 'New Year';
  if (settings.specialOccasions.christmas && currentKey === '12-25') return 'Christmas';
  if (settings.specialOccasions.birthday && settings.birthdayDate && currentKey === settings.birthdayDate) return 'Birthday';
  if (settings.specialOccasions.anniversary && settings.anniversaryDate && currentKey === settings.anniversaryDate) return 'Anniversary';
  if (settings.specialOccasions.holiday) {
    const holidaySet = ['7-4', '11-11', '12-31', '10-31'];
    if (holidaySet.includes(currentKey)) return 'Holiday Glow';
  }
  return null;
}

function getWeatherMood(weather: WeatherInfo): Partial<Pick<IntelligentThemeState, 'ambientMode'>> {
  switch (weather.condition) {
    case 'rain':
      return { ambientMode: 'storm' };
    case 'snow':
      return { ambientMode: 'night' };
    case 'storm':
      return { ambientMode: 'storm' };
    case 'clouds':
      return { ambientMode: 'afternoon' };
    case 'mist':
      return { ambientMode: 'morning' };
    default:
      return { ambientMode: 'afternoon' };
  }
}

function getAccentLabel(scene: IntelligentThemeState['scene'], specialOccasion: string | null) {
  if (specialOccasion) return specialOccasion;
  switch (scene) {
    case 'before-sunrise':
      return 'Before Sunrise';
    case 'sunrise':
      return 'Sunrise';
    case 'morning':
      return 'Morning';
    case 'noon':
      return 'Noon';
    case 'afternoon':
      return 'Afternoon';
    case 'sunset':
      return 'Sunset';
    case 'evening':
      return 'Evening';
    case 'midnight':
    default:
      return 'Midnight';
  }
}

function applySceneTone(baseTheme: Theme, scene: IntelligentThemeState['scene'], season: IntelligentThemeState['season'], weather: WeatherInfo, settings: ThemeEngineSettings) {
  const transparent = clamp(settings.transparency / 100, 0.3, 1);
  const blurValue = clamp(settings.blurLevel / 100, 0.25, 1);
  const glowStrength = clamp(settings.glowIntensity / 100, 0.2, 1);

  const sceneStyles: Record<IntelligentThemeState['scene'], { bg: string; cardBg: string; border: string; text: string; glow: string; gradient: string; primary: string; secondary: string; surface: string; surfaceAlt: string; overlay: string; muted: string; input: string; chip: string; hero: string; shadow: string; accent: string }> = {
    'before-sunrise': {
      bg: 'bg-slate-950/90',
      cardBg: 'bg-slate-900/70 backdrop-blur-xl border-slate-800/70',
      border: 'border-slate-800/70',
      text: 'text-slate-100',
      glow: `shadow-[0_0_${Math.round(18 + glowStrength * 10)}px_rgba(129,140,248,0.25)]`,
      gradient: `from-slate-700 via-indigo-700 to-slate-950`,
      primary: 'slate-300',
      secondary: 'indigo-400',
      surface: 'bg-slate-900/60',
      surfaceAlt: 'bg-slate-950/70',
      overlay: 'bg-slate-950/40',
      muted: 'text-slate-400',
      input: 'bg-slate-950/70 border-slate-800/70',
      chip: 'bg-slate-900/70 border-slate-800/70',
      hero: 'from-slate-700 to-indigo-900',
      shadow: 'shadow-[0_20px_60px_rgba(15,23,42,0.35)]',
      accent: 'text-indigo-300',
    },
    sunrise: {
      bg: 'bg-amber-950/85',
      cardBg: `bg-amber-900/40 backdrop-blur-${settings.blurLevel > 70 ? 'xl' : 'md'} border-amber-900/40`,
      border: 'border-amber-900/40',
      text: 'text-amber-50',
      glow: `shadow-[0_0_${Math.round(16 + glowStrength * 12)}px_rgba(251,191,36,0.28)]`,
      gradient: `from-amber-400 via-orange-500 to-rose-600`,
      primary: 'amber-300',
      secondary: 'rose-400',
      surface: 'bg-amber-950/30',
      surfaceAlt: 'bg-orange-950/30',
      overlay: 'bg-amber-950/35',
      muted: 'text-amber-200/80',
      input: 'bg-amber-950/30 border-amber-900/40',
      chip: 'bg-amber-950/30 border-amber-900/40',
      hero: 'from-amber-400 to-orange-500',
      shadow: 'shadow-[0_20px_60px_rgba(120,53,15,0.25)]',
      accent: 'text-amber-300',
    },
    morning: {
      bg: 'bg-slate-950/90',
      cardBg: `bg-slate-900/${Math.round(55 + transparent * 20)} backdrop-blur-${settings.blurLevel > 70 ? 'xl' : 'md'} border-slate-800/70`,
      border: 'border-slate-800/70',
      text: 'text-slate-100',
      glow: `shadow-[0_0_${Math.round(20 + glowStrength * 10)}px_rgba(34,211,238,0.18)]`,
      gradient: `from-cyan-400 via-sky-500 to-indigo-600`,
      primary: baseTheme.primary,
      secondary: baseTheme.secondary,
      surface: 'bg-slate-900/60',
      surfaceAlt: 'bg-slate-950/65',
      overlay: 'bg-cyan-950/20',
      muted: 'text-slate-400',
      input: 'bg-slate-950/70 border-slate-800/70',
      chip: 'bg-slate-900/70 border-slate-800/70',
      hero: `from-${baseTheme.primary} to-${baseTheme.secondary}`,
      shadow: 'shadow-[0_20px_60px_rgba(2,6,23,0.35)]',
      accent: 'text-cyan-300',
    },
    noon: {
      bg: 'bg-slate-950/90',
      cardBg: `bg-slate-900/${Math.round(48 + transparent * 18)} backdrop-blur-${settings.blurLevel > 70 ? 'xl' : 'md'} border-slate-800/70`,
      border: 'border-slate-800/70',
      text: 'text-slate-100',
      glow: `shadow-[0_0_${Math.round(16 + glowStrength * 8)}px_rgba(255,255,255,0.14)]`,
      gradient: `from-slate-100 via-slate-300 to-cyan-400`,
      primary: 'slate-200',
      secondary: 'cyan-300',
      surface: 'bg-slate-900/55',
      surfaceAlt: 'bg-slate-950/60',
      overlay: 'bg-slate-950/25',
      muted: 'text-slate-400',
      input: 'bg-slate-950/65 border-slate-800/70',
      chip: 'bg-slate-900/65 border-slate-800/70',
      hero: 'from-slate-200 to-cyan-400',
      shadow: 'shadow-[0_20px_60px_rgba(15,23,42,0.28)]',
      accent: 'text-slate-300',
    },
    afternoon: {
      bg: 'bg-slate-950/90',
      cardBg: `bg-slate-900/${Math.round(52 + transparent * 18)} backdrop-blur-${settings.blurLevel > 70 ? 'xl' : 'md'} border-slate-800/70`,
      border: 'border-slate-800/70',
      text: 'text-slate-100',
      glow: `shadow-[0_0_${Math.round(18 + glowStrength * 10)}px_rgba(96,165,250,0.18)]`,
      gradient: `from-sky-400 via-blue-500 to-violet-600`,
      primary: 'sky-300',
      secondary: 'violet-400',
      surface: 'bg-slate-900/55',
      surfaceAlt: 'bg-slate-950/60',
      overlay: 'bg-sky-950/20',
      muted: 'text-slate-400',
      input: 'bg-slate-950/65 border-slate-800/70',
      chip: 'bg-slate-900/65 border-slate-800/70',
      hero: 'from-sky-400 to-violet-500',
      shadow: 'shadow-[0_20px_60px_rgba(15,23,42,0.3)]',
      accent: 'text-sky-300',
    },
    sunset: {
      bg: 'bg-rose-950/90',
      cardBg: `bg-rose-900/40 backdrop-blur-${settings.blurLevel > 70 ? 'xl' : 'md'} border-rose-900/40`,
      border: 'border-rose-900/40',
      text: 'text-rose-50',
      glow: `shadow-[0_0_${Math.round(20 + glowStrength * 12)}px_rgba(251,113,133,0.24)]`,
      gradient: `from-orange-400 via-rose-500 to-fuchsia-700`,
      primary: 'orange-300',
      secondary: 'fuchsia-400',
      surface: 'bg-rose-950/35',
      surfaceAlt: 'bg-orange-950/30',
      overlay: 'bg-rose-950/30',
      muted: 'text-rose-200/80',
      input: 'bg-rose-950/30 border-rose-900/35',
      chip: 'bg-rose-950/30 border-rose-900/35',
      hero: 'from-orange-400 to-fuchsia-600',
      shadow: 'shadow-[0_20px_60px_rgba(120,53,15,0.28)]',
      accent: 'text-orange-300',
    },
    evening: {
      bg: 'bg-slate-950/90',
      cardBg: `bg-slate-900/${Math.round(58 + transparent * 16)} backdrop-blur-${settings.blurLevel > 70 ? 'xl' : 'md'} border-slate-800/70`,
      border: 'border-slate-800/70',
      text: 'text-slate-100',
      glow: `shadow-[0_0_${Math.round(18 + glowStrength * 10)}px_rgba(76,29,149,0.25)]`,
      gradient: `from-violet-600 via-fuchsia-600 to-slate-950`,
      primary: 'violet-300',
      secondary: 'fuchsia-400',
      surface: 'bg-slate-900/55',
      surfaceAlt: 'bg-slate-950/70',
      overlay: 'bg-violet-950/25',
      muted: 'text-slate-400',
      input: 'bg-slate-950/65 border-slate-800/70',
      chip: 'bg-slate-900/65 border-slate-800/70',
      hero: 'from-violet-600 to-fuchsia-600',
      shadow: 'shadow-[0_20px_60px_rgba(15,23,42,0.35)]',
      accent: 'text-violet-300',
    },
    midnight: {
      bg: 'bg-slate-950/95',
      cardBg: `bg-slate-900/${Math.round(60 + transparent * 16)} backdrop-blur-${settings.blurLevel > 70 ? 'xl' : 'md'} border-cyan-900/30`,
      border: 'border-cyan-900/30',
      text: 'text-slate-100',
      glow: `shadow-[0_0_${Math.round(20 + glowStrength * 12)}px_rgba(34,211,238,0.22)]`,
      gradient: `from-cyan-500 via-slate-900 to-fuchsia-700`,
      primary: 'cyan-300',
      secondary: 'fuchsia-400',
      surface: 'bg-slate-900/60',
      surfaceAlt: 'bg-cyan-950/20',
      overlay: 'bg-slate-950/50',
      muted: 'text-slate-400',
      input: 'bg-slate-950/70 border-cyan-900/30',
      chip: 'bg-slate-900/70 border-cyan-900/30',
      hero: 'from-cyan-500 to-fuchsia-600',
      shadow: 'shadow-[0_20px_60px_rgba(2,6,23,0.45)]',
      accent: 'text-cyan-300',
    },
  };

  const style = sceneStyles[scene];
  const seasonModifier = season === 'winter' ? 'text-slate-100' : style.text;
  const weatherModifier = weather.condition === 'rain' ? 'bg-slate-950/70' : style.overlay;

  return {
    ...baseTheme,
    bg: settings.batterySaver ? 'bg-slate-950/90' : baseTheme.bg,
    cardBg: settings.batterySaver ? 'bg-slate-900/60 backdrop-blur-md border-slate-800/70' : baseTheme.cardBg,
    border: settings.batterySaver ? 'border-slate-800/70' : baseTheme.border,
    text: settings.batterySaver ? 'text-slate-100' : baseTheme.text,
    glow: settings.batterySaver ? 'shadow-[0_0_14px_rgba(34,211,238,0.12)]' : style.glow,
    gradient: baseTheme.gradient,
    primary: baseTheme.primary,
    secondary: baseTheme.secondary,
    surface: style.surface,
    surfaceAlt: style.surfaceAlt,
    overlay: weatherModifier,
    muted: style.muted,
    input: style.input,
    chip: style.chip,
    hero: style.hero,
    shadow: settings.batterySaver ? 'shadow-[0_10px_30px_rgba(2,6,23,0.28)]' : style.shadow,
    accent: style.accent,
  };
}

export function resolveIntelligentTheme(baseTheme: Theme, date: Date, settings: ThemeEngineSettings, weather: WeatherInfo = { condition: 'clear', temperature: null, description: 'Clear skies', isAvailable: false, source: 'none' }): IntelligentThemeState {
  const scene = getSceneForTime(date);
  const season = getSeasonForDate(date);
  const specialOccasion = getSpecialOccasion(date, settings);
  const accentLabel = getAccentLabel(scene, specialOccasion);
  const weatherMood = getWeatherMood(weather);
  const ambientMode = weatherMood.ambientMode || 'afternoon';
  const resolvedTheme = applySceneTone(baseTheme, scene, season, weather, settings);
  const scale = settings.reducedMotion ? 0.4 : settings.batterySaver ? 0.7 : clamp(settings.animationIntensity / 100, 0.45, 1);

  return {
    resolvedTheme,
    scene,
    season,
    weather,
    specialOccasion,
    accentLabel,
    ambientMode,
    motionScale: scale,
  };
}

export async function fetchWeatherInfo(): Promise<WeatherInfo> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { condition: 'clear', temperature: null, description: 'Clear skies', isAvailable: false, source: 'none' };
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 7000, maximumAge: 30 * 60 * 1000 });
    });

    const { latitude, longitude } = position.coords;
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`);
    if (!response.ok) {
      throw new Error('Weather request failed');
    }
    const data = await response.json();
    const code = data?.current?.weather_code;
    const temperature = data?.current?.temperature_2m;
    const condition = mapWeatherCode(code);

    return {
      condition,
      temperature,
      description: describeCondition(condition),
      isAvailable: true,
      source: 'geolocation',
    };
  } catch (error) {
    return { condition: 'clear', temperature: null, description: 'Clear skies', isAvailable: false, source: 'fallback' };
  }
}

function mapWeatherCode(code: number | undefined): WeatherInfo['condition'] {
  if (code === undefined) return 'clear';
  if (code >= 95) return 'storm';
  if (code >= 80) return 'clouds';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 61 && code <= 67) return 'rain';
  if (code >= 45 && code <= 48) return 'mist';
  return 'clear';
}

function describeCondition(condition: WeatherInfo['condition']) {
  switch (condition) {
    case 'rain':
      return 'Rainy weather';
    case 'snow':
      return 'Snowfall';
    case 'storm':
      return 'Stormy skies';
    case 'clouds':
      return 'Cloudy skies';
    case 'mist':
      return 'Misty air';
    default:
      return 'Clear skies';
  }
}
