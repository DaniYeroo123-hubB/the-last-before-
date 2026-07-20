import React, { useState, useEffect, useRef } from 'react';
import { Lap, Theme } from '../types';
import { Play, Pause, RotateCcw, Flag, Timer } from 'lucide-react';
import { synth } from '../utils/synth';
import haptics from '../utils/haptics';
import { useDateTimeSettings } from '../utils/settingsContext';
import { getSpringTransition, getButtonMotion } from '../utils/motion';
import { motion } from 'motion/react';

interface StopwatchTabProps {
  theme: Theme;
  onStartStopwatch?: () => void;
  onLapRecorded?: (stopwatchSeconds: number) => void;
}

export default function StopwatchTab({ theme, onStartStopwatch, onLapRecorded }: StopwatchTabProps) {
  const { settings } = useDateTimeSettings();
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0); // in milliseconds
  const [laps, setLaps] = useState<Lap[]>([]);

  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);

  // Precision animation frame updater
  const updateTimer = (timestamp: number) => {
    if (previousTimeRef.current !== null) {
      const delta = timestamp - previousTimeRef.current;
      setTime((prevTime) => prevTime + delta);
    }
    previousTimeRef.current = timestamp;
    requestRef.current = requestAnimationFrame(updateTimer);
  };

  useEffect(() => {
    if (isRunning) {
      previousTimeRef.current = null; // Reset delta anchor on resume
      requestRef.current = requestAnimationFrame(updateTimer);
    } else {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isRunning]);

  const handleStartPause = () => {
    synth.init();
    synth.playTick();
    haptics.medium();
    const nextRunning = !isRunning;
    setIsRunning(nextRunning);
    if (nextRunning && onStartStopwatch) {
      onStartStopwatch();
    }
  };

  const handleReset = () => {
    synth.init();
    synth.playTick();
    haptics.heavy();
    setIsRunning(false);
    setTime(0);
    setLaps([]);
  };

  const handleLap = () => {
    if (!isRunning) return;
    synth.playTick();
    haptics.tick();

    const currentTotal = time;
    const lapNumber = laps.length + 1;

    
    // Calculate lap duration: current split minus previous lap split
    const previousTotal = laps.length > 0 ? laps[laps.length - 1].splitTime : 0;
    const lapTime = currentTotal - previousTotal;

    const newLap: Lap = {
      lapNumber,
      lapTime,
      splitTime: currentTotal,
    };

    const updatedLaps = [...laps, newLap];
    synth.playLapRing();
    
    // Calculate best and worst laps dynamically
    if (updatedLaps.length > 1) {
      let minIdx = 0;
      let maxIdx = 0;
      let minVal = updatedLaps[0].lapTime;
      let maxVal = updatedLaps[0].lapTime;

      updatedLaps.forEach((lap, index) => {
        lap.isBest = false;
        lap.isWorst = false;
        if (lap.lapTime < minVal) {
          minVal = lap.lapTime;
          minIdx = index;
        }
        if (lap.lapTime > maxVal) {
          maxVal = lap.lapTime;
          maxIdx = index;
        }
      });

      updatedLaps[minIdx].isBest = true;
      updatedLaps[maxIdx].isWorst = true;
    }

    if (onLapRecorded) {
      onLapRecorded(time / 1000);
    }

    setLaps(updatedLaps);
  };

  // Format milliseconds into MM:SS.CC
  const formatTime = (totalMs: number) => {
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const centiseconds = Math.floor((totalMs % 1000) / 10);

    const pad = (num: number, size: number = 2) => num.toString().padStart(size, '0');

    return {
      minutes: pad(minutes),
      seconds: pad(seconds),
      centiseconds: pad(centiseconds),
    };
  };

  const formatted = formatTime(time);

  // Compute second ticks for circular ring (maps 0-100% of second)
  const secondsProgress = (time % 1000) / 10; // 0 to 100
  const minutesProgress = (time % 60000) / 600; // 0 to 100 for 1 minute

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-fade-in" id="stopwatch-tab-wrapper">
      
      {/* Visual Ring and Counter Display */}
      <div className={`p-8 rounded-2xl ${theme.cardBg} border ${theme.border} flex flex-col items-center relative overflow-hidden`} id="stopwatch-counter-panel">
        
        {/* Dynamic ticking circle */}
        <div className="relative w-56 h-56 flex items-center justify-center rounded-full bg-slate-950 border-4 border-slate-900 shadow-inner">
          {/* Outer Ring Progress SVG */}
          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
            {/* Milliseconds Sweep Ring */}
            <circle
              cx="112"
              cy="112"
              r="104"
              className={`stroke-slate-900`}
              strokeWidth="3"
              fill="transparent"
            />
            <circle
              cx="112"
              cy="112"
              r="104"
              className="transition-all duration-75"
              style={{
                stroke: isRunning ? `var(--color-${theme.primary})` : '#64748b',
                strokeDasharray: '653',
                strokeDashoffset: `${653 - (653 * secondsProgress) / 100}`,
                filter: isRunning ? 'drop-shadow(0 0 6px currentColor)' : 'none',
              }}
              strokeWidth="4"
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Core Numbers - Monospace tabular numbers */}
          <div className="flex flex-col items-center text-center z-10" id="stopwatch-digits-container">
            <Timer className={`w-6 h-6 mb-1 text-${theme.primary}`} />
            <div className="flex items-baseline font-mono select-all">
              <span className="text-4xl font-extrabold text-white tracking-tight">{formatted.minutes}</span>
              <span className="text-2xl font-bold text-slate-500 mx-1">:</span>
              <span className="text-4xl font-extrabold text-white tracking-tight">{formatted.seconds}</span>
              <span className="text-2xl font-bold text-slate-500 mx-1">.</span>
              <span className={`text-3xl font-semibold text-${theme.primary} tracking-tight min-w-[42px]`}>{formatted.centiseconds}</span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mt-1">
              {isRunning ? 'Ticking' : 'Paused'}
            </span>
          </div>
        </div>

        {/* Stopwatch Buttons */}
        <div className="flex justify-center items-center gap-6 mt-8" id="stopwatch-controls">
          {/* Reset / Lap Button */}
          <motion.button
            onClick={isRunning ? handleLap : handleReset}
            disabled={time === 0}
            {...getButtonMotion(settings.animationIntensity)}
            transition={getSpringTransition(settings.animationIntensity)}
            className={`w-14 h-14 rounded-full border border-slate-850 flex items-center justify-center bg-slate-950 text-slate-400 hover:border-slate-700 disabled:opacity-40 disabled:scale-100 disabled:pointer-events-none cursor-pointer shadow-md`}
            title={isRunning ? 'Record Lap' : 'Reset Stopwatch'}
            id="stopwatch-alt-btn"
          >
            {isRunning ? (
              <Flag className="w-5 h-5 text-indigo-400" />
            ) : (
              <RotateCcw className="w-5 h-5 text-slate-400" />
            )}
          </motion.button>

          {/* Primary Play/Pause Button */}
          <motion.button
            onClick={handleStartPause}
            {...getButtonMotion(settings.animationIntensity)}
            transition={getSpringTransition(settings.animationIntensity)}
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl bg-gradient-to-tr ${theme.gradient} text-black font-extrabold cursor-pointer`}
            title={isRunning ? 'Pause Stopwatch' : 'Start Stopwatch'}
            id="stopwatch-play-btn"
          >
            {isRunning ? (
              <Pause className="w-8 h-8 text-black fill-black" />
            ) : (
              <Play className="w-8 h-8 text-black fill-black ml-1" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Lap Times Panel */}
      {laps.length > 0 && (
        <div className={`p-5 rounded-2xl ${theme.cardBg} border ${theme.border} overflow-hidden`} id="laps-panel">
          <div className="flex justify-between items-center mb-4 border-b border-slate-900 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Flag className="w-4 h-4 text-indigo-400" /> Lap History
            </h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-950 px-2 py-1 rounded-md">
              {laps.length} total laps recorded
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 pr-1" id="laps-list-scroller">
            {laps.slice().reverse().map((lap) => {
              const fLap = formatTime(lap.lapTime);
              const fSplit = formatTime(lap.splitTime);
              
              let badgeColor = 'text-slate-400 bg-slate-950 border-slate-900';
              if (lap.isBest) badgeColor = 'text-emerald-400 bg-emerald-950/40 border-emerald-900/50';
              if (lap.isWorst) badgeColor = 'text-rose-400 bg-rose-950/40 border-rose-900/50';

              return (
                <motion.div
                  key={lap.lapNumber}
                  initial={{ opacity: 0, y: -15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={getSpringTransition(settings.animationIntensity)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    lap.isBest 
                      ? 'bg-emerald-950/20 border-emerald-900/40 shadow-inner' 
                      : lap.isWorst 
                        ? 'bg-rose-950/10 border-rose-900/30' 
                        : 'bg-slate-950/60 border-slate-900'
                  }`}
                  id={`lap-item-${lap.lapNumber}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] border ${badgeColor}`}>
                      {lap.lapNumber}
                    </span>
                    <div>
                      <p className="font-semibold text-white font-mono">
                        {fLap.minutes}:{fLap.seconds}.{fLap.centiseconds}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Lap Duration</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-slate-400 font-mono">
                      {fSplit.minutes}:{fSplit.seconds}.{fSplit.centiseconds}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Cumulative Split</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
