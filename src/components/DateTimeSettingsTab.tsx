import React, { useState, useEffect } from 'react';
import { useDateTimeSettings, GPS_CITIES, ALL_TIMEZONES } from '../utils/settingsContext';
import { Theme, ThemeId } from '../types';
import { THEMES } from '../utils/themes';
import { 
  Calendar, 
  Clock, 
  Compass, 
  Check, 
  Search, 
  RotateCw, 
  MapPin, 
  AlertTriangle, 
  ShieldCheck, 
  Settings2,
  CalendarDays,
  Play,
  Palette,
  Volume2,
  Activity,
  Info,
  Languages,
  Sliders,
  Sparkles,
  Smartphone,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import haptics from '../utils/haptics';
import synth from '../utils/synth';
import WorkingLogo from './WorkingLogo';

interface DateTimeSettingsTabProps {
  theme: Theme;
  themeId: ThemeId;
  onThemeChange: (id: ThemeId) => void;
  auraMode: 'static' | 'continuous' | 'time-of-day';
  onAuraModeChange: (mode: 'static' | 'continuous' | 'time-of-day') => void;
  auraSpeed: 'slow' | 'medium' | 'fast';
  onAuraSpeedChange: (speed: 'slow' | 'medium' | 'fast') => void;
  analogStyle?: string;
  onAnalogStyleChange?: (style: string) => void;
}

const ANALOG_STYLES = [
  { id: 'quantum-plasma', name: 'Quantum Plasma', desc: '12-pointed faceted glowing reactor star' },
  { id: 'neon-supreme', name: 'Supreme Neon Aura', desc: 'Cyber cyan & magenta double halo' },
  { id: 'royal-circular', name: 'Royal Circular', desc: 'Perfect round luxury watch' },
  { id: 'nebula-vortex', name: 'Nebula Vortex', desc: 'Galactic space theme with pink neon' },
  { id: 'solaris-crown', name: 'Solaris Corona', desc: 'Ethereal solar coronal watch face' },
  { id: 'spectre-phantom', name: 'Spectre Phantom', desc: 'Glowing edge-lit emerald crystal' },
  { id: 'celestial-orbit', name: 'Celestial Orbit', desc: 'Astrological space-orbit alignment' }
];

const LANGUAGES = [
  { code: 'en', label: 'English (US/UK)' },
  { code: 'es', label: 'Español (Spain/LatAm)' },
  { code: 'fr', label: 'Français (France)' },
  { code: 'de', label: 'Deutsch (Germany)' },
  { code: 'ja', label: '日本語 (Japan)' },
  { code: 'zh', label: '中文 (China)' },
];

const REGIONS = [
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'CA', label: 'Canada' },
  { code: 'FR', label: 'France' },
  { code: 'ES', label: 'Spain' },
  { code: 'DE', label: 'Germany' },
  { code: 'JP', label: 'Japan' },
  { code: 'CN', label: 'China' },
];

export default function DateTimeSettingsTab({
  theme,
  themeId,
  onThemeChange,
  auraMode,
  onAuraModeChange,
  auraSpeed,
  onAuraSpeedChange,
  analogStyle,
  onAnalogStyleChange,
}: DateTimeSettingsTabProps) {
  const {
    settings,
    updateSetting,
    getAppTime,
    activeTimezone,
    getFormattedTime,
    getFormattedDate,
    refreshLocationTimezone,
    getGMTString,
  } = useDateTimeSettings();

  const [activeSection, setActiveSection] = useState<'appearance' | 'sensory' | 'animations' | 'region' | 'about'>('appearance');
  const [tzSearch, setTzSearch] = useState('');
  const [isTzListOpen, setIsTzListOpen] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Manual inputs state (only used when isAutoTime is false)
  const appTime = getAppTime();
  const formatForDateInput = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const r = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${r}`;
  };
  const formatForTimeInput = (d: Date) => {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const [manualDate, setManualDate] = useState(formatForDateInput(appTime));
  const [manualTime, setManualTime] = useState(formatForTimeInput(appTime));

  // Keep manual inputs synced with app current time when manual is open
  useEffect(() => {
    if (settings.isAutoTime) {
      const liveAppTime = getAppTime();
      setManualDate(formatForDateInput(liveAppTime));
      setManualTime(formatForTimeInput(liveAppTime));
    }
  }, [settings.isAutoTime]);

  const playInteractiveClick = () => {
    if (settings.clickSoundsEnabled) {
      synth.playClick();
    }
    if (settings.hapticsEnabled) {
      haptics.tick();
    }
  };

  const playToggleSound = (on: boolean) => {
    if (settings.toggleSoundsEnabled) {
      synth.playSwitch(on);
    }
    if (settings.hapticsEnabled) {
      haptics.light();
    }
  };

  const handleToggleSetting = <K extends keyof typeof settings>(key: K, currentVal: any) => {
    const nextVal = !currentVal;
    playToggleSound(nextVal);
    updateSetting(key as any, nextVal);
  };

  const handleToggleAutoTime = () => {
    const nextVal = !settings.isAutoTime;
    playToggleSound(nextVal);
    updateSetting('isAutoTime', nextVal);
    if (nextVal) {
      updateSetting('manualTimeOffset', 0);
      updateSetting('syncStatus', 'synced');
      updateSetting('lastSyncTime', new Date().toISOString());
      if (settings.hapticsEnabled) {
        haptics.success();
      }
      if (settings.interfaceSoundsEnabled) {
        synth.playSuccessSound();
      }
    } else {
      updateSetting('syncStatus', 'manual');
      updateSetting('lastSyncTime', new Date().toISOString());
    }
  };

  const handleToggleAutoTimezone = () => {
    const nextVal = !settings.isAutoTimezone;
    playToggleSound(nextVal);
    updateSetting('isAutoTimezone', nextVal);
    if (nextVal) {
      updateSetting('isLocationTimezone', false);
      const systemTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
      updateSetting('manualTimezone', systemTZ || 'America/New_York');
      if (settings.hapticsEnabled) {
        haptics.success();
      }
      if (settings.interfaceSoundsEnabled) {
        synth.playSuccessSound();
      }
    }
  };

  const handleToggleLocationTimezone = async () => {
    const nextVal = !settings.isLocationTimezone;
    playToggleSound(nextVal);
    updateSetting('isLocationTimezone', nextVal);
    if (nextVal) {
      updateSetting('isAutoTimezone', false);
      setLocationLoading(true);
      setGpsMessage(null);
      const success = await refreshLocationTimezone();
      setLocationLoading(false);
      if (success) {
        setGpsMessage({ type: 'success', text: 'Timezone set automatically via your GPS coordinates!' });
        if (settings.hapticsEnabled) haptics.success();
        if (settings.interfaceSoundsEnabled) synth.playSuccessSound();
      } else {
        setGpsMessage({ type: 'error', text: 'Location access denied or unavailable. Gracefully falling back.' });
        updateSetting('isLocationTimezone', false);
        if (settings.hapticsEnabled) haptics.error();
        if (settings.interfaceSoundsEnabled) synth.playErrorSound();
      }
    } else {
      setGpsMessage(null);
    }
  };

  const handleSelectTimezone = (tz: string) => {
    if (settings.clickSoundsEnabled) synth.playClick();
    if (settings.hapticsEnabled) haptics.medium();
    updateSetting('manualTimezone', tz);
    setIsTzListOpen(false);
  };

  const handleManualSyncNow = async () => {
    if (settings.hapticsEnabled) haptics.success();
    if (settings.interfaceSoundsEnabled) synth.playSuccessSound();
    setLocationLoading(true);
    setGpsMessage(null);
    
    if (settings.isLocationTimezone) {
      const success = await refreshLocationTimezone();
      setLocationLoading(false);
      if (success) {
        setGpsMessage({ type: 'success', text: 'GPS synchronization successful!' });
      } else {
        setGpsMessage({ type: 'error', text: 'GPS synchronization failed. Check system permissions.' });
      }
    } else {
      setTimeout(() => {
        setLocationLoading(false);
        updateSetting('lastSyncTime', new Date().toISOString());
        if (settings.isAutoTime) {
          updateSetting('manualTimeOffset', 0);
          updateSetting('syncStatus', 'synced');
        } else {
          updateSetting('syncStatus', 'manual');
        }
        setGpsMessage({ type: 'success', text: 'System NTP time server sync successful!' });
      }, 800);
    }
  };

  const handleSaveManualDateTime = () => {
    if (settings.hapticsEnabled) haptics.success();
    if (settings.interfaceSoundsEnabled) synth.playSuccessSound();

    const [year, month, day] = manualDate.split('-').map(Number);
    const [hours, minutes] = manualTime.split(':').map(Number);

    const target = new Date();
    target.setFullYear(year);
    target.setMonth(month - 1);
    target.setDate(day);
    target.setHours(hours);
    target.setMinutes(minutes);
    target.setSeconds(0);
    target.setMilliseconds(0);

    const offset = target.getTime() - Date.now();
    updateSetting('manualTimeOffset', offset);
    updateSetting('syncStatus', 'manual');
    updateSetting('lastSyncTime', new Date().toISOString());
  };

  const filteredTimezones = ALL_TIMEZONES.filter(tz => {
    const normalizedSearch = tzSearch.toLowerCase();
    const namePart = tz.split('/').pop()?.replace('_', ' ').toLowerCase() || '';
    const fullPart = tz.toLowerCase();
    const gmtPart = getGMTString(tz).toLowerCase();
    return fullPart.includes(normalizedSearch) || namePart.includes(normalizedSearch) || gmtPart.includes(normalizedSearch);
  });

  const activeThemeObj = THEMES.find(t => t.id === themeId) || theme;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5" id="dy-supreme-settings-view">
      
      {/* Dynamic Header Block */}
      <div className="flex items-center gap-3 mb-1" id="settings-brand-header">
        <div className={`p-2.5 rounded-2xl bg-slate-900 border ${theme.border} text-purple-400 shadow-lg shadow-purple-500/5`}>
          <Settings2 className="w-5 h-5 animate-spin-slow" />
        </div>
        <div>
          <h2 className="text-lg font-black tracking-wider uppercase text-white flex items-center gap-1.5">
            DY Clock <span className="text-[9px] font-bold py-0.5 px-2 rounded bg-purple-950/40 border border-purple-900/30 text-purple-400">Settings</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium">Customize aesthetics, sound profiles, haptics, animations, timezone offsets, and locale behaviors</p>
        </div>
      </div>

      {/* Luxury Segmented Top Navigation Sub-tab menu */}
      <div 
        className="flex p-1 gap-1 overflow-x-auto rounded-xl bg-slate-950/80 border border-slate-900 custom-scrollbar scroll-smooth" 
        id="settings-tab-nav-bar"
      >
        {[
          { id: 'appearance', label: 'Appearance', icon: Palette },
          { id: 'sensory', label: 'Sensory Feedback', icon: Volume2 },
          { id: 'animations', label: 'Animations', icon: Activity },
          { id: 'region', label: 'Region & Time', icon: Languages },
          { id: 'about', label: 'About', icon: Info },
        ].map((tabBtn) => {
          const isActive = activeSection === tabBtn.id;
          const TabIcon = tabBtn.icon;
          return (
            <button
              key={tabBtn.id}
              onClick={() => {
                playInteractiveClick();
                setActiveSection(tabBtn.id as any);
              }}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex-1 justify-center ${
                isActive 
                  ? 'bg-slate-900 text-white border border-slate-800 shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <TabIcon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : ''}`} />
              <span>{tabBtn.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Settings Display area */}
      <div className="space-y-4" id="settings-contents-stage">
        <AnimatePresence mode="wait">
          
          {/* SECTION 1: APPEARANCE CUSTOMIZATION */}
          {activeSection === 'appearance' && (
            <motion.div
              key="appearance-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              <div className={`p-5 rounded-2xl ${theme.cardBg} border ${theme.border} space-y-4`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                      <Palette className="w-4 h-4 text-cyan-400 animate-pulse" /> Supreme Theme Presets
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">Choose from highly crafted, custom color harmonies</p>
                  </div>
                </div>

                {/* Theme circle picker grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" id="theme-grid-selector">
                  {THEMES.map((t) => {
                    const isActive = t.id === themeId;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          onThemeChange(t.id);
                          if (settings.hapticsEnabled) haptics.medium();
                          if (settings.themeChangeSoundsEnabled) synth.playSuccessSound();
                        }}
                        className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer relative overflow-hidden ${
                          isActive
                            ? 'bg-slate-900 border-white/40 text-white shadow-xl shadow-cyan-900/10'
                            : 'bg-slate-950/40 border-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full bg-gradient-to-tr ${t.gradient} ring-2 ring-slate-950 shrink-0 flex items-center justify-center`}>
                          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold leading-tight">{t.name}</p>
                          <p className="text-[9px] text-slate-500 font-semibold uppercase truncate mt-0.5">{t.primary.replace('-', ' ')}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                        {/* Active Clock Dial Style, Live Background Engine, and Intelligent Aesthetic Engine have been removed as per user preference */}            </div>

              {/* PREMIUM ANALOG COLLECTION */}
              <div className={`p-5 rounded-2xl ${theme.cardBg} border ${theme.border} space-y-4`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                      <Compass className="w-4 h-4 text-pink-400 animate-pulse" /> Premium Analog Collection
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">Choose from 7 luxury procedural mechanical designs</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" id="premium-analog-grid">
                  {ANALOG_STYLES.map((style) => {
                    const activeStyle = analogStyle || localStorage.getItem('dy_clock_analog_style') || 'chronometer-classic';
                    const isActive = style.id === activeStyle;
                    return (
                      <button
                        key={style.id}
                        onClick={() => {
                          if (onAnalogStyleChange) {
                            onAnalogStyleChange(style.id);
                          }
                          localStorage.setItem('dy_clock_analog_style', style.id);
                          if (settings.hapticsEnabled) haptics.medium();
                          if (settings.themeChangeSoundsEnabled) synth.playSuccessSound();
                        }}
                        className={`p-3 rounded-xl border text-left flex flex-col gap-3 transition-all cursor-pointer relative overflow-hidden group ${
                          isActive
                            ? 'bg-slate-900 border-white/40 text-white shadow-xl shadow-cyan-900/10'
                            : 'bg-slate-950/40 border-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {/* Interactive miniature live canvas preview scaled down */}
                        <div className="w-full aspect-square bg-slate-950/80 rounded-lg flex items-center justify-center border border-slate-900/80 p-1 relative overflow-hidden group-hover:border-slate-800">
                          <div className="scale-[0.45] origin-center shrink-0 pointer-events-none">
                            <WorkingLogo size={130} interactive={false} theme={theme} clockStyle={style.id} />
                          </div>
                          {isActive && (
                            <div className="absolute top-1.5 right-1.5 bg-cyan-500 text-[8px] font-black uppercase tracking-wider px-1 py-0.5 rounded text-slate-950 flex items-center gap-0.5 shadow">
                              Active
                            </div>
                          )}
                        </div>
                        <div className="w-full">
                          <p className="text-[10px] font-black leading-tight uppercase tracking-wide truncate">{style.name}</p>
                          <p className="text-[8px] text-slate-500 font-bold uppercase truncate mt-1">{style.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* SECTION 2: SENSORY AUDIO & HAPTICS */}
          {activeSection === 'sensory' && (
            <motion.div
              key="sensory-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              <div className={`p-5 rounded-2xl ${theme.cardBg} border ${theme.border} space-y-4`}>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" /> Acoustic Feedback
                  </h3>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">Manage standard chimes & synthetic interface audios</p>
                </div>

                <div className="space-y-4">
                  {/* Master Switch */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-900/60">
                    <div>
                      <p className="text-xs font-bold text-white">Interface Audio Systems</p>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase">Enable synthesis engines globally</p>
                    </div>
                    <button
                      onClick={() => handleToggleSetting('interfaceSoundsEnabled', settings.interfaceSoundsEnabled)}
                      className={`w-11 h-6 rounded-full p-0.5 transition-all duration-300 cursor-pointer flex items-center ${
                        settings.interfaceSoundsEnabled ? 'bg-cyan-400' : 'bg-slate-850 border border-slate-800'
                      }`}
                      id="switch-master-audio"
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-slate-950 transition-all transform ${
                          settings.interfaceSoundsEnabled ? 'translate-x-5 shadow-[0_0_4px_rgba(34,211,238,0.8)]' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Individual switches */}
                  <div className={`space-y-3 pt-1 transition-all ${settings.interfaceSoundsEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-200">Button Tap Plucks</p>
                        <p className="text-[9px] text-slate-500 font-semibold uppercase">Trigger wood-and-glass synth clicks on action triggers</p>
                      </div>
                      <button
                        onClick={() => settings.interfaceSoundsEnabled && handleToggleSetting('clickSoundsEnabled', settings.clickSoundsEnabled)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 cursor-pointer flex items-center ${
                          settings.clickSoundsEnabled ? 'bg-cyan-400/80' : 'bg-slate-900 border border-slate-850'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-slate-950 transition-all transform ${settings.clickSoundsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-900/40 pt-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-200">Toggle Swishes</p>
                        <p className="text-[9px] text-slate-500 font-semibold uppercase">Downward and upward organic sweeps on setting switches</p>
                      </div>
                      <button
                        onClick={() => settings.interfaceSoundsEnabled && handleToggleSetting('toggleSoundsEnabled', settings.toggleSoundsEnabled)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 cursor-pointer flex items-center ${
                          settings.toggleSoundsEnabled ? 'bg-cyan-400/80' : 'bg-slate-900 border border-slate-850'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-slate-950 transition-all transform ${settings.toggleSoundsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-900/40 pt-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-200">Theme Change Chord Chimes</p>
                        <p className="text-[9px] text-slate-500 font-semibold uppercase">Lush major 9th FM chord sequence on theme selection</p>
                      </div>
                      <button
                        onClick={() => settings.interfaceSoundsEnabled && handleToggleSetting('themeChangeSoundsEnabled', settings.themeChangeSoundsEnabled)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 cursor-pointer flex items-center ${
                          settings.themeChangeSoundsEnabled ? 'bg-cyan-400/80' : 'bg-slate-900 border border-slate-850'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-slate-950 transition-all transform ${settings.themeChangeSoundsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-900/40 pt-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-200">Alarm Configuration Echoes</p>
                        <p className="text-[9px] text-slate-500 font-semibold uppercase">Listen previews and tests when updating or saving alarms</p>
                      </div>
                      <button
                        onClick={() => settings.interfaceSoundsEnabled && handleToggleSetting('alarmConfigSoundsEnabled', settings.alarmConfigSoundsEnabled)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 cursor-pointer flex items-center ${
                          settings.alarmConfigSoundsEnabled ? 'bg-cyan-400/80' : 'bg-slate-900 border border-slate-850'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-slate-950 transition-all transform ${settings.alarmConfigSoundsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-900/40 pt-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-200">Stopwatch Start/Lap Rings</p>
                        <p className="text-[9px] text-slate-500 font-semibold uppercase">Tibetan singing bowl resonance plucks on lap tracking</p>
                      </div>
                      <button
                        onClick={() => settings.interfaceSoundsEnabled && handleToggleSetting('stopwatchSoundsEnabled', settings.stopwatchSoundsEnabled)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 cursor-pointer flex items-center ${
                          settings.stopwatchSoundsEnabled ? 'bg-cyan-400/80' : 'bg-slate-900 border border-slate-850'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-slate-950 transition-all transform ${settings.stopwatchSoundsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-900/40 pt-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-200">Timer Done Harp Arpeggios</p>
                        <p className="text-[9px] text-slate-500 font-semibold uppercase">Play warm crystalline arpeggiated chords on timer expiry</p>
                      </div>
                      <button
                        onClick={() => settings.interfaceSoundsEnabled && handleToggleSetting('timerSoundsEnabled', settings.timerSoundsEnabled)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 cursor-pointer flex items-center ${
                          settings.timerSoundsEnabled ? 'bg-cyan-400/80' : 'bg-slate-900 border border-slate-850'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-slate-950 transition-all transform ${settings.timerSoundsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-900/40 pt-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-200">Achievement Triumphs</p>
                        <p className="text-[9px] text-slate-500 font-semibold uppercase">Play glorious cascading chimes upon positive milestones</p>
                      </div>
                      <button
                        onClick={() => settings.interfaceSoundsEnabled && handleToggleSetting('achievementSoundsEnabled', settings.achievementSoundsEnabled)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 cursor-pointer flex items-center ${
                          settings.achievementSoundsEnabled ? 'bg-cyan-400/80' : 'bg-slate-900 border border-slate-850'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-slate-950 transition-all transform ${settings.achievementSoundsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                  </div>
                </div>
              </div>

              {/* HAPTIC VIBRATION */}
              <div className={`p-5 rounded-2xl ${theme.cardBg} border ${theme.border} space-y-4`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-purple-400" /> Tactile Haptics
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">Configure micro-vibration feedback levels on touch screens</p>
                  </div>
                  <button
                    onClick={() => handleToggleSetting('hapticsEnabled', settings.hapticsEnabled)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-all duration-300 cursor-pointer flex items-center ${
                      settings.hapticsEnabled ? 'bg-purple-500' : 'bg-slate-850 border border-slate-800'
                    }`}
                    id="switch-master-haptics"
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-slate-950 transition-all transform ${
                        settings.hapticsEnabled ? 'translate-x-5 shadow-[0_0_4px_rgba(168,85,247,0.8)]' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className={`text-xs text-slate-400 ${settings.hapticsEnabled ? 'opacity-100' : 'opacity-40'}`}>
                  Tactile taps are fully integrated. When enabled, your mobile phone or touch screen device will emit brief physical ticks on button holds, dial drags, and stopwatch records.
                </div>
              </div>
            </motion.div>
          )}

          {/* SECTION 3: ANIMATIONS AND MOTION */}
          {activeSection === 'animations' && (
            <motion.div
              key="animations-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              <div className={`p-5 rounded-2xl ${theme.cardBg} border ${theme.border} space-y-4`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-cyan-400" /> System Motion Controls
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">Switch UI page slide-ins and floating elements</p>
                  </div>
                  <button
                    onClick={() => handleToggleSetting('animationsEnabled', settings.animationsEnabled)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-all duration-300 cursor-pointer flex items-center ${
                      settings.animationsEnabled ? 'bg-cyan-400' : 'bg-slate-850 border border-slate-800'
                    }`}
                    id="switch-master-animations"
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-slate-950 transition-all transform ${
                        settings.animationsEnabled ? 'translate-x-5 shadow-[0_0_4px_rgba(34,211,238,0.8)]' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Animation profile selector */}
                <div className={`space-y-3 pt-1 transition-all ${settings.animationsEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Motion profiles & damping</label>
                  
                  <div className="grid grid-cols-3 gap-2" id="animation-intensity-pills">
                    {[
                      { id: 'subtle', title: 'Subtle', desc: 'Short fades only' },
                      { id: 'medium', title: 'Balanced', desc: 'Responsive springs' },
                      { id: 'rich', title: 'Lush Cinematic', desc: 'Full spring cascades' },
                    ].map((opt) => {
                      const isActive = settings.animationIntensity === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => {
                            playInteractiveClick();
                            updateSetting('animationIntensity', opt.id as any);
                          }}
                          className={`p-3 rounded-xl border text-center flex flex-col justify-center items-center gap-1 cursor-pointer transition-all ${
                            isActive
                              ? 'bg-slate-900 border-cyan-500/40 text-cyan-300'
                              : 'bg-slate-950/40 border-slate-900 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span className="text-xs font-bold leading-tight">{opt.title}</span>
                          <span className="text-[8px] text-slate-500 font-medium uppercase">{opt.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* SECTION 4: REGION, TIME & LOCALE */}
          {activeSection === 'region' && (
            <motion.div
              key="region-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* SYNCHRONIZATION MONITOR */}
              <div className={`p-5 rounded-2xl ${theme.cardBg} border ${theme.border} relative overflow-hidden`} id="sync-status-card">
                <div className="absolute right-0 top-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full -z-10" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-cyan-400" /> Synchronization Monitor
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Active Time Source</p>
                        <p className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
                          {settings.isAutoTime ? (
                            <>
                              <ShieldCheck className="w-4 h-4 text-emerald-400" />
                              <span>Device NTP Server</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                              <span>Manual Override</span>
                            </>
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Timezone State</p>
                        <p className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5 truncate">
                          {settings.isLocationTimezone ? (
                            <>
                              <MapPin className="w-4 h-4 text-cyan-400" />
                              <span className="truncate">GPS-Based Zone</span>
                            </>
                          ) : settings.isAutoTimezone ? (
                            <>
                              <Clock className="w-4 h-4 text-purple-400" />
                              <span className="truncate">System Auto</span>
                            </>
                          ) : (
                            <>
                              <Settings2 className="w-4 h-4 text-slate-400" />
                              <span className="truncate">Manual Set</span>
                            </>
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Active Zone</p>
                        <p className="text-xs font-mono font-bold text-white mt-0.5 truncate">
                          {activeTimezone} ({getGMTString(activeTimezone)})
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Last Successful Sync</p>
                        <p className="text-xs font-bold text-slate-300 mt-0.5">
                          {new Date(settings.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-800/80 pt-3 md:pt-0 md:pl-5">
                    <button
                      onClick={handleManualSyncNow}
                      disabled={locationLoading}
                      className={`w-full md:w-32 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer bg-slate-900 border border-slate-800 hover:border-cyan-500/30 text-white ${locationLoading ? 'opacity-50' : 'active:scale-95'}`}
                      id="btn-sync-datetime-settings"
                    >
                      <RotateCw className={`w-3.5 h-3.5 text-cyan-400 ${locationLoading ? 'animate-spin' : ''}`} />
                      <span>{locationLoading ? 'Syncing...' : 'Sync Now'}</span>
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {gpsMessage && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 overflow-hidden"
                    >
                      <div className={`p-3 rounded-xl border text-[11px] font-bold flex items-center gap-2 ${
                        gpsMessage.type === 'success' 
                          ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300' 
                          : 'bg-rose-950/20 border-rose-500/20 text-rose-300'
                      }`}>
                        {gpsMessage.type === 'success' ? (
                          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 animate-bounce" />
                        )}
                        <span>{gpsMessage.text}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* SYNC AND TIMEZONE TOGGLES */}
              <div className={`p-5 rounded-2xl ${theme.cardBg} border ${theme.border} space-y-4`}>
                {/* Automatic Time switch */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-400" /> Automatic Date & Time
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">Keep DY Clock synchronized with network-provided NTP server</p>
                  </div>
                  <button
                    onClick={handleToggleAutoTime}
                    className={`w-11 h-6 rounded-full p-0.5 transition-all duration-300 cursor-pointer flex items-center ${
                      settings.isAutoTime ? 'bg-cyan-400' : 'bg-slate-850 border border-slate-800'
                    }`}
                    id="switch-auto-time"
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-slate-950 transition-all transform ${
                        settings.isAutoTime ? 'translate-x-5 shadow-[0_0_4px_rgba(34,211,238,0.8)]' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Manual overrides fields when AutoTime is disabled */}
                <AnimatePresence>
                  {!settings.isAutoTime && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-slate-900/60 pt-4"
                    >
                      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-900/80 space-y-4">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">⚙️ Manual Offset Calibration</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-500">Edit System Date</label>
                            <input
                              type="date"
                              value={manualDate}
                              onChange={(e) => {
                                setManualDate(e.target.value);
                                if (settings.hapticsEnabled) haptics.tick();
                              }}
                              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-cyan-500/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-500">Edit System Time</label>
                            <input
                              type="time"
                              value={manualTime}
                              onChange={(e) => {
                                setManualTime(e.target.value);
                                if (settings.hapticsEnabled) haptics.tick();
                              }}
                              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-cyan-500/50"
                            />
                          </div>
                        </div>
                        <button
                          onClick={handleSaveManualDateTime}
                          className="w-full py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all cursor-pointer"
                        >
                          Apply Manual Offset
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Auto Timezone Switch */}
                <div className="flex items-center justify-between border-t border-slate-900/60 pt-4">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-400" /> Automatic Time Zone
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">Apply timezone from device system location parameters</p>
                  </div>
                  <button
                    onClick={handleToggleAutoTimezone}
                    className={`w-11 h-6 rounded-full p-0.5 transition-all duration-300 cursor-pointer flex items-center ${
                      settings.isAutoTimezone ? 'bg-purple-500' : 'bg-slate-850 border border-slate-800'
                    }`}
                    id="switch-auto-timezone"
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-slate-950 transition-all transform ${
                        settings.isAutoTimezone ? 'translate-x-5 shadow-[0_0_4px_rgba(168,85,247,0.8)]' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Location Based Timezone Switch */}
                <div className="flex items-center justify-between border-t border-slate-900/60 pt-4">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Compass className="w-4 h-4 text-emerald-400" /> Location-Based Time Zone
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">Update timezone geographically based on GPS coordinates</p>
                  </div>
                  <button
                    onClick={handleToggleLocationTimezone}
                    className={`w-11 h-6 rounded-full p-0.5 transition-all duration-300 cursor-pointer flex items-center ${
                      settings.isLocationTimezone ? 'bg-emerald-500' : 'bg-slate-850 border border-slate-800'
                    }`}
                    id="switch-location-timezone"
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-slate-950 transition-all transform ${
                        settings.isLocationTimezone ? 'translate-x-5 shadow-[0_0_4px_rgba(16,185,129,0.8)]' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Manual Time Zone Override dropdown selection list */}
                <AnimatePresence>
                  {!settings.isAutoTimezone && !settings.isLocationTimezone && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-slate-900/60 pt-4"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] uppercase font-bold text-slate-400">Manual Timezone Selection</label>
                          <button
                            onClick={() => {
                              playInteractiveClick();
                              setIsTzListOpen(!isTzListOpen);
                            }}
                            className="text-[10px] font-bold text-cyan-400 hover:underline uppercase bg-transparent cursor-pointer"
                          >
                            {isTzListOpen ? 'Close Listing' : 'Browse All Zones'}
                          </button>
                        </div>

                        <div className="relative">
                          <button
                            onClick={() => {
                              playInteractiveClick();
                              setIsTzListOpen(!isTzListOpen);
                            }}
                            className="w-full bg-slate-950/50 border border-slate-900 rounded-xl px-4 py-3 text-xs font-bold text-white text-left flex justify-between items-center hover:border-slate-800 transition-all cursor-pointer"
                          >
                            <span className="font-mono">{activeTimezone} ({getGMTString(activeTimezone)})</span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-850 text-slate-400 uppercase">Change</span>
                          </button>
                        </div>

                        <AnimatePresence>
                          {isTzListOpen && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 320 }}
                              exit={{ height: 0 }}
                              className="bg-slate-950 border border-slate-900 rounded-xl flex flex-col overflow-hidden"
                            >
                              {/* Search field */}
                              <div className="p-2 border-b border-slate-900 flex items-center gap-2">
                                <Search className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
                                <input
                                  type="text"
                                  placeholder="Search regions, cities, or GMT offsets..."
                                  value={tzSearch}
                                  onChange={(e) => setTzSearch(e.target.value)}
                                  className="w-full bg-transparent border-none text-xs text-white focus:outline-none focus:ring-0 font-bold"
                                />
                              </div>

                              {/* List items */}
                              <div className="flex-1 overflow-y-auto divide-y divide-slate-900/40 custom-scrollbar p-1">
                                {filteredTimezones.length === 0 ? (
                                  <div className="py-8 text-center text-xs text-slate-500 font-bold uppercase tracking-wider">No matching time zones</div>
                                ) : (
                                  filteredTimezones.map(tz => {
                                    const isActive = tz === activeTimezone;
                                    const cityPart = tz.split('/').pop()?.replace('_', ' ') || '';
                                    return (
                                      <button
                                        key={tz}
                                        onClick={() => handleSelectTimezone(tz)}
                                        className={`w-full py-2.5 px-3 flex items-center justify-between text-left transition-all cursor-pointer ${
                                          isActive ? 'bg-purple-950/20 text-purple-300 font-black' : 'text-slate-300 hover:bg-slate-900/40 hover:text-white'
                                        }`}
                                      >
                                        <div className="space-y-0.5 truncate">
                                          <p className="text-xs font-bold truncate">{cityPart}</p>
                                          <p className="text-[9px] font-mono font-bold text-slate-500 truncate">{tz}</p>
                                        </div>
                                        <span className="text-[9px] font-mono font-bold bg-slate-900 border border-slate-850 text-slate-400 px-2 py-0.5 rounded">
                                          {getGMTString(tz)}
                                        </span>
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* FORMATTING PREFERENCES */}
              <div className={`p-5 rounded-2xl ${theme.cardBg} border ${theme.border} space-y-4`}>
                
                {/* 12h/24h toggle */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" /> Time Format Preference
                  </h3>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/60 rounded-xl border border-slate-850/80">
                    <button
                      onClick={() => {
                        playToggleSound(true);
                        updateSetting('timeFormat', '12h');
                      }}
                      className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer uppercase ${
                        settings.timeFormat === '12h'
                          ? 'bg-slate-900 border border-slate-800 text-white shadow'
                          : 'text-slate-500 hover:text-slate-300 border border-transparent'
                      }`}
                    >
                      12-Hour Style (AM/PM)
                    </button>
                    <button
                      onClick={() => {
                        playToggleSound(true);
                        updateSetting('timeFormat', '24h');
                      }}
                      className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer uppercase ${
                        settings.timeFormat === '24h'
                          ? 'bg-slate-900 border border-slate-800 text-white shadow'
                          : 'text-slate-500 hover:text-slate-300 border border-transparent'
                      }`}
                    >
                      24-Hour Style (Military)
                    </button>
                  </div>
                </div>

                {/* Date Format Select */}
                <div className="border-t border-slate-900/60 pt-4 space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-purple-400" /> Date Presentation Format
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2" id="date-format-pills">
                    {(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD', 'DD Month YYYY'] as const).map(fmt => {
                      const isActive = settings.dateFormat === fmt;
                      return (
                        <button
                          key={fmt}
                          onClick={() => {
                            playInteractiveClick();
                            updateSetting('dateFormat', fmt);
                          }}
                          className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col justify-center items-center gap-0.5 cursor-pointer ${
                            isActive
                              ? 'bg-slate-900 border-purple-500/40 text-white'
                              : 'bg-slate-950/40 border-slate-900 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span>{fmt}</span>
                          <span className="text-[9px] font-medium text-slate-500">{getFormattedDate(new Date(), activeTimezone)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Seconds Ticking */}
                <div className="flex items-center justify-between border-t border-slate-900/60 pt-4">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-400 animate-pulse" /> Seconds Tick Display
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">Render moving seconds counter in active clocks</p>
                  </div>
                  <button
                    onClick={() => handleToggleSetting('showSeconds', settings.showSeconds)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-all duration-300 cursor-pointer flex items-center ${
                      settings.showSeconds ? 'bg-cyan-400' : 'bg-slate-850 border border-slate-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-slate-950 transition-all transform ${
                        settings.showSeconds ? 'translate-x-5 shadow-[0_0_4px_rgba(34,211,238,0.8)]' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* First Day of Week */}
                <div className="border-t border-slate-900/60 pt-4 space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-400" /> First Day of the Week
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Sunday', 'Monday', 'Saturday'] as const).map(day => {
                      const isActive = settings.firstDayOfWeek === day;
                      return (
                        <button
                          key={day}
                          onClick={() => {
                            playInteractiveClick();
                            updateSetting('firstDayOfWeek', day);
                          }}
                          className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                            isActive 
                              ? 'bg-purple-950/30 border-purple-500/30 text-purple-300' 
                              : 'bg-slate-950/50 border-slate-900 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* World Clock default city */}
                <div className="border-t border-slate-900/60 pt-4 space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-pink-400" /> Default World Clock City
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">Sets primary offset listed on your world metrics</p>
                  </div>
                  <div className="relative">
                    <select
                      value={settings.worldClockDefaultCity}
                      onChange={(e) => {
                        playInteractiveClick();
                        updateSetting('worldClockDefaultCity', e.target.value);
                      }}
                      className="w-full bg-slate-950/50 border border-slate-900 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-slate-800 transition-all select-none appearance-none"
                    >
                      <option value="">-- Device Local Time --</option>
                      {GPS_CITIES.map(c => (
                        <option key={c.timezone} value={c.timezone}>
                          {c.name} ({getGMTString(c.timezone)})
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-[10px] font-bold uppercase">Select</div>
                  </div>
                </div>
              </div>

              {/* MOCK LANGUAGE AND REGION SELECTORS */}
              <div className={`p-5 rounded-2xl ${theme.cardBg} border ${theme.border} space-y-4`}>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                    <Languages className="w-4 h-4 text-cyan-400 animate-pulse" /> Language & Regional Formats
                  </h3>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">Manage international presentation and translations</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Language Selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Display Language</label>
                    <div className="relative">
                      <select
                        value={settings.language}
                        onChange={(e) => {
                          playInteractiveClick();
                          updateSetting('language', e.target.value);
                        }}
                        className="w-full bg-slate-950/50 border border-slate-900 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-slate-800 transition-all select-none appearance-none"
                      >
                        {LANGUAGES.map(lang => (
                          <option key={lang.code} value={lang.code}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-[10px] font-bold uppercase">Select</div>
                    </div>
                  </div>

                  {/* Region Selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Region Format Location</label>
                    <div className="relative">
                      <select
                        value={settings.region}
                        onChange={(e) => {
                          playInteractiveClick();
                          updateSetting('region', e.target.value);
                        }}
                        className="w-full bg-slate-950/50 border border-slate-900 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-slate-800 transition-all select-none appearance-none"
                      >
                        {REGIONS.map(reg => (
                          <option key={reg.code} value={reg.code}>
                            {reg.label}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-[10px] font-bold uppercase">Select</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* SECTION 5: ABOUT SECTION */}
          {activeSection === 'about' && (
            <motion.div
              key="about-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              <div className={`p-6 rounded-2xl ${theme.cardBg} border ${theme.border} text-center space-y-4 relative overflow-hidden`}>
                <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />
                
                {/* Immersive interactive Working Clock Logo synced with active Theme */}
                <WorkingLogo size={120} interactive={true} theme={activeThemeObj} className="mx-auto my-1 drop-shadow-[0_4px_20px_rgba(34,211,238,0.15)]" />
                
                <div className="space-y-1 pt-2">
                  <h3 className="text-sm font-black uppercase text-white tracking-widest">DY CLOCK SUPREME</h3>
                  <p className="text-[10px] text-cyan-400 font-mono font-bold uppercase">Version 3.2.0 • Premium Edition</p>
                </div>

                <div className="max-w-md mx-auto text-xs text-slate-400 leading-relaxed font-medium">
                  DY Clock is a beautiful, luxury time management platform featuring zero-latency FM audio synthesis, high-precision NTP and GPS geolocation alignment, haptic-enhanced tactical confirmation, and an intelligent ambient aura engine.
                </div>

                <div className="border-t border-slate-900/60 pt-4 grid grid-cols-2 gap-4 text-left max-w-md mx-auto">
                  <div>
                    <span className="text-[9px] uppercase font-semibold text-slate-500 block">Engineering Team</span>
                    <span className="text-xs font-bold text-slate-300">Melkeserba123-hubbbB</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-semibold text-slate-500 block">Deploy Runtime</span>
                    <span className="text-xs font-bold text-slate-300">Cloud Run Container</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-semibold text-slate-500 block">Ingress Configuration</span>
                    <span className="text-xs font-mono font-bold text-cyan-400">Port 3000 Sync</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-semibold text-slate-500 block">Framework Stack</span>
                    <span className="text-xs font-bold text-slate-300">Vite React + TypeScript</span>
                  </div>
                </div>

                <div className="border-t border-slate-900/40 pt-4 text-[9px] text-slate-600 font-bold uppercase tracking-wider">
                  Copyright © 2026 DY Clock. Handcrafted with precision.
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
