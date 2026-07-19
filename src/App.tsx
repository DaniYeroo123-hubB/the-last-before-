import React, { useState, useEffect, useRef } from 'react';
import { Alarm, WorldClock, Theme, ThemeId } from './types';
import { THEMES } from './utils/themes';
import WorkingLogo from './components/WorkingLogo';
import AlarmTab from './components/AlarmTab';
import WorldClockTab from './components/WorldClockTab';
import StopwatchTab from './components/StopwatchTab';
import TimerTab from './components/TimerTab';
import BedsideMode from './components/BedsideMode';
import AlarmTriggerModal from './components/AlarmTriggerModal';
import SlidingDigit from './components/SlidingDigit';
import AboutTab from './components/AboutTab';
import DateTimeSettingsTab from './components/DateTimeSettingsTab';
import { useDateTimeSettings } from './utils/settingsContext';
import { Bell, Timer as StopwatchIcon, Hourglass, Settings, Moon, Sun, ShieldAlert, Sparkles, Settings2, Activity, Clock as ClockIcon, CloudRain, Snowflake, Cloud, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import haptics from './utils/haptics';
import synth from './utils/synth';

const DEFAULT_ALARMS: Alarm[] = [
  {
    id: 'alarm-1',
    time: '07:00',
    label: 'Morning Focus & Meditation',
    enabled: true,
    repeatDays: [1, 2, 3, 4, 5], // Mon to Fri
  },
  {
    id: 'alarm-2',
    time: '08:30',
    label: 'Daily Standup Call',
    enabled: false,
    repeatDays: [1, 2, 3, 4, 5],
  }
];

const DEFAULT_CLOCKS: WorldClock[] = [
  { id: 'wc-1', cityName: 'London', timezone: 'Europe/London' },
  { id: 'wc-2', cityName: 'New York', timezone: 'America/New_York' },
  { id: 'wc-3', cityName: 'Tokyo', timezone: 'Asia/Tokyo' },
];

export default function App() {
  const {
    settings,
    getAppTime,
    getFormattedTime,
    getFormattedDate,
    activeTimezone,
    getGMTString,
    updateSetting,
  } = useDateTimeSettings();

  const [activeTab, setActiveTab] = useState<'home' | 'alarm' | 'clock' | 'stopwatch' | 'timer' | 'about' | 'settings'>('home');
  const [clockStyle, setClockStyle] = useState<'digital' | 'minimal-word' | 'binary' | 'futuristic'>(() => {
    const stored = localStorage.getItem('dy_clock_style');
    if (stored && ['digital', 'minimal-word', 'binary', 'futuristic'].includes(stored)) {
      return stored as any;
    }
    return 'digital';
  });
  const [themeId, setThemeId] = useState<ThemeId>('neon-aura');
  const [analogStyle, setAnalogStyle] = useState<string>(() => {
    return localStorage.getItem('dy_clock_analog_style') || 'celestial-orbit';
  });
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [worldClocks, setWorldClocks] = useState<WorldClock[]>([]);
  
  // Neon Aura Background Engine Settings
  const [auraMode, setAuraMode] = useState<'static' | 'continuous' | 'time-of-day'>('continuous');
  const [auraSpeed, setAuraSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');

  // Interface sounds & haptics state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  // --- New Premium Features State ---
  const [notification, setNotification] = useState<{ message: string; desc: string; id: number } | null>(null);

  const triggerNotification = (message: string, desc: string) => {
    const id = Date.now();
    setNotification({ message, desc, id });
    synth.playSuccessSound();
    haptics.success();
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Real-time states
  const [currentTime, setCurrentTime] = useState(getAppTime());
  const activeTZTime = (() => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: activeTimezone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
      });
      const parts = formatter.formatToParts(currentTime);
      const year = parseInt(parts.find(p => p.type === 'year')?.value || '1970', 10);
      const month = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10) - 1;
      const day = parseInt(parts.find(p => p.type === 'day')?.value || '1', 10);
      const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
      const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
      const second = parseInt(parts.find(p => p.type === 'second')?.value || '0', 10);
      
      const d = new Date(year, month, day, hour, minute, second);
      if (isNaN(d.getTime())) {
        return currentTime;
      }
      return d;
    } catch (e) {
      return currentTime;
    }
  })();
  const activeTZTimeMs = isNaN(activeTZTime.getTime()) ? currentTime.getTime() : activeTZTime.getTime();
  const [triggeredAlarm, setTriggeredAlarm] = useState<Alarm | null>(null);
  const [showBedside, setShowBedside] = useState(false);
  const lastTriggeredMinute = useRef<string>(''); // Format: "HH:MM-YYYYMMDD" to prevent multi-triggers in the same minute
  const bedsideEnterTime = useRef<number>(0);

  const currentTheme = THEMES.find((t) => t.id === themeId) || THEMES[0];

  const handleClockStyleChange = (style: 'digital' | 'minimal-word' | 'binary' | 'futuristic') => {
    setClockStyle(style);
    localStorage.setItem('dy_clock_style', style);
  };

  const handleTabChange = (tab: 'home' | 'alarm' | 'clock' | 'stopwatch' | 'timer' | 'about' | 'settings') => {
    haptics.light();
    synth.playNavigation();
    setActiveTab(tab);
  };

  // 1. Initial State Loading from LocalStorage
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('dy_theme_id') as ThemeId;
      if (storedTheme && THEMES.some(t => t.id === storedTheme)) {
        setThemeId(storedTheme);
      }

      const storedAuraMode = localStorage.getItem('ambient_aura_mode') as 'static' | 'continuous' | 'time-of-day';
      if (storedAuraMode && ['static', 'continuous', 'time-of-day'].includes(storedAuraMode)) {
        setAuraMode(storedAuraMode);
      }

      const storedAuraSpeed = localStorage.getItem('ambient_aura_speed') as 'slow' | 'medium' | 'fast';
      if (storedAuraSpeed && ['slow', 'medium', 'fast'].includes(storedAuraSpeed)) {
        setAuraSpeed(storedAuraSpeed);
      }

      const storedSound = localStorage.getItem('dy_interface_sounds_enabled');
      if (storedSound !== null) {
        const isSound = storedSound === 'true';
        setSoundEnabled(isSound);
        synth.setInterfaceSoundsEnabled(isSound);
      } else {
        setSoundEnabled(true);
        synth.setInterfaceSoundsEnabled(true);
      }

      const storedHaptics = localStorage.getItem('dy_haptics_enabled');
      if (storedHaptics !== null) {
        const isHaptics = storedHaptics === 'true';
        setHapticsEnabled(isHaptics);
        haptics.setHapticsEnabled(isHaptics);
      } else {
        setHapticsEnabled(true);
        haptics.setHapticsEnabled(true);
      }

      const storedAlarms = localStorage.getItem('dy_alarms');
      if (storedAlarms) {
        setAlarms(JSON.parse(storedAlarms));
      } else {
        setAlarms(DEFAULT_ALARMS);
        localStorage.setItem('dy_alarms', JSON.stringify(DEFAULT_ALARMS));
      }

      const storedClocks = localStorage.getItem('dy_world_clocks');
      if (storedClocks) {
        setWorldClocks(JSON.parse(storedClocks));
      } else {
        setWorldClocks(DEFAULT_CLOCKS);
        localStorage.setItem('dy_world_clocks', JSON.stringify(DEFAULT_CLOCKS));
      }

    } catch (e) {
      console.warn('Failed to parse localStorage data:', e);
      setAlarms(DEFAULT_ALARMS);
      setWorldClocks(DEFAULT_CLOCKS);
    }
  }, []);

  useEffect(() => {
    if (showBedside) {
      bedsideEnterTime.current = Date.now();
    } else if (bedsideEnterTime.current > 0) {
      bedsideEnterTime.current = 0;
    }
  }, [showBedside]);

  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    synth.setInterfaceSoundsEnabled(nextVal);
    haptics.medium();
    if (nextVal) {
      setTimeout(() => {
        synth.playSuccessSound();
      }, 50);
    }
  };

  const handleToggleHaptics = () => {
    const nextVal = !hapticsEnabled;
    setHapticsEnabled(nextVal);
    haptics.setHapticsEnabled(nextVal);
    synth.playClick();
    if (nextVal) {
      haptics.success();
    } else {
      haptics.medium();
    }
  };

  const handleAuraModeChange = (mode: 'static' | 'continuous' | 'time-of-day') => {
    haptics.tick();
    synth.playSwitch(mode !== 'static');
    setAuraMode(mode);
    localStorage.setItem('ambient_aura_mode', mode);
  };

  const handleAuraSpeedChange = (speed: 'slow' | 'medium' | 'fast') => {
    haptics.tick();
    synth.playClick();
    setAuraSpeed(speed);
    localStorage.setItem('ambient_aura_speed', speed);
  };

  // 2. Real-time Ticking, Alarm Scanning Loop
  useEffect(() => {
    const timer = setInterval(() => {
      const now = getAppTime();
      setCurrentTime(now);

      // Check Alarms every second, respecting active selected timezone!
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: activeTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const parts = formatter.formatToParts(now);
      const hrsVal = parts.find(p => p.type === 'hour')?.value || '00';
      const minsVal = parts.find(p => p.type === 'minute')?.value || '00';
      const currentHHMM = `${hrsVal}:${minsVal}`;
      
      let currentDay = now.getDay(); // fallback
      let dateStr = `${now.getFullYear()}${now.getMonth()}${now.getDate()}`; // fallback
      try {
        const tzString = now.toLocaleString('en-US', { timeZone: activeTimezone });
        const tzDateObj = new Date(tzString);
        currentDay = tzDateObj.getDay();
        dateStr = `${tzDateObj.getFullYear()}${tzDateObj.getMonth()}${tzDateObj.getDate()}`;
      } catch (e) {
        console.warn('Failed to calculate timezone-specific day', e);
      }
      
      const minuteAnchor = `${currentHHMM}-${dateStr}`;

      // Avoid double triggers within the same minute
      if (lastTriggeredMinute.current !== minuteAnchor) {
        const matchingAlarm = alarms.find((alarm) => {
          if (!alarm.enabled) return false;
          if (alarm.time !== currentHHMM) return false;
          // If repeatDays is set, verify current day is matched
          if (alarm.repeatDays.length > 0 && !alarm.repeatDays.includes(currentDay)) {
            return false;
          }
          return true;
        });

        if (matchingAlarm) {
          lastTriggeredMinute.current = minuteAnchor;
          setTriggeredAlarm(matchingAlarm);
          setShowBedside(false); // Close bedside mode if active
        }
      }

    }, 1000);

    return () => clearInterval(timer);
  }, [alarms, activeTimezone, triggeredAlarm]);

  // 3. State update helpers
  const saveAlarmsToStorage = (updatedAlarms: Alarm[]) => {
    setAlarms(updatedAlarms);
    localStorage.setItem('dy_alarms', JSON.stringify(updatedAlarms));
  };

  const handleAddAlarm = (newAlarmData: Omit<Alarm, 'id'>) => {
    const newAlarm: Alarm = {
      ...newAlarmData,
      id: `alarm-${Date.now()}`,
    };
    const updated = [...alarms, newAlarm].sort((a, b) => a.time.localeCompare(b.time));
    saveAlarmsToStorage(updated);
  };

  const handleUpdateAlarm = (updatedAlarm: Alarm) => {
    const updated = alarms.map((a) => (a.id === updatedAlarm.id ? updatedAlarm : a)).sort((a, b) => a.time.localeCompare(b.time));
    saveAlarmsToStorage(updated);
  };

  const handleToggleAlarm = (id: string) => {
    const updated = alarms.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a));
    saveAlarmsToStorage(updated);
  };

  const handleDeleteAlarm = (id: string) => {
    const updated = alarms.filter((a) => a.id !== id);
    saveAlarmsToStorage(updated);
  };

  const handleAddClock = (cityName: string, timezone: string) => {
    const newClock: WorldClock = {
      id: `wc-${Date.now()}`,
      cityName,
      timezone,
    };
    const updated = [...worldClocks, newClock];
    setWorldClocks(updated);
    localStorage.setItem('dy_world_clocks', JSON.stringify(updated));
    
    triggerNotification('✈️ Timezone Watch Added', `Successfully pinned watch for ${cityName}`);
  };

  const handleDeleteClock = (id: string) => {
    const updated = worldClocks.filter((c) => c.id !== id);
    setWorldClocks(updated);
    localStorage.setItem('dy_world_clocks', JSON.stringify(updated));
  };

  const handleThemeChange = (id: ThemeId) => {
    haptics.medium();
    synth.playClick();
    setThemeId(id);
    localStorage.setItem('dy_theme_id', id);
  };

  const handleDismissAlarm = () => {
    if (triggeredAlarm) {
      // If it is a temporary snooze alarm, delete it on dismiss
      if (triggeredAlarm.id.startsWith('snooze-')) {
        handleDeleteAlarm(triggeredAlarm.id);
      } else if (triggeredAlarm.repeatDays.length === 0) {
        handleToggleAlarm(triggeredAlarm.id);
      }
      setTriggeredAlarm(null);
    }
  };

  const handleSnoozeAlarm = () => {
    if (triggeredAlarm) {
      // Calculate snooze time 9 minutes in the future
      const now = new Date();
      now.setMinutes(now.getMinutes() + 9);
      const hrsStr = String(now.getHours()).padStart(2, '0');
      const minsStr = String(now.getMinutes()).padStart(2, '0');
      const snoozedTime = `${hrsStr}:${minsStr}`;
      
      const snoozedAlarm: Alarm = {
        id: `snooze-${Date.now()}`,
        time: snoozedTime,
        label: `Snooze: ${triggeredAlarm.label}`,
        enabled: true,
        repeatDays: [],
        soundId: triggeredAlarm.soundId,
        soundVolume: triggeredAlarm.soundVolume,
        gradualUp: triggeredAlarm.gradualUp,
        vibrationPattern: triggeredAlarm.vibrationPattern,
      };
      
      const updated = [...alarms, snoozedAlarm].sort((a, b) => a.time.localeCompare(b.time));
      saveAlarmsToStorage(updated);
      
      setTriggeredAlarm(null);
      synth.stopAlarmSound();
    }
  };

  const getDynamicAmbientBg = () => {
    const hrs = activeTZTime.getHours();
    if (hrs >= 6 && hrs < 12) {
      return 'bg-gradient-to-b from-sky-950/40 via-slate-950 to-amber-950/20 duration-[2000ms]';
    } else if (hrs >= 12 && hrs < 18) {
      return 'bg-gradient-to-b from-blue-950/30 via-slate-950 to-cyan-950/15 duration-[2000ms]';
    } else if (hrs >= 18 && hrs < 21) {
      return 'bg-gradient-to-b from-rose-950/30 via-slate-950 to-purple-950/35 duration-[2000ms]';
    } else {
      return 'bg-gradient-to-b from-slate-950 via-black to-indigo-950/15 duration-[2000ms]';
    }
  };

  // 4. Time Formatting Helpers for the dashboard
  const formatDigitalTime = () => {
    return getFormattedTime(currentTime);
  };

  const formatHeaderDate = () => {
    return getFormattedDate(currentTime);
  };

  const digital = formatDigitalTime();

  // Find next active alarm text
  const getNextAlarmText = () => {
    const active = alarms.filter(a => a.enabled);
    if (active.length === 0) return 'No active alarms';
    return `Next at ${active[0].time}`;
  };

  const renderClockFace = () => {
    const style = clockStyle;

    if (style === 'minimal-word') {
      const hrNames = ["TWELVE", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN"];
      const minNames = ["O'CLOCK", "FIVE PAST", "TEN PAST", "QUARTER PAST", "TWENTY PAST", "TWENTY-FIVE PAST", "HALF PAST", "TWENTY-FIVE TO", "TWENTY TO", "QUARTER TO", "TEN TO", "FIVE TO"];
 
      const h = activeTZTime.getHours();
      const m = activeTZTime.getMinutes();
 
      const nearestFiveIdx = Math.round(m / 5) % 12;
      const isPast = m <= 30;
      const targetHr = isPast ? h % 12 : (h + 1) % 12;
 
      const textWord = `IT IS ${minNames[nearestFiveIdx]} ${hrNames[targetHr]}`;
 
      return (
        <div className="text-center py-6 space-y-2" id="space-word-clock">
          <p className="text-2xl font-black text-white tracking-wide max-w-sm mx-auto leading-relaxed uppercase glow-text">
            {textWord}
          </p>
          <p className="text-xs font-semibold text-slate-400 tracking-wider">Minimal Word Clock</p>
        </div>
      );
    }
 
    if (style === 'binary') {
      const hrs = activeTZTime.getHours();
      const mins = activeTZTime.getMinutes();
      const secs = activeTZTime.getSeconds();

      const toBinaryArray = (val: number) => {
        return String(val.toString(2)).padStart(6, '0').split('').map(Number);
      };

      const hrBin = toBinaryArray(hrs);
      const minBin = toBinaryArray(mins);
      const secBin = toBinaryArray(secs);

      return (
        <div className="flex flex-col items-center space-y-3 py-4" id="space-binary-clock">
          <div className="grid grid-cols-6 gap-2 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
            {/* Hours row */}
            {hrBin.map((bit, idx) => (
              <div key={`h-${idx}`} className={`w-3.5 h-3.5 rounded-full border border-slate-800 transition-all ${bit ? 'bg-cyan-400 shadow-md shadow-cyan-400/50' : 'bg-slate-950/40'}`} />
            ))}
            {/* Minutes row */}
            {minBin.map((bit, idx) => (
              <div key={`m-${idx}`} className={`w-3.5 h-3.5 rounded-full border border-slate-800 transition-all ${bit ? 'bg-indigo-500 shadow-md shadow-indigo-500/50' : 'bg-slate-950/40'}`} />
            ))}
            {/* Seconds row */}
            {secBin.map((bit, idx) => (
              <div key={`s-${idx}`} className={`w-3.5 h-3.5 rounded-full border border-slate-800 transition-all ${bit ? 'bg-purple-500 shadow-md shadow-purple-500/50' : 'bg-slate-950/40'}`} />
            ))}
          </div>
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-black">Hrs • Mins • Secs (Binary Matrix)</p>
        </div>
      );
    }

    if (style === 'futuristic') {
      return (
        <div className="text-center py-4 space-y-2" id="space-futuristic-clock">
          <div className="inline-block p-4 rounded-xl bg-slate-950/70 border border-cyan-500/30 shadow-lg shadow-cyan-500/5 relative">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400" />
            <span className="text-5xl font-mono font-black tracking-widest text-cyan-400">
              {digital.hrs}<span className="animate-pulse">:</span>{digital.mins}
              {settings.showSeconds && digital.secs && <span className="text-slate-600 text-3xl font-bold ml-1.5">{digital.secs}</span>}
            </span>
          </div>
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Futuristic Glitch Engine</p>
        </div>
      );
    }

    // Default: classic digital
    return (
      <div className="text-center space-y-1.5" id="home-digital-clock">
        <div className="flex items-baseline justify-center font-mono select-none">
          {/* Hours */}
          <div className="flex items-center">
            {digital.hrs.split('').map((char, idx) => (
              <SlidingDigit
                key={`hr-${idx}-${char}`}
                digit={char}
                className="text-6xl sm:text-7xl font-extrabold text-white tracking-tighter glow-text"
              />
            ))}
          </div>

          {/* Pulsing Colon */}
          <span className="text-4xl sm:text-5xl font-bold text-slate-500 mx-1.5 animate-pulse select-none">:</span>

          {/* Minutes */}
          <div className="flex items-center">
            {digital.mins.split('').map((char, idx) => (
              <SlidingDigit
                key={`min-${idx}-${char}`}
                digit={char}
                className="text-6xl sm:text-7xl font-extrabold text-white tracking-tighter"
              />
            ))}
          </div>

          {/* Seconds */}
          {settings.showSeconds && digital.secs && (
            <div className="flex items-center ml-2.5" id="home-seconds-ticks">
              {digital.secs.split('').map((char, idx) => (
                <SlidingDigit
                  key={`sec-${idx}-${char}`}
                  digit={char}
                  className="text-3xl sm:text-4xl font-semibold text-slate-500"
                  width="0.58em"
                />
              ))}
            </div>
          )}
        </div>
        <p className="text-xs font-semibold text-slate-400 tracking-wider">
          {settings.timezoneDisplay !== 'time-only' && (
            <span>
              {settings.timezoneDisplay === 'time-name' 
                ? `${activeTimezone.replace('_', ' ')} (${getGMTString(activeTimezone)})` 
                : `${getGMTString(activeTimezone)}`
              } • 
            </span>
          )}
          <span> App Time</span>
        </p>
      </div>
    );
  };

  const fontClass = 'font-sans';

  return (
    <div className={`min-h-screen ${getDynamicAmbientBg()} text-slate-100 ${fontClass} transition-all duration-1000 overflow-x-hidden relative`} id="dy-clock-app-root">
      
      {/* 2. ELEGANT GLASS NOTIFICATION BANNER */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -45, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -25, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="fixed top-5 inset-x-0 mx-auto max-w-sm z-50 p-4 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex items-start gap-3 text-slate-100"
            id="elegant-glass-notification"
          >
            <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-cyan-400">
              <Sparkles className="w-4 h-4 animate-pulse text-cyan-400" />
            </div>
            <div className="space-y-0.5 text-left flex-1">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-white">
                {notification.message}
              </h4>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                {notification.desc}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      
      {/* Premium Ambient Aura Backdrop - strictly relying on the selected vibrant supreme theme */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" id="ambient-aura-backdrop">
        <div className={`absolute top-[-10%] left-[-15%] w-[80%] h-[80%] rounded-full bg-gradient-to-br ${currentTheme.gradient} opacity-[0.14] blur-[120px] animate-pulse`} style={{ animationDuration: '9s' }} />
        <div className={`absolute bottom-[-10%] right-[-15%] w-[80%] h-[80%] rounded-full bg-gradient-to-tr ${currentTheme.gradient} opacity-[0.12] blur-[140px] animate-pulse`} style={{ animationDuration: '14s' }} />
      </div>

      {/* Top Banner Branding */}
      <header className="relative w-full max-w-6xl mx-auto px-6 pt-6 pb-2 flex justify-between items-center z-10 animate-fadeIn" id="dy-clock-header">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ 
              opacity: showBedside ? 0 : 1,
              scale: showBedside ? 0.8 : 1,
              pointerEvents: showBedside ? 'none' : 'auto'
            }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          >
            <WorkingLogo 
              size={36} 
              theme={currentTheme}
              interactive={true}
              clockStyle={analogStyle}
              onClick={() => {
                haptics.success();
                synth.playSuccessSound();
                setShowBedside(true);
              }}
              className="shadow-md hover:shadow-lg transition-all duration-300"
            />
          </motion.div>
          <div>
            <h1 className="text-sm font-black tracking-wider text-white uppercase flex items-center gap-1">
              DY CLOCK <span className="text-[9px] font-bold py-0.5 px-1.5 rounded bg-cyan-950/40 border border-cyan-900/30 text-cyan-400">SUPREME</span>
            </h1>
          </div>
        </div>

        {/* Date representation & Settings button */}
        <div className="flex items-center gap-2" id="header-right-controls">
          <span className="text-xs font-bold text-slate-400 bg-slate-900/50 py-1.5 px-3 rounded-xl border border-slate-800/80 hidden sm:inline-block">
            📅 {formatHeaderDate()}
          </span>

          <button
            onClick={() => handleTabChange(activeTab === 'settings' ? 'home' : 'settings')}
            className={`py-1.5 px-3 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
              activeTab === 'settings'
                ? 'bg-white text-slate-950 border-white shadow-lg'
                : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
            title="Configure Date & Time Settings"
            id="header-settings-btn"
          >
            <Settings2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Settings</span>
          </button>
        </div>
      </header>

      {/* Main Core Router Viewports */}
      <main className="relative max-w-6xl mx-auto px-6 py-6 z-10 pb-28" id="dy-clock-main-content">
        <AnimatePresence mode="wait">
          {/* A. HOME VIEW */}
          {activeTab === 'home' && (
            <motion.div
              key="home-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ type: 'spring', stiffness: 240, damping: 28, mass: 0.85 }}
              className="space-y-6 flex flex-col items-center justify-center pt-2"
              id="home-view-container"
            >
              {/* Giant Working Logo centered prominently */}
              <div className="flex flex-col items-center text-center space-y-4 pt-4" id="home-logo-centering-box">
                <WorkingLogo 
                  size={260} 
                  theme={currentTheme}
                  clockStyle={analogStyle}
                  onClick={() => {
                    haptics.success();
                    synth.playSuccessSound();
                    setShowBedside(true);
                  }} 
                  interactive={true}
                  className="shadow-2xl shadow-cyan-500/10 hover:shadow-cyan-400/25"
                />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-900/40 py-1 px-3.5 border border-slate-850 rounded-full cursor-pointer hover:bg-slate-900 transition-all active:scale-95 flex items-center gap-1.5"
                   onClick={() => {
                     haptics.success();
                     synth.playSuccessSound();
                     setShowBedside(true);
                   }}>
                  <Moon className="w-3.5 h-3.5 text-indigo-400" /> Tap Logo For Bedside Mode
                </p>
              </div>

              {/* Mega Clock Face */}
              {renderClockFace()}



              {/* Bento Dashboard Section */}
              <div className="w-full max-w-xl mx-auto animate-fadeIn space-y-3" id="bento-dashboard">
                {/* Panel 1: Alarm & Status */}
                <div 
                  onClick={() => handleTabChange('alarm')}
                  className={`p-5 rounded-2xl ${currentTheme.cardBg} border ${currentTheme.border} cursor-pointer hover:border-cyan-500/40 transform hover:-translate-y-0.5 active:scale-98 transition-all duration-300 flex items-center justify-between group shadow-xl`}
                  id="bento-alarm-summary"
                >
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-cyan-400 group-hover:animate-bounce" /> Alarms
                    </h3>
                    <p className="text-base font-black text-white mt-1">
                      {getNextAlarmText()}
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">
                      Tap to configure and schedule alarms
                    </p>
                  </div>
                  <span className={`text-xs font-bold text-cyan-400 bg-cyan-950/30 py-1.5 px-3 rounded-xl border border-cyan-900/30`}>
                    Setup
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* B. ALARMS VIEW */}
          {activeTab === 'alarm' && (
            <motion.div
              key="alarm-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ type: 'spring', stiffness: 240, damping: 28, mass: 0.85 }}
              id="alarm-tab-container"
            >
              <AlarmTab
                alarms={alarms}
                onAddAlarm={handleAddAlarm}
                onUpdateAlarm={handleUpdateAlarm}
                onToggleAlarm={handleToggleAlarm}
                onDeleteAlarm={handleDeleteAlarm}
                theme={currentTheme}
              />
            </motion.div>
          )}

          {/* C. WORLD CLOCKS VIEW */}
          {activeTab === 'clock' && (
            <motion.div
              key="clock-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ type: 'spring', stiffness: 240, damping: 28, mass: 0.85 }}
              id="clock-tab-container"
            >
              <WorldClockTab
                clocks={worldClocks}
                onAddClock={handleAddClock}
                onDeleteClock={handleDeleteClock}
                theme={currentTheme}
              />
            </motion.div>
          )}

          {/* D. STOPWATCH VIEW */}
          {activeTab === 'stopwatch' && (
            <motion.div
              key="stopwatch-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ type: 'spring', stiffness: 240, damping: 28, mass: 0.85 }}
              id="stopwatch-tab-container"
            >
              <StopwatchTab 
                theme={currentTheme} 
              />
            </motion.div>
          )}

          {/* E. TIMER VIEW */}
          {activeTab === 'timer' && (
            <motion.div
              key="timer-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ type: 'spring', stiffness: 240, damping: 28, mass: 0.85 }}
              id="timer-tab-container"
            >
              <TimerTab 
                theme={currentTheme} 
              />
            </motion.div>
          )}

          {/* F. ABOUT VIEW */}
          {activeTab === 'about' && (
            <motion.div
              key="about-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ type: 'spring', stiffness: 240, damping: 28, mass: 0.85 }}
              id="about-tab-container"
            >
              <AboutTab theme={currentTheme} />
            </motion.div>
          )}

          {/* G. DATE & TIME SETTINGS VIEW */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ type: 'spring', stiffness: 240, damping: 28, mass: 0.85 }}
              id="settings-tab-container"
            >
              <DateTimeSettingsTab
                theme={currentTheme}
                themeId={themeId}
                onThemeChange={handleThemeChange}
                auraMode={auraMode}
                onAuraModeChange={handleAuraModeChange}
                auraSpeed={auraSpeed}
                onAuraSpeedChange={handleAuraSpeedChange}
                analogStyle={analogStyle}
                onAnalogStyleChange={setAnalogStyle}
              />
            </motion.div>
          )}


        </AnimatePresence>
      </main>

      {/* Persistent Bottom Floating Navigation Dock */}
      <nav 
        className="fixed bottom-6 inset-x-6 max-w-2xl mx-auto p-1.5 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 flex justify-between items-center shadow-2xl z-40 animate-fadeIn"
        id="dy-dock-navigator"
      >
        <motion.button
          initial="rest"
          whileHover="hover"
          whileTap="tap"
          onClick={() => handleTabChange('home')}
          className={`relative flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all gap-1 cursor-pointer z-10 ${
            activeTab === 'home'
              ? 'text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
          id="dock-home-btn"
        >
          {activeTab === 'home' && (
            <motion.div
              layoutId="activeTabBackground"
              className="absolute inset-0 bg-slate-100 rounded-xl -z-10"
              transition={{ type: 'spring', stiffness: 300, damping: 25, mass: 0.7 }}
            />
          )}
          <motion.div
            variants={{
              rest: { scale: 1, filter: 'drop-shadow(0 0 0px rgba(0, 0, 0, 0))' },
              hover: { 
                scale: 1.15, 
                filter: activeTab === 'home' 
                  ? 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.15))' 
                  : 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.45))'
              }
            }}
            transition={{ type: 'spring', stiffness: 350, damping: 15 }}
            className="relative flex items-center justify-center"
          >
            {/* Embedded Mini-working-logo representation inside nav home button! */}
            <div className={`w-5 h-5 rounded bg-gradient-to-tr ${currentTheme.gradient} p-0.5 flex items-center justify-center text-[7px] font-black text-slate-950`} />
          </motion.div>
          <span className="text-[10px] font-bold">Home</span>
        </motion.button>
 
        <motion.button
          initial="rest"
          whileHover="hover"
          whileTap="tap"
          onClick={() => handleTabChange('alarm')}
          className={`relative flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all gap-1 cursor-pointer z-10 ${
            activeTab === 'alarm'
              ? 'text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
          id="dock-alarm-btn"
        >
          {activeTab === 'alarm' && (
            <motion.div
              layoutId="activeTabBackground"
              className="absolute inset-0 bg-slate-100 rounded-xl -z-10"
              transition={{ type: 'spring', stiffness: 300, damping: 25, mass: 0.7 }}
            />
          )}
          <motion.div
            variants={{
              rest: { scale: 1, filter: 'drop-shadow(0 0 0px rgba(0, 0, 0, 0))' },
              hover: { 
                scale: 1.15, 
                filter: activeTab === 'alarm' 
                  ? 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.15))' 
                  : 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.45))'
              }
            }}
            transition={{ type: 'spring', stiffness: 350, damping: 15 }}
            className="flex items-center justify-center"
          >
            <Bell className="w-4.5 h-4.5" />
          </motion.div>
          <span className="text-[10px] font-bold">Alarms</span>
        </motion.button>
 
        <motion.button
          initial="rest"
          whileHover="hover"
          whileTap="tap"
          onClick={() => handleTabChange('clock')}
          className={`relative flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all gap-1 cursor-pointer z-10 ${
            activeTab === 'clock'
              ? 'text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
          id="dock-clock-btn"
        >
          {activeTab === 'clock' && (
            <motion.div
              layoutId="activeTabBackground"
              className="absolute inset-0 bg-slate-100 rounded-xl -z-10"
              transition={{ type: 'spring', stiffness: 300, damping: 25, mass: 0.7 }}
            />
          )}
          <motion.div
            variants={{
              rest: { scale: 1, filter: 'drop-shadow(0 0 0px rgba(0, 0, 0, 0))' },
              hover: { 
                scale: 1.15, 
                filter: activeTab === 'clock' 
                  ? 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.15))' 
                  : 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.45))'
              }
            }}
            transition={{ type: 'spring', stiffness: 350, damping: 15 }}
            className="flex items-center justify-center"
          >
            <ClockIcon className="w-4.5 h-4.5" />
          </motion.div>
          <span className="text-[10px] font-bold">World</span>
        </motion.button>


        <motion.button
          initial="rest"
          whileHover="hover"
          whileTap="tap"
          onClick={() => handleTabChange('stopwatch')}
          className={`relative flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all gap-1 cursor-pointer z-10 ${
            activeTab === 'stopwatch'
              ? 'text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
          id="dock-stopwatch-btn"
        >
          {activeTab === 'stopwatch' && (
            <motion.div
              layoutId="activeTabBackground"
              className="absolute inset-0 bg-slate-100 rounded-xl -z-10"
              transition={{ type: 'spring', stiffness: 300, damping: 25, mass: 0.7 }}
            />
          )}
          <motion.div
            variants={{
              rest: { scale: 1, filter: 'drop-shadow(0 0 0px rgba(0, 0, 0, 0))' },
              hover: { 
                scale: 1.15, 
                filter: activeTab === 'stopwatch' 
                  ? 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.15))' 
                  : 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.45))'
              }
            }}
            transition={{ type: 'spring', stiffness: 350, damping: 15 }}
            className="flex items-center justify-center"
          >
            <StopwatchIcon className="w-4.5 h-4.5" />
          </motion.div>
          <span className="text-[10px] font-bold">Stopwatch</span>
        </motion.button>
 
        <motion.button
          initial="rest"
          whileHover="hover"
          whileTap="tap"
          onClick={() => handleTabChange('timer')}
          className={`relative flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all gap-1 cursor-pointer z-10 ${
            activeTab === 'timer'
              ? 'text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
          id="dock-timer-btn"
        >
          {activeTab === 'timer' && (
            <motion.div
              layoutId="activeTabBackground"
              className="absolute inset-0 bg-slate-100 rounded-xl -z-10"
              transition={{ type: 'spring', stiffness: 300, damping: 25, mass: 0.7 }}
            />
          )}
          <motion.div
            variants={{
              rest: { scale: 1, filter: 'drop-shadow(0 0 0px rgba(0, 0, 0, 0))' },
              hover: { 
                scale: 1.15, 
                filter: activeTab === 'timer' 
                  ? 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.15))' 
                  : 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.45))'
              }
            }}
            transition={{ type: 'spring', stiffness: 350, damping: 15 }}
            className="flex items-center justify-center"
          >
            <Hourglass className="w-4.5 h-4.5" />
          </motion.div>
          <span className="text-[10px] font-bold">Timer</span>
        </motion.button>
 
        <motion.button
          initial="rest"
          whileHover="hover"
          whileTap="tap"
          onClick={() => handleTabChange('about')}
          className={`relative flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all gap-1 cursor-pointer z-10 ${
            activeTab === 'about'
              ? 'text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
          id="dock-about-btn"
        >
          {activeTab === 'about' && (
            <motion.div
              layoutId="activeTabBackground"
              className="absolute inset-0 bg-slate-100 rounded-xl -z-10"
              transition={{ type: 'spring', stiffness: 300, damping: 25, mass: 0.7 }}
            />
          )}
          <motion.div
            variants={{
              rest: { scale: 1, filter: 'drop-shadow(0 0 0px rgba(0, 0, 0, 0))' },
              hover: { 
                scale: 1.15, 
                filter: activeTab === 'about' 
                  ? 'drop-shadow(0 0 4px rgba(250, 204, 21, 0.25))' 
                  : 'drop-shadow(0 0 8px rgba(250, 204, 21, 0.65))'
              }
            }}
            transition={{ type: 'spring', stiffness: 350, damping: 15 }}
            className="flex items-center justify-center"
          >
            <Sparkles className="w-4.5 h-4.5 text-yellow-400" />
          </motion.div>
          <span className="text-[10px] font-bold">About</span>
        </motion.button>
      </nav>

      {/* Fullscreen Nightstand Bedside Mode Overlay */}
      <AnimatePresence>
        {showBedside && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black"
          >
            <BedsideMode
              onClose={() => setShowBedside(false)}
              theme={currentTheme}
              activeAlarmsCount={alarms.filter((a) => a.enabled).length}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Alarm Trigger Modal Overlay */}
      <AnimatePresence>
        {triggeredAlarm && (
          <AlarmTriggerModal
            alarm={triggeredAlarm}
            onDismiss={handleDismissAlarm}
            onSnooze={handleSnoozeAlarm}
            theme={currentTheme}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
