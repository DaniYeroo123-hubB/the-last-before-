import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Alarm, Theme } from '../types';
import { 
  Plus, Trash2, Bell, Volume2, Search, Heart, Music, 
  Upload, Sparkles, Check, Play, Square, ChevronDown, 
  Tag, VolumeX, SlidersHorizontal, Clock, Edit2, ShieldAlert,
  Sun, Flame, Trees, BellRing, CloudRain, Waves, Star, History, FolderOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import haptics from '../utils/haptics';
import { useDateTimeSettings } from '../utils/settingsContext';
import { BUILTIN_SOUNDS, synth } from '../utils/synth';
import { getSpringTransition, getButtonMotion, getStaggerContainerVariants, getStaggerItemVariants } from '../utils/motion';
import AlarmTimePicker from './AlarmTimePicker';

const getOpaqueBgColor = (themeId: string) => {
  switch (themeId) {
    case 'neon-aura':
      return '#020617'; // Solid slate-950
    case 'cyberpunk':
      return '#09090b'; // Solid zinc-950
    case 'midnight-minimal':
      return '#0a0a0a'; // Solid neutral-950
    case 'rose-gold':
      return '#1c050e'; // Solid rose-950
    case 'forest-amber':
      return '#022c16'; // Solid emerald-950
    case 'classic-silver':
      return '#0f172a'; // Solid slate-900
    default:
      return '#020617';
  }
};

const getOpaqueCardBgColor = (themeId: string) => {
  switch (themeId) {
    case 'neon-aura':
      return '#0f172a'; // Solid slate-900 card
    case 'cyberpunk':
      return '#18181b'; // Solid zinc-900 card
    case 'midnight-minimal':
      return '#171717'; // Solid neutral-900 card
    case 'rose-gold':
      return '#2d121c'; // Solid rose-900 card
    case 'forest-amber':
      return '#053d20'; // Solid emerald-900 card
    case 'classic-silver':
      return '#1e293b'; // Solid slate-800 card
    default:
      return '#0f172a';
  }
};

interface AlarmTabProps {
  alarms: Alarm[];
  onAddAlarm: (alarm: Omit<Alarm, 'id'>) => void;
  onUpdateAlarm: (alarm: Alarm) => void;
  onToggleAlarm: (id: string) => void;
  onDeleteAlarm: (id: string) => void;
  theme: Theme;
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const VIBRATION_PROFILES = [
  { id: 'none', label: '📳 Muted' },
  { id: 'gentle', label: '🍃 Gentle Ripple' },
  { id: 'heartbeat', label: '💓 Heartbeat Sync' },
  { id: 'energetic', label: '⚡ Energetic Buzz' },
  { id: 'military', label: '🥁 Military Roll' },
];

const STYLE_RECOMMENDATIONS = [
  {
    name: '🌅 Calming Sunrise',
    soundId: 'morning-breeze',
    volume: 70,
    gradualUp: true,
    vibrationPattern: 'gentle',
    desc: 'Intimate flowing piano, 70% volume, gentle vibration rise'
  },
  {
    name: '🧘 Zen Awakening',
    soundId: 'zen-horizon',
    volume: 50,
    gradualUp: true,
    vibrationPattern: 'none',
    desc: 'Deep Tibetan singing bowl, 50% volume, silent'
  },
  {
    name: '🚨 Heavy Sleep Shield',
    soundId: 'hyperdrive',
    volume: 100,
    gradualUp: false,
    vibrationPattern: 'energetic',
    desc: 'Heavy 135 BPM industrial beat, 100% volume, rapid vibration'
  }
];

export default function AlarmTab({
  alarms,
  onAddAlarm,
  onUpdateAlarm,
  onToggleAlarm,
  onDeleteAlarm,
  theme,
}: AlarmTabProps) {
  const { settings, getFormattedTime } = useDateTimeSettings();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAlarmId, setEditingAlarmId] = useState<string | null>(null);
  
  // Basic Alarm fields
  const [time, setTime] = useState('07:00');
  const [label, setLabel] = useState('Wake Up');
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [snoozeEnabled, setSnoozeEnabled] = useState(true);

  // Sound selection fields
  const [soundId, setSoundId] = useState('cosmic-resonance');
  const [soundVolume, setSoundVolume] = useState(80);
  const [gradualUp, setGradualUp] = useState(true);
  const [vibrationPattern, setVibrationPattern] = useState('heartbeat');
  const [customDataUrl, setCustomDataUrl] = useState<string | undefined>(undefined);
  
  // Custom interface states
  const [audioLabExpanded, setAudioLabExpanded] = useState(false);

  // Sound search and filter fields
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  // Persistence of favorites, custom uploads & recently used
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dy_sound_favorites');
      return saved ? JSON.parse(saved) : ['morning-breeze', 'sunrise', 'soft-piano', 'meditation-bells'];
    } catch (e) {
      return ['sunrise', 'soft-piano'];
    }
  });

  const [recentlyUsed, setRecentlyUsed] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dy_recently_used_sounds');
      return saved ? JSON.parse(saved) : ['morning-breeze', 'sunrise', 'soft-piano'];
    } catch (e) {
      return [];
    }
  });

  const [customSounds, setCustomSounds] = useState<{ id: string; name: string; dataUrl: string }[]>(() => {
    try {
      const saved = localStorage.getItem('dy_custom_sounds');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const handleToggleDay = (dayIndex: number) => {
    haptics.tick();
    synth.playClick();
    if (repeatDays.includes(dayIndex)) {
      setRepeatDays(repeatDays.filter((d) => d !== dayIndex));
    } else {
      setRepeatDays([...repeatDays, dayIndex].sort());
    }
  };

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.light();
    synth.playClick();
    let updated;
    if (favorites.includes(id)) {
      updated = favorites.filter(favId => favId !== id);
    } else {
      updated = [...favorites, id];
    }
    setFavorites(updated);
    localStorage.setItem('dy_sound_favorites', JSON.stringify(updated));
  };

  const [dragActive, setDragActive] = useState(false);

  const processAudioFile = (file: File) => {
    if (!file) return;

    if (file.size > 3.5 * 1024 * 1024) {
      haptics.error();
      synth.playErrorSound();
      setErrorMessage("Performance Safeguard: Please choose an audio file under 3.5 MB to keep DY Clock running fast and smooth!");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      const newCustom = {
        id: `custom-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ""), // strip extension
        dataUrl: b64
      };

      const updated = [...customSounds, newCustom];
      setCustomSounds(updated);
      localStorage.setItem('dy_custom_sounds', JSON.stringify(updated));
      
      setSoundId(newCustom.id);
      setCustomDataUrl(b64);
      haptics.success();
      handlePreviewSound(newCustom.id, b64);
    };
    reader.readAsDataURL(file);
  };

  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      haptics.light();
      synth.playClick();
      processAudioFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processAudioFile(file);
    }
  };

  const addToRecentlyUsed = (id: string) => {
    setRecentlyUsed(prev => {
      const updated = [id, ...prev.filter(x => x !== id)].slice(0, 10);
      localStorage.setItem('dy_recently_used_sounds', JSON.stringify(updated));
      return updated;
    });
  };

  const handlePreviewSound = (id: string, customUrl?: string) => {
    addToRecentlyUsed(id);
    if (previewingId === id) {
      synth.stopAlarmSound();
      setPreviewingId(null);
    } else {
      setPreviewingId(id);
      synth.previewSound(id, customUrl || customSounds.find(s => s.id === id)?.dataUrl);
      // Automatically reset previewing target after 5.3s
      setTimeout(() => {
        setPreviewingId(prev => prev === id ? null : prev);
      }, 5300);
    }
  };

  const applyVibePreset = (preset: typeof STYLE_RECOMMENDATIONS[0]) => {
    haptics.success();
    setSoundId(preset.soundId);
    setSoundVolume(preset.volume);
    setGradualUp(preset.gradualUp);
    setVibrationPattern(preset.vibrationPattern);
    
    // Auto preview preset sound
    const customMatch = customSounds.find(s => s.id === preset.soundId);
    handlePreviewSound(preset.soundId, customMatch?.dataUrl);
  };

  const handleStartEdit = (alarm: Alarm) => {
    haptics.medium();
    synth.playClick();
    
    setEditingAlarmId(alarm.id);
    setTime(alarm.time);
    setLabel(alarm.label);
    setRepeatDays(alarm.repeatDays);
    setSnoozeEnabled(alarm.snoozeEnabled ?? true);
    setSoundId(alarm.soundId || 'gentle-wake-up');
    setSoundVolume(alarm.soundVolume ?? 80);
    setGradualUp(alarm.gradualUp ?? true);
    setVibrationPattern(alarm.vibrationPattern || 'heartbeat');
    setCustomDataUrl(alarm.customDataUrl);
    
    setShowAddForm(true);
  };

  const handleCancel = () => {
    haptics.medium();
    synth.playDismiss();
    
    // Stop any active previews
    synth.stopAlarmSound();
    setPreviewingId(null);

    // Reset form fields
    setTime('07:00');
    setLabel('Wake Up');
    setRepeatDays([]);
    setSoundId('gentle-wake-up');
    setSoundVolume(80);
    setGradualUp(true);
    setVibrationPattern('heartbeat');
    setCustomDataUrl(undefined);
    setSnoozeEnabled(true);
    setAudioLabExpanded(false);
    
    setShowAddForm(false);
    setEditingAlarmId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    haptics.success();
    synth.playSuccessSound();
    
    // Stop any active previews
    synth.stopAlarmSound();
    setPreviewingId(null);

    const alarmPayload = {
      time,
      label: label.trim() || 'Alarm',
      enabled: true,
      repeatDays,
      soundId,
      soundVolume,
      gradualUp,
      vibrationPattern,
      customDataUrl: soundId.startsWith('custom-') ? customDataUrl : undefined,
      snoozeEnabled,
    };

    if (editingAlarmId) {
      onUpdateAlarm({
        ...alarmPayload,
        id: editingAlarmId,
      });
    } else {
      onAddAlarm(alarmPayload);
    }

    // Reset form
    setTime('07:00');
    setLabel('Wake Up');
    setRepeatDays([]);
    setSoundId('gentle-wake-up');
    setSoundVolume(80);
    setGradualUp(true);
    setVibrationPattern('heartbeat');
    setCustomDataUrl(undefined);
    setSnoozeEnabled(true);
    setAudioLabExpanded(false);
    setShowAddForm(false);
    setEditingAlarmId(null);
  };

  // Helper to fetch readable sound name
  const getSoundName = (id?: string) => {
    if (!id) return 'Gentle Wake Up';
    if (id.startsWith('custom-')) {
      const c = customSounds.find(s => s.id === id);
      return c ? `📤 ${c.name}` : 'Custom Audio';
    }
    const b = BUILTIN_SOUNDS.find(s => s.id === id);
    return b ? b.name : 'Morning Breeze';
  };

  const getVibrationLabel = (id?: string) => {
    const found = VIBRATION_PROFILES.find(v => v.id === id);
    return found ? found.label : '💓 Heartbeat';
  };

  // Filtering Logic
  const allSoundsCombined = [
    ...customSounds.map(s => ({
      id: s.id,
      name: s.name,
      category: 'Uploaded 📥',
      description: 'Custom imported device audio file.',
      isCustom: true,
      dataUrl: s.dataUrl,
      durationText: 'User file',
      typeText: 'Uploaded'
    })),
    ...BUILTIN_SOUNDS.map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      description: s.description,
      isCustom: false,
      dataUrl: undefined,
      durationText: s.durationText,
      typeText: s.typeText
    }))
  ];

  const categoriesList = [
    { id: 'All', name: 'All', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'Favorites', name: 'Favorites', icon: <Heart className="w-3.5 h-3.5 fill-current" /> },
    { id: 'Recent', name: 'Recent', icon: <History className="w-3.5 h-3.5" /> },
    { id: 'Calm Wake Up', name: 'Calm Wake Up', icon: <Sun className="w-3.5 h-3.5" /> },
    { id: 'Normal Alarm', name: 'Everyday', icon: <Bell className="w-3.5 h-3.5" /> },
    { id: 'Strong Wake Up', name: 'Heavy Sleepers', icon: <Flame className="w-3.5 h-3.5" /> },
    { id: 'Nature', name: 'Nature', icon: <Trees className="w-3.5 h-3.5" /> },
    { id: 'Piano', name: 'Piano', icon: <Music className="w-3.5 h-3.5" /> },
    { id: 'Bells', name: 'Bells', icon: <BellRing className="w-3.5 h-3.5" /> },
    { id: 'Rain', name: 'Rain', icon: <CloudRain className="w-3.5 h-3.5" /> },
    { id: 'Ocean', name: 'Ocean', icon: <Waves className="w-3.5 h-3.5" /> },
    { id: 'Uploaded', name: 'Custom', icon: <FolderOpen className="w-3.5 h-3.5" /> }
  ];

  const filteredSounds = allSoundsCombined.filter(sound => {
    const matchesSearch = sound.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          sound.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    switch (activeCategory) {
      case 'All':
        return true;
      case 'Favorites':
        return favorites.includes(sound.id);
      case 'Recent':
        return recentlyUsed.includes(sound.id);
      case 'Calm Wake Up':
        return sound.category === 'Calm Wake Up';
      case 'Normal Alarm':
        return sound.category === 'Normal Alarm';
      case 'Strong Wake Up':
        return sound.category === 'Strong Wake Up';
      case 'Nature':
        return ['solar-wind', 'morning-breeze', 'zen-horizon'].includes(sound.id);
      case 'Piano':
        return ['morning-breeze'].includes(sound.id);
      case 'Bells':
        return ['golden-hour-bell', 'aurora-chime', 'cosmic-resonance', 'zen-horizon'].includes(sound.id);
      case 'Rain':
        return ['solar-wind'].includes(sound.id);
      case 'Ocean':
        return ['vaporwave-dream'].includes(sound.id);
      case 'Uploaded':
        return sound.isCustom;
      default:
        return true;
    }
  });

  if (activeCategory === 'Recent') {
    filteredSounds.sort((a, b) => {
      const idxA = recentlyUsed.indexOf(a.id);
      const idxB = recentlyUsed.indexOf(b.id);
      return idxA - idxB;
    });
  }

  return (
    <div className="space-y-6" id="alarm-tab-view">
      
      {/* SECTION HEADER BLOCK */}
      <div className="flex items-center justify-between" id="alarm-tab-header">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Bell className={`w-5 h-5 text-${theme.primary}`} /> Alarms
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-semibold uppercase tracking-wider">
            {alarms.filter(a => a.enabled).length} Active Awakening Alarms
          </p>
        </div>
        
        <motion.button
          onClick={() => {
            haptics.medium();
            synth.playClick();
            setEditingAlarmId(null);
            
            // Default new alarm time to current master timezone hour/minute
            const tObj = getFormattedTime(new Date());
            setTime(`${tObj.hrs}:${tObj.mins}`);
            
            setShowAddForm(true);
          }}
          {...getButtonMotion(settings.animationIntensity)}
          transition={getSpringTransition(settings.animationIntensity)}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black bg-${theme.primary} text-slate-950 shadow-lg shadow-${theme.primary}/10 cursor-pointer`}
          id="btn-add-alarm-trigger"
        >
          <Plus className="w-4 h-4 text-slate-950" /> Add Alarm
        </motion.button>
      </div>

      {/* Add / Edit Alarm Form Panel - Rebuilt as a dedicated full-screen page with premium page transition inside a Portal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ y: "100%", opacity: 1 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 26 }}
              className="fixed inset-0 z-[9999] overflow-y-auto flex flex-col bg-slate-950"
              style={{ backgroundColor: getOpaqueBgColor(theme.id) }}
              id="add-alarm-fullscreen-page"
            >
            {/* Ambient luxury glow accents */}
            <div className={`absolute top-0 left-1/4 w-96 h-96 bg-${theme.primary}/[0.04] rounded-full blur-3xl pointer-events-none`} />
            <div className={`absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-500/[0.03] rounded-full blur-3xl pointer-events-none`} />

            <form onSubmit={handleSubmit} className="flex flex-col min-h-full">
              
              {/* 1. PREMIUM HEADER NAVIGATION */}
              <div 
                className={`sticky top-0 border-b border-${theme.primary}/20 px-4 sm:px-6 py-4 flex items-center justify-between z-30`}
                style={{ backgroundColor: getOpaqueBgColor(theme.id) }}
              >
                <button
                  type="button"
                  onClick={handleCancel}
                  className={`px-4 py-2 rounded-xl text-xs font-black text-slate-400 hover:text-${theme.primary} transition-colors cursor-pointer`}
                  id="fullscreen-cancel-btn"
                >
                  Cancel
                </button>
                
                <div className="text-center">
                  <h3 className="text-xs font-black tracking-widest text-white uppercase font-sans">
                    {editingAlarmId ? 'Edit Awakening' : 'Create Awakening'}
                  </h3>
                </div>

                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-xs font-black bg-${theme.primary} text-slate-950 shadow-lg shadow-${theme.primary}/20 hover:scale-[1.03] active:scale-95 transition-all cursor-pointer`}
                  id="fullscreen-save-btn"
                >
                  Save
                </button>
              </div>

              {/* 2. MAIN SCROLLABLE FORM - SINGLE-COLUMN SPECIFICATION with extra bottom padding for safe area and touch targets */}
              <div className="flex-1 w-full max-w-xl mx-auto px-4 py-8 sm:py-10 pb-28 sm:pb-36 space-y-6 relative z-10">
                
                {/* PRIMARY FOCUS: RADIAL CLOCK TIME PICKER */}
                <div id="time-picker-section">
                  <AlarmTimePicker value={time} onChange={setTime} theme={theme} />
                </div>

                {/* SECOND: REPEAT DAYS FREQUENCY CARD */}
                <div 
                  className={`border ${theme.border} p-5 sm:p-6 rounded-3xl space-y-4 shadow-xl`} 
                  style={{ backgroundColor: getOpaqueCardBgColor(theme.id) }}
                  id="repeat-days-section"
                >
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Repeat Frequency</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {repeatDays.length === 7 
                        ? 'Every day' 
                        : repeatDays.length === 5 && !repeatDays.includes(0) && !repeatDays.includes(6)
                          ? 'Weekdays'
                          : repeatDays.length === 2 && repeatDays.includes(0) && repeatDays.includes(6)
                            ? 'Weekends'
                            : repeatDays.length === 0 
                              ? 'Once' 
                              : `${repeatDays.length} days selected`}
                    </span>
                  </div>
                  
                  <div className="flex justify-between gap-1.5 sm:gap-2.5" id="day-selector-row">
                    {DAYS_SHORT.map((day, idx) => {
                      const isSelected = repeatDays.includes(idx);
                      return (
                        <motion.button
                          key={day}
                          type="button"
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => handleToggleDay(idx)}
                          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl text-xs font-black border flex items-center justify-center transition-all duration-300 cursor-pointer ${
                            isSelected
                              ? `bg-${theme.primary} text-slate-950 border-${theme.primary} shadow-lg shadow-${theme.primary}/15 font-black`
                              : `bg-black/20 text-slate-400 border border-${theme.primary}/10 hover:border-${theme.primary}/30`
                          }`}
                          id={`day-btn-${idx}`}
                          title={`Repeat on ${day}`}
                        >
                          {day[0]}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* THIRD: ALARM LABEL CARD */}
                <div 
                  className={`space-y-3 p-5 sm:p-6 border ${theme.border} rounded-3xl shadow-xl`}
                  style={{ backgroundColor: getOpaqueCardBgColor(theme.id) }}
                >
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase px-1 block">Alarm Label</label>
                  <div className="relative flex items-center">
                    <Tag className={`absolute left-4 w-4 h-4 text-${theme.primary}/50 pointer-events-none`} />
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="e.g. Morning Meditation"
                      className={`w-full py-4 pl-11 pr-4 rounded-2xl bg-black/25 border border-${theme.primary}/15 text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-${theme.primary} focus:ring-1 focus:ring-${theme.primary}/30 transition-all duration-300`}
                      id="alarm-label-input"
                    />
                  </div>
                </div>

                {/* FOURTH: ALARM SOUND CONFIGURATIONS */}
                <div 
                  className={`border ${theme.border} p-5 sm:p-6 rounded-3xl space-y-4 shadow-xl`} 
                  style={{ backgroundColor: getOpaqueCardBgColor(theme.id) }}
                  id="alarm-sound-section"
                >
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Alarm Sound</span>
                    <span className={`text-[10px] font-bold text-${theme.primary} uppercase tracking-wider`}>
                      {getSoundName(soundId)}
                    </span>
                  </div>

                  {/* Volume level control with live preview */}
                  <div className="space-y-2 bg-black/15 p-4 rounded-2xl border border-slate-900/40">
                    <div className="flex justify-between items-center text-[10px] font-black text-slate-400">
                      <span>MASTER VOLUME</span>
                      <span className={`font-bold text-${theme.primary}`}>{soundVolume}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Volume2 className="w-4 h-4 text-slate-500" />
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={soundVolume}
                        onChange={(e) => {
                          const vol = parseInt(e.target.value, 10);
                          setSoundVolume(vol);
                          synth.setVolume(vol); // dynamic live adjustment!
                          haptics.light();
                        }}
                        className={`w-full h-1 bg-black rounded-lg appearance-none cursor-pointer accent-${theme.primary} focus:outline-none`}
                        aria-label="Alarm Volume"
                      />
                    </div>
                  </div>

                  {/* Gradual Rise toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-black/25 border border-slate-900/60 rounded-2xl">
                    <div>
                      <span className="text-[10px] font-black text-slate-200 block uppercase tracking-wide">Gradual Volume Rise</span>
                      <span className="text-[9px] text-slate-500 block">Linearly scale volume over 15s</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        haptics.light();
                        setGradualUp(!gradualUp);
                      }}
                      className={`w-11 h-6.5 rounded-full p-0.5 transition-all duration-300 relative flex items-center cursor-pointer outline-none ${
                        gradualUp ? `bg-${theme.primary} border border-${theme.primary}/20` : `bg-black/40 border border-${theme.primary}/15`
                      }`}
                      aria-label="Toggle gradual volume rise"
                    >
                      <motion.div
                        layout
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="w-5 h-5 rounded-full bg-slate-950 shadow-md"
                        animate={{ x: gradualUp ? 20 : 0 }}
                      />
                    </button>
                  </div>

                  {/* Expandable Sound Browser */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        haptics.medium();
                        synth.playClick();
                        setAudioLabExpanded(!audioLabExpanded);
                      }}
                      className="w-full p-3.5 bg-black/25 border border-slate-900/60 rounded-2xl flex items-center justify-between hover:bg-white/[0.02] transition-all text-left cursor-pointer outline-none"
                      id="sound-browser-trigger"
                    >
                      <div className="flex items-center gap-3">
                        <Music className={`w-4 h-4 text-${theme.primary}`} />
                        <span className="text-xs font-black text-white uppercase tracking-wider">Browse Sound Library</span>
                      </div>
                      <motion.div
                        animate={{ rotate: audioLabExpanded ? 180 : 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                        className="text-slate-400"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </motion.div>
                    </button>

                    <AnimatePresence initial={false}>
                      {audioLabExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                          className="overflow-hidden space-y-4 pt-1"
                        >
                          {/* Drag and Drop Custom upload area */}
                          <div 
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            className={`relative flex flex-col items-center justify-center text-center p-5 rounded-2xl border-2 border-dashed transition-all duration-300 ${
                              dragActive 
                                ? `border-${theme.primary} bg-${theme.primary}/10 scale-[1.01]` 
                                : `border-${theme.primary}/20 bg-black/25 hover:border-${theme.primary}/40`
                            }`}
                          >
                            <input 
                              type="file" 
                              ref={fileInputRef} 
                              onChange={handleCustomAudioUpload}
                              accept="audio/*" 
                              className="hidden" 
                            />
                            <div className="p-3 bg-black/30 rounded-full mb-2">
                              <Upload className={`w-5 h-5 text-${theme.primary} ${dragActive ? 'animate-bounce' : ''}`} />
                            </div>
                            <span className="text-[11px] font-black text-slate-200 uppercase tracking-wider block">Import Custom File</span>
                            <p className="text-[9px] text-slate-500 max-w-[240px] mt-1 leading-normal">
                              Drag and drop or click to upload your custom sound. Supports MP3, WAV, OGG, M4A, AAC, FLAC (Max 3.5MB).
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                haptics.medium();
                                fileInputRef.current?.click();
                              }}
                              className={`mt-3 py-1.5 px-4 rounded-xl bg-black/35 hover:bg-black/55 border border-${theme.primary}/25 hover:border-${theme.primary}/50 text-slate-200 text-[10px] font-black transition-all cursor-pointer`}
                            >
                              Choose File
                            </button>
                          </div>

                          {/* Suggested preset vibes */}
                          <div className="space-y-2">
                            <span className={`text-[9px] font-black tracking-widest text-${theme.primary} uppercase`}>Recommended Profiles</span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {STYLE_RECOMMENDATIONS.map((preset) => (
                                <button
                                  key={preset.name}
                                  type="button"
                                  onClick={() => applyVibePreset(preset)}
                                  className="p-3 rounded-2xl bg-black/20 border border-slate-900 hover:border-slate-800 text-left transition-all hover:scale-[1.02] active:scale-95 group cursor-pointer"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-white group-hover:text-cyan-400">{preset.name}</span>
                                    <Sparkles className="w-3 h-3 text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                  <p className="text-[9px] text-slate-500 mt-1 leading-tight">{preset.desc}</p>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Sound library browser */}
                          <div className="space-y-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-2">
                              <span className={`text-[9px] font-black tracking-widest text-${theme.primary} uppercase`}>All Sound Presets</span>
                              
                              <div className="relative w-full sm:max-w-[200px]">
                                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-${theme.primary}/40`} />
                                <input 
                                  type="text" 
                                  placeholder="Search sound..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className={`w-full py-2 pl-9 pr-3 rounded-xl bg-black/25 border border-${theme.primary}/15 text-[11px] font-semibold text-white focus:outline-none focus:border-${theme.primary} placeholder-slate-600 transition-all duration-200`}
                                  aria-label="Search sound presets"
                                />
                              </div>
                            </div>

                            {/* Sound category switcher */}
                            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none" id="categories-tabs">
                              {categoriesList.map((cat) => {
                                const isActive = activeCategory === cat.id;
                                if (cat.id === 'Uploaded' && customSounds.length === 0) return null;
                                return (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => {
                                      haptics.light();
                                      setActiveCategory(cat.id);
                                    }}
                                    className={`py-1.5 px-3 rounded-full text-[10px] font-black whitespace-nowrap border transition-all flex items-center gap-1.5 cursor-pointer ${
                                      isActive
                                        ? `bg-${theme.primary} text-slate-950 border-${theme.primary} shadow-md shadow-${theme.primary}/10`
                                        : `bg-black/25 text-slate-400 border border-${theme.primary}/10 hover:border-${theme.primary}/30 hover:text-white`
                                    }`}
                                  >
                                    {cat.icon}
                                    <span>{cat.name}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Sound scrolling list */}
                            <div className="max-h-[280px] overflow-y-auto border border-slate-900 bg-black/20 rounded-2xl p-2 space-y-1.5 custom-scrollbar">
                              {filteredSounds.length === 0 ? (
                                <div className="p-8 text-center text-slate-600 text-[11px] font-black uppercase tracking-wider">
                                  No sounds found matching filter
                                </div>
                              ) : (
                                filteredSounds.map((sound) => {
                                  const isSelected = soundId === sound.id;
                                  const isFav = favorites.includes(sound.id);
                                  const isPlaying = previewingId === sound.id;

                                  return (
                                    <div
                                      key={sound.id}
                                      onClick={() => {
                                        haptics.light();
                                        setSoundId(sound.id);
                                        if (sound.isCustom) {
                                          setCustomDataUrl(sound.dataUrl);
                                        } else {
                                          setCustomDataUrl(undefined);
                                        }
                                      }}
                                      className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all border ${
                                        isSelected
                                          ? `bg-${theme.primary}/10 border-${theme.primary}/35 text-${theme.primary} shadow-md shadow-${theme.primary}/5`
                                          : 'hover:bg-white/[0.02] border-transparent text-slate-300'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3 max-w-[75%]">
                                        {/* Status selector radio bubble */}
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                          isSelected ? `border-${theme.primary}` : 'border-slate-800'
                                        }`}>
                                          {isSelected && (
                                            <motion.div 
                                              layoutId="activeSoundIndicator"
                                              className={`w-2 h-2 rounded-full bg-${theme.primary}`} 
                                            />
                                          )}
                                        </div>

                                        <div className="truncate">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <p className="text-[11px] font-black tracking-tight text-white">
                                              {sound.name}
                                            </p>
                                            <span className={`text-[8px] border py-0.5 px-1 rounded uppercase tracking-wider shrink-0 ${
                                              sound.isCustom
                                                ? `bg-indigo-500/15 border-indigo-500/30 text-indigo-400`
                                                : `bg-slate-950/40 border-slate-800 text-slate-500`
                                            }`}>
                                              {sound.typeText || 'Loop'}
                                            </span>
                                            {!sound.isCustom && (
                                              <span className="text-[8px] text-slate-600 font-semibold px-1 rounded bg-black/20">
                                                {sound.category}
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[9px] text-slate-500 truncate mt-1">{sound.description}</p>
                                          
                                          {/* Duration details */}
                                          <span className="text-[8px] text-slate-600 uppercase font-bold tracking-widest mt-1 block">
                                            ⏳ {sound.durationText}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {/* Playback Control Button */}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            haptics.medium();
                                            handlePreviewSound(sound.id, sound.dataUrl);
                                          }}
                                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                            isPlaying 
                                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse' 
                                              : `bg-black/40 hover:bg-black/60 text-slate-400 hover:text-white border border-${theme.primary}/20 hover:border-${theme.primary}/40`
                                          }`}
                                          title={isPlaying ? 'Stop Preview' : 'Play Preview'}
                                        >
                                          {isPlaying ? <Square className="w-3.5 h-3.5 fill-rose-400" /> : <Play className="w-3.5 h-3.5 fill-slate-400 ml-0.5" />}
                                        </button>

                                        {/* Favorite Toggle Heart */}
                                        {!sound.isCustom && (
                                          <button
                                            type="button"
                                            onClick={(e) => handleToggleFavorite(sound.id, e)}
                                            className={`p-2 rounded-lg hover:bg-white/[0.04] transition-all cursor-pointer ${
                                              isFav ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
                                            }`}
                                            title={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
                                          >
                                            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400 stroke-amber-400' : ''}`} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* FIFTH: SYNCHRONIZED VIBRATION PATTERNS */}
                <div 
                  className={`border ${theme.border} p-5 sm:p-6 rounded-3xl space-y-4 shadow-xl`}
                  style={{ backgroundColor: getOpaqueCardBgColor(theme.id) }}
                  id="vibration-section"
                >
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Synchronized Haptics</span>
                    <span className={`text-[10px] font-bold text-${theme.primary} uppercase tracking-wider`}>
                      {getVibrationLabel(vibrationPattern).replace(/.*?\s/, '')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2" id="vibration-profiles-grid">
                    {VIBRATION_PROFILES.map((profile) => {
                      const isActive = vibrationPattern === profile.id;
                      return (
                        <button
                          key={profile.id}
                          type="button"
                          onClick={() => {
                            haptics.light();
                            setVibrationPattern(profile.id);
                            if (profile.id === 'gentle') navigator.vibrate?.(100);
                            else if (profile.id === 'heartbeat') navigator.vibrate?.([60, 60, 100]);
                            else if (profile.id === 'energetic') navigator.vibrate?.(300);
                            else if (profile.id === 'military') navigator.vibrate?.([100, 100, 200]);
                          }}
                          className={`py-3 px-1 text-[11px] font-black rounded-2xl border text-center transition-all cursor-pointer ${
                            isActive
                              ? `bg-${theme.primary} text-slate-950 border-${theme.primary} shadow-lg font-black`
                              : `bg-black/20 border border-${theme.primary}/10 text-slate-400 hover:border-${theme.primary}/30`
                          }`}
                        >
                          {profile.label.replace(/.*?\s/, '')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SIXTH: SNOOZE OPTION SWITCH */}
                <div 
                  className={`border ${theme.border} p-5 sm:p-6 rounded-3xl space-y-4 shadow-xl`}
                  style={{ backgroundColor: getOpaqueCardBgColor(theme.id) }}
                  id="snooze-toggle-section"
                >
                  <div className="flex items-center justify-between p-1">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 bg-black/25 rounded-xl border border-${theme.primary}/15 text-${theme.primary}/60`}>
                        <Clock className={`w-4.5 h-4.5 text-${theme.primary}`} />
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-200 block uppercase tracking-wider">Interval Snooze</span>
                        <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wide">Repeats every 9 min</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        haptics.medium();
                        synth.playClick();
                        setSnoozeEnabled(!snoozeEnabled);
                      }}
                      className={`w-11 h-6.5 rounded-full p-0.5 transition-all duration-300 relative flex items-center cursor-pointer outline-none ${
                        snoozeEnabled 
                          ? `bg-gradient-to-r ${theme.gradient} border border-${theme.primary}/30` 
                          : `bg-black/30 border border-${theme.primary}/10`
                      }`}
                      id="snooze-toggle-btn"
                    >
                      <motion.div
                        layout
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="w-5 h-5 rounded-full bg-slate-950 shadow-md"
                        animate={{ x: snoozeEnabled ? 20 : 0 }}
                      />
                    </button>
                  </div>
                </div>

                {/* SEVENTH: BOTTOM ACTION BUTTONS ROW FOR ERGONOMICS */}
                <div className="grid grid-cols-2 gap-4 pt-4" id="bottom-form-actions">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="py-4 rounded-2xl text-xs font-black bg-black/25 hover:bg-black/40 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer text-center"
                  >
                    Cancel & Discard
                  </button>
                  <button
                    type="submit"
                    className={`py-4 rounded-2xl text-xs font-black bg-gradient-to-r ${theme.gradient} text-slate-950 shadow-xl shadow-${theme.primary}/10 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer text-center`}
                  >
                    Save Awakening
                  </button>
                </div>

              </div>

            </form>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}

      {/* Alarms List */}
      <div className="space-y-3" id="alarms-list-container">
        {alarms.length === 0 ? (
          <div className={`p-10 text-center rounded-2xl ${theme.cardBg} border ${theme.border} space-y-3`} id="empty-alarms-view">
            <div className="w-12 h-12 bg-black/40 border border-slate-900 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Bell className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300">No alarms set</p>
              <p className="text-xs text-slate-500 mt-0.5">Click the "Add Alarm" button to set your first smart alarm.</p>
            </div>
          </div>
        ) : (
          alarms.map((alarm) => {
            const hasRepeat = alarm.repeatDays.length > 0;
            return (
              <motion.div
                key={alarm.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={
                  settings.animationIntensity === 'minimal' ? { scale: 1.005 } :
                  settings.animationIntensity === 'balanced' ? { scale: 1.012, y: -2 } :
                  settings.animationIntensity === 'supreme' ? { scale: 1.022, y: -4, border: `1px solid var(--color-cyan-500, rgba(6, 182, 212, 0.35))`, boxShadow: "0 15px 30px -10px rgba(0,0,0,0.5)" } :
                  { scale: 1.03, y: -6, border: `1px solid var(--color-cyan-500, rgba(6, 182, 212, 0.45))`, boxShadow: "0 25px 45px -12px rgba(0,0,0,0.6)" }
                }
                transition={getSpringTransition(settings.animationIntensity)}
                className={`p-4 sm:p-5 rounded-2xl ${theme.cardBg} border ${
                  alarm.enabled ? `border-${theme.primary}/25` : theme.border
                } hover:border-${theme.primary}/40 flex items-center justify-between group cursor-pointer`}
                id={`alarm-card-${alarm.id}`}
              >
                {/* Alarm Information & Click To Edit */}
                <div 
                  onClick={() => handleStartEdit(alarm)}
                  className="flex items-center gap-4 max-w-[70%] flex-1 cursor-pointer"
                  title="Click to edit alarm settings"
                >
                  {/* Status Circle Indicator */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation(); // Avoid triggering card edit mode!
                      haptics.medium();
                      synth.playSwitch(!alarm.enabled);
                      onToggleAlarm(alarm.id);
                    }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                      alarm.enabled 
                        ? `bg-${theme.primary}/10 border border-${theme.primary}/30 text-${theme.primary}` 
                        : 'bg-black/45 border border-slate-800 text-slate-500'
                    }`}
                    id={`alarm-status-icon-${alarm.id}`}
                  >
                    <Bell className="w-4.5 h-4.5" />
                  </div>

                  {/* Alarm Details */}
                  <div className="truncate">
                    <div className="flex items-baseline gap-2.5 truncate">
                      <span className={`text-2xl font-bold tracking-tight font-mono ${alarm.enabled ? 'text-white' : 'text-slate-500'}`}>
                        {alarm.time}
                      </span>
                      <span className={`text-xs font-semibold truncate ${alarm.enabled ? 'text-slate-300' : 'text-slate-500'}`}>
                        {alarm.label}
                      </span>
                      <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 self-center" />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {/* Repeat days text */}
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        {hasRepeat
                          ? alarm.repeatDays.map((d) => DAYS_SHORT[d]).join(', ')
                          : 'Once'}
                      </span>

                      {/* Selected Sound Tag */}
                      <span className={`text-[10px] font-bold flex items-center gap-1 py-0.5 px-2 rounded-md ${
                        alarm.enabled ? 'bg-black/35 text-slate-300 border border-slate-800' : 'bg-black/20 text-slate-600'
                      }`}>
                        <Music className={`w-2.5 h-2.5 text-${theme.primary}`} /> {getSoundName(alarm.soundId)}
                      </span>

                      {/* Volume & Gradual Up Tag */}
                      <span className={`text-[10px] font-bold flex items-center gap-1 py-0.5 px-2 rounded-md ${
                        alarm.enabled ? 'bg-black/35 text-slate-300 border border-slate-800' : 'bg-black/20 text-slate-600'
                      }`}>
                        <Volume2 className="w-2.5 h-2.5 text-indigo-400" /> {alarm.soundVolume ?? 80}% {alarm.gradualUp ? '📈' : ''}
                      </span>

                      {/* Vibration Profile Tag */}
                      <span className={`text-[10px] font-bold flex items-center gap-1 py-0.5 px-2 rounded-md ${
                        alarm.enabled ? 'bg-black/35 text-slate-300 border border-slate-800' : 'bg-black/20 text-slate-600'
                      }`}>
                        {getVibrationLabel(alarm.vibrationPattern)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Alarm Enable Toggle and Delete */}
                <div className="flex items-center gap-3">
                  {/* iOS Style Custom Toggle Button */}
                  <button
                    onClick={() => {
                      haptics.medium();
                      synth.playSwitch(!alarm.enabled);
                      onToggleAlarm(alarm.id);
                    }}
                    className={`w-12 h-6.5 rounded-full p-0.5 transition-all duration-300 ${
                      alarm.enabled ? `bg-${theme.primary}` : 'bg-slate-800'
                    }`}
                    id={`alarm-toggle-${alarm.id}`}
                  >
                    <div
                      className={`w-5.5 h-5.5 rounded-full bg-slate-950 shadow-md transform transition-all duration-300 ${
                        alarm.enabled ? 'translate-x-5.5' : 'translate-x-0'
                      }`}
                    />
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => {
                      haptics.heavy();
                      synth.playDelete();
                      onDeleteAlarm(alarm.id);
                    }}
                    className="p-2.5 rounded-xl bg-black border border-slate-900 text-slate-500 hover:text-red-400 hover:border-red-950/50 hover:bg-red-950/20 active:scale-90 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Delete Alarm"
                    id={`alarm-delete-btn-${alarm.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Toast Notification Banner */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-[10000] pointer-events-none"
            id="alarm-tab-error-toast"
          >
            <div className="bg-slate-900/95 border border-red-500/50 text-white rounded-2xl p-4 shadow-2xl flex items-start gap-3 backdrop-blur-md pointer-events-auto">
              <div className="p-1.5 rounded-lg bg-red-950/50 border border-red-500/30 text-red-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-red-400">System Safeguard</p>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed font-medium">{errorMessage}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
