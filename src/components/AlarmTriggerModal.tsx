import React, { useState, useEffect } from 'react';
import { Alarm, Theme } from '../types';
import { Bell, Volume2, ShieldAlert, Sparkles, Check, Clock } from 'lucide-react';
import { synth } from '../utils/synth';
import { motion, AnimatePresence } from 'motion/react';
import haptics from '../utils/haptics';

interface AlarmTriggerModalProps {
  alarm: Alarm;
  onDismiss: () => void;
  onSnooze: () => void;
  theme: Theme;
}

export default function AlarmTriggerModal({
  alarm,
  onDismiss,
  onSnooze,
  theme,
}: AlarmTriggerModalProps) {
  const [pulseCount, setPulseCount] = useState(0);

  // Sound triggering loop on mount
  useEffect(() => {
    const soundId = alarm.soundId || 'cosmic-resonance';
    const volume = (alarm.soundVolume ?? 80) / 100;
    const gradual = alarm.gradualUp ?? true;
    synth.startAlarmSound(soundId, volume, gradual, alarm.customDataUrl);
    
    // Set up vibration profile loop
    let vibInterval: number | null = null;
    const vibType = alarm.vibrationPattern || 'heartbeat';

    if (vibType !== 'none') {
      const runVibration = () => {
        if (vibType === 'gentle') {
          navigator.vibrate?.(150);
        } else if (vibType === 'heartbeat') {
          navigator.vibrate?.([80, 80, 150]);
        } else if (vibType === 'energetic') {
          navigator.vibrate?.([400, 200, 400]);
        } else if (vibType === 'military') {
          navigator.vibrate?.([150, 100, 150, 100, 300]);
        }
      };

      runVibration();
      vibInterval = window.setInterval(runVibration, 2500);
    }

    // Gentle pulsing effect interval
    const pulseTimer = setInterval(() => {
      setPulseCount((prev) => prev + 1);
    }, 1500);

    return () => {
      synth.stopAlarmSound();
      if (vibInterval) {
        clearInterval(vibInterval);
      }
      clearInterval(pulseTimer);
    };
  }, [alarm]);

  const handleSnoozeClick = () => {
    haptics.success();
    synth.playClick();
    onSnooze();
  };

  const handleDismissClick = () => {
    haptics.heavy();
    synth.playSuccessSound();
    onDismiss();
  };

  return (
    <div
      id="alarm-trigger-overlay"
      className="fixed inset-0 bg-slate-950 flex flex-col justify-between p-6 z-[120] select-none text-white overflow-hidden"
    >
      {/* Immersive Breathing Ambient Glow Background */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none z-0">
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.15, 0.35, 0.15],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={`w-[500px] h-[500px] rounded-full bg-${theme.primary}/20 filter blur-[80px] absolute`}
        />
        <motion.div
          animate={{
            scale: [1.1, 0.9, 1.1],
            opacity: [0.1, 0.25, 0.1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-[400px] h-[400px] rounded-full bg-indigo-500/10 filter blur-[60px] absolute"
        />
      </div>

      {/* Top Section - Status & Icon */}
      <div className="text-center space-y-4 z-10 pt-10" id="alarm-trigger-header">
        <motion.div
          animate={{
            scale: [1, 1.06, 1],
            boxShadow: [
              "0 0 0 0px rgba(239, 68, 68, 0.2)",
              "0 0 0 15px rgba(239, 68, 68, 0)",
              "0 0 0 0px rgba(239, 68, 68, 0)",
            ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-16 h-16 bg-red-500/15 border border-red-500/35 rounded-full flex items-center justify-center mx-auto"
        >
          <Bell className="w-8 h-8 text-red-500" />
        </motion.div>
        
        <div className="space-y-1">
          <p className="text-xs font-bold text-red-400 uppercase tracking-widest">Alarm Active</p>
          <p className="text-sm font-semibold tracking-wider text-slate-300 capitalize bg-slate-900/60 py-1.5 px-5 rounded-full border border-slate-800/80 inline-block mt-1">
            🔔 {alarm.label}
          </p>
        </div>
      </div>

      {/* Middle Section - Big elegant ticking clock face */}
      <div className="flex-1 flex flex-col items-center justify-center z-10" id="alarm-trigger-clock">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 100, damping: 15 }}
          className="text-center space-y-2"
        >
          <h1 className="text-7xl sm:text-8xl font-black font-mono tracking-tighter text-white uppercase drop-shadow-xl select-all select-none">
            {alarm.time}
          </h1>
          <div className="flex items-center justify-center gap-1 text-slate-400 text-xs font-bold tracking-wider uppercase">
            <Clock className="w-3.5 h-3.5 text-slate-500" /> Active Schedule
          </div>
        </motion.div>
      </div>

      {/* Bottom Section - Premium controls (Snooze & Dismiss) */}
      <div className="max-w-md w-full mx-auto z-10 space-y-4 pb-10" id="alarm-trigger-controls">
        {/* Large Premium Snooze Button (9 Minutes) */}
        {alarm.snoozeEnabled !== false && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSnoozeClick}
            className="w-full py-4.5 rounded-2xl bg-white text-slate-950 font-extrabold text-base shadow-2xl shadow-white/5 active:brightness-90 transition-all flex items-center justify-center gap-2 cursor-pointer border border-white"
            id="alarm-snooze-btn"
          >
            Snooze <span className="opacity-60 text-xs font-bold">(9 Min)</span>
          </motion.button>
        )}

        {/* Medium Dismiss Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleDismissClick}
          className={`w-full py-4 rounded-2xl font-bold text-sm border active:brightness-90 transition-all cursor-pointer ${
            alarm.snoozeEnabled === false
              ? 'bg-white text-slate-950 border-white font-extrabold text-base'
              : 'bg-slate-900/80 text-slate-200 hover:text-white border-slate-800/60'
          }`}
          id="alarm-dismiss-btn"
        >
          Dismiss Alarm
        </motion.button>
      </div>

      {/* Decorative footer support branding */}
      <div className="text-center text-[10px] text-slate-600 font-bold tracking-widest uppercase z-10 pb-4" id="alarm-trigger-footer">
        ⚡ Powered by DY Clock Supreme System
      </div>
    </div>
  );
}
