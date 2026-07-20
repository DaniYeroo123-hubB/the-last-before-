import React, { useState, useEffect, useRef } from 'react';
import { Theme } from '../types';
import { Play, Pause, RotateCcw, Hourglass, Bell, Star } from 'lucide-react';
import { synth } from '../utils/synth';
import { useDateTimeSettings } from '../utils/settingsContext';
import { getSpringTransition, getButtonMotion } from '../utils/motion';
import { motion, AnimatePresence } from 'motion/react';
import haptics from '../utils/haptics';

interface TimerTabProps {
  theme: Theme;
  onTimerCompleted?: (minutes: number) => void;
}

const PRESETS = [
  { label: '1 Min', value: 60 },
  { label: '3 Min', value: 180 },
  { label: '5 Min', value: 300 },
  { label: '10 Min', value: 600 },
  { label: '15 Min', value: 900 },
  { label: '25 Min 🍅', value: 1500 }, // Pomodoro
  { label: '45 Min', value: 2700 },
  { label: '1 Hour', value: 3600 },
];

export default function TimerTab({ theme, onTimerCompleted }: TimerTabProps) {
  const { settings } = useDateTimeSettings();
  // Input Selection
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);

  // Core Timer State
  const [isRunning, setIsRunning] = useState(false);
  const [totalDuration, setTotalDuration] = useState(300); // in seconds
  const [timeLeft, setTimeLeft] = useState(300); // in seconds
  const [showFinishedAlert, setShowFinishedAlert] = useState(false);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    setShowFinishedAlert(true);
    synth.playTimerDoneChime();
    
    if (onTimerCompleted) {
      onTimerCompleted(Math.round(totalDuration / 60) || 1);
    }
    
    // Play complete chime every 3 seconds while alert is active
    const repeatId = window.setInterval(() => {
      if (!document.getElementById('timer-completed-modal')) {
        clearInterval(repeatId);
        return;
      }
      synth.playTimerDoneChime();
    }, 4000);
  };

  const handleStart = () => {
    synth.init();
    synth.playTick();
    const duration = hours * 3600 + minutes * 60 + seconds;
    if (duration <= 0) {
      haptics.error();
      return;
    }

    haptics.success();
    setTotalDuration(duration);
    setTimeLeft(duration);
    setIsRunning(true);
  };

  const handlePauseResume = () => {
    synth.init();
    synth.playTick();
    haptics.medium();
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    synth.init();
    synth.playTick();
    haptics.heavy();
    setIsRunning(false);
    setTimeLeft(totalDuration);
  };

  const handleCancel = () => {
    synth.init();
    synth.playTick();
    haptics.heavy();
    setIsRunning(false);
    setTimeLeft(0);
    setTotalDuration(0);
  };

  const handlePresetSelect = (durationSecs: number) => {
    synth.init();
    synth.playTick();
    haptics.success();
    setHours(Math.floor(durationSecs / 3600));
    setMinutes(Math.floor((durationSecs % 3600) / 60));
    setSeconds(durationSecs % 60);

    setTotalDuration(durationSecs);
    setTimeLeft(durationSecs);
    setIsRunning(true);
  };


  const formatTimeLeft = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;

    const pad = (num: number) => num.toString().padStart(2, '0');

    return {
      h: pad(h),
      m: pad(m),
      s: pad(s),
      hasHours: h > 0,
    };
  };

  const formatted = formatTimeLeft(timeLeft);

  // Percent Remaining for SVG Progress
  const progressPercent = totalDuration > 0 ? (timeLeft / totalDuration) * 100 : 0;
  const strokeDashoffset = totalDuration > 0 ? 565 - (565 * progressPercent) / 100 : 565;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6" id="timer-tab-wrapper">
      
      {/* Active Timer Dashboard */}
      {totalDuration > 0 && timeLeft >= 0 ? (
        <div className={`p-8 rounded-2xl ${theme.cardBg} border ${theme.border} flex flex-col items-center relative overflow-hidden`} id="timer-countdown-panel">
          
          {/* Progress Ring */}
          <div className="relative w-56 h-56 flex items-center justify-center rounded-full bg-slate-950 border-4 border-slate-900 shadow-inner">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle
                cx="112"
                cy="112"
                r="90"
                className="stroke-slate-900"
                strokeWidth="4"
                fill="transparent"
              />
              <circle
                cx="112"
                cy="112"
                r="90"
                className="transition-all duration-1000 ease-linear"
                style={{
                  stroke: isRunning ? `var(--color-${theme.primary})` : '#64748b',
                  strokeDasharray: '565',
                  strokeDashoffset: `${strokeDashoffset}`,
                  filter: isRunning ? 'drop-shadow(0 0 6px currentColor)' : 'none',
                }}
                strokeWidth="5"
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Timers Digits */}
            <div className="flex flex-col items-center text-center z-10" id="timer-digits">
              <Hourglass className={`w-5 h-5 mb-1.5 text-${theme.primary} ${isRunning ? 'animate-spin-slow' : ''}`} />
              <div className="flex items-baseline font-mono select-none">
                {formatted.hasHours && (
                  <>
                    <span className="text-3xl font-extrabold text-white tracking-tight">{formatted.h}</span>
                    <span className="text-xl font-bold text-slate-500 mx-0.5">:</span>
                  </>
                )}
                <span className="text-4.5xl font-extrabold text-white tracking-tight">{formatted.m}</span>
                <span className="text-xl font-bold text-slate-500 mx-0.5">:</span>
                <span className="text-4.5xl font-extrabold text-white tracking-tight">{formatted.s}</span>
              </div>
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 mt-1">
                {isRunning ? 'Counting Down' : 'Paused'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center items-center gap-6 mt-8" id="timer-active-controls">
            {/* Cancel Button */}
            <motion.button
              onClick={handleCancel}
              {...getButtonMotion(settings.animationIntensity)}
              transition={getSpringTransition(settings.animationIntensity)}
              className="w-14 h-14 rounded-full border border-slate-850 flex items-center justify-center bg-slate-950 text-slate-400 cursor-pointer shadow-md"
              title="Cancel Timer"
              id="timer-cancel-btn"
            >
              <RotateCcw className="w-5 h-5 text-slate-400" />
            </motion.button>

            {/* Play/Pause Button */}
            <motion.button
              onClick={handlePauseResume}
              {...getButtonMotion(settings.animationIntensity)}
              transition={getSpringTransition(settings.animationIntensity)}
              className={`w-18 h-18 rounded-full flex items-center justify-center shadow-xl bg-gradient-to-tr ${theme.gradient} text-black cursor-pointer`}
              title={isRunning ? 'Pause Timer' : 'Resume Timer'}
              id="timer-play-pause-btn"
            >
              {isRunning ? (
                <Pause className="w-7 h-7 text-black fill-black" />
              ) : (
                <Play className="w-7 h-7 text-black fill-black ml-1" />
              )}
            </motion.button>
          </div>
        </div>
      ) : (
        /* Duration Input Setup Mode */
        <div className={`p-6 rounded-2xl ${theme.cardBg} border ${theme.border} space-y-6`} id="timer-setup-panel">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <Hourglass className={`w-5 h-5 text-${theme.primary}`} /> Countdown Timer
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select a custom duration or tap one of our quick presets below to launch a countdown.
            </p>
          </div>

          {/* Scrolling Presets Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Quick Timer Presets</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" id="timer-presets-grid">
              {PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetSelect(preset.value)}
                  className="py-3 px-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-xs font-semibold text-slate-300 hover:text-white transition-all text-center active:scale-95 hover:bg-slate-900"
                  id={`preset-${preset.label}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Dial Inputs */}
          <div className="space-y-3 pt-2 border-t border-slate-900" id="timer-dials-container">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Custom Duration</h3>
            <div className="flex gap-4 items-center justify-center bg-slate-950/80 p-5 rounded-2xl border border-slate-900">
              {/* Hours dial */}
              <div className="flex flex-col items-center">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={(e) => {
                    synth.playSlider();
                    setHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)));
                  }}
                  className="w-14 text-center font-mono text-3xl font-bold bg-transparent text-white border-b border-slate-800 focus:outline-none focus:border-cyan-400"
                  id="timer-hours-input"
                />
                <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Hours</span>
              </div>

              <span className="text-2xl font-black text-slate-600 font-mono">:</span>

              {/* Minutes dial */}
              <div className="flex flex-col items-center">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => {
                    synth.playSlider();
                    setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)));
                  }}
                  className="w-14 text-center font-mono text-3xl font-bold bg-transparent text-white border-b border-slate-800 focus:outline-none focus:border-cyan-400"
                  id="timer-minutes-input"
                />
                <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Mins</span>
              </div>

              <span className="text-2xl font-black text-slate-600 font-mono">:</span>

              {/* Seconds dial */}
              <div className="flex flex-col items-center">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => {
                    synth.playSlider();
                    setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)));
                  }}
                  className="w-14 text-center font-mono text-3xl font-bold bg-transparent text-white border-b border-slate-800 focus:outline-none focus:border-cyan-400"
                  id="timer-seconds-input"
                />
                <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Secs</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={hours === 0 && minutes === 0 && seconds === 0}
            className={`w-full py-3.5 rounded-xl font-bold text-sm bg-white text-black hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 disabled:pointer-events-none shadow-lg`}
            id="timer-start-btn"
          >
            Start Countdown
          </button>
        </div>
      )}

      {/* Finished Modal overlay */}
      <AnimatePresence>
        {showFinishedAlert && (
          <div
            id="timer-completed-modal"
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-[100] animate-fade-in"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md w-full bg-slate-900 border border-slate-800/80 p-8 rounded-3xl text-center space-y-6 shadow-2xl relative overflow-hidden"
              id="timer-complete-box"
            >
              {/* Radiant back-light */}
              <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-yellow-500/20 to-transparent blur-xl pointer-events-none" />

              <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/30 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-yellow-500/10 relative">
                <Bell className="w-7 h-7 text-yellow-400 animate-bounce" />
                <div className="absolute inset-0 rounded-full border border-yellow-400/50 animate-ping" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-1.5">
                  Time's Up! <Star className="w-5 h-5 text-yellow-400 fill-yellow-500" />
                </h2>
                <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                  Your countdown timer has completed successfully.
                </p>
              </div>

              <button
                onClick={() => {
                  haptics.heavy();
                  setShowFinishedAlert(false);
                  setTotalDuration(0);
                  setTimeLeft(0);
                }}
                className="w-full py-3.5 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-extrabold text-sm shadow-xl active:scale-95 transition-all"
                id="timer-dismiss-btn"
              >
                Dismiss Timer
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
