'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle2, AlertTriangle, Info, CheckCheck, X } from 'lucide-react';
import ApiService from '@/services/apiService';
import socketClient from '@/utils/socket';
import { useToast } from '@/context/ToastContext';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const fetchNotifications = async () => {
    try {
      const res = await ApiService.getNotifications();
      if (res) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (e) {
      console.warn('Could not fetch notifications');
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Listen to real-time WebSockets notifications (notification:new event)
    const unsubscribe = socketClient.onNewNotification((payload: any) => {
      if (!payload) return;

      const newNotif: NotificationItem = {
        id: payload.id || `notif_${Date.now()}`,
        title: payload.title || 'System Notification',
        message: payload.message || '',
        type: payload.type || 'info',
        read: false,
        createdAt: payload.timestamp || payload.createdAt || new Date().toISOString(),
      };

      setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
      setUnreadCount((prev) => prev + 1);

      // Trigger user toast feedback on background notification
      if (payload.type === 'error') {
        toast.error(`${payload.title}: ${payload.message}`);
      } else if (payload.type === 'success') {
        toast.success(`${payload.title}: ${payload.message}`);
      } else {
        toast.info(`${payload.title}: ${payload.message}`);
      }
    });

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await ApiService.markNotificationRead(id);
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await ApiService.markAllNotificationsRead();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View Notifications"
        title="Notifications"
        className="relative group h-10 w-10 rounded-xl bg-[var(--bg-input)] hover:bg-[#2563EB]/10 border border-[var(--border-color)] hover:border-[#2563EB]/30 text-[var(--text-primary)] transition-all active:scale-95 shadow-xs cursor-pointer flex items-center justify-center"
      >
        <Bell className="h-4.5 w-4.5 text-[var(--text-primary)] group-hover:rotate-12 transition-transform duration-300" />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white shadow-md animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-85 sm:w-[410px] rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl z-50 overflow-hidden animate-fadeIn backdrop-blur-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-card)]">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-extrabold text-[var(--text-primary)]">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="px-3 py-1.5 text-xs text-[#2563EB] dark:text-[#60A5FA] bg-[#2563EB]/10 hover:bg-[#2563EB]/20 border border-[#2563EB]/20 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs active:scale-95"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Mark all read</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-xl bg-[var(--bg-input)] hover:bg-rose-500/10 border border-[var(--border-color)] hover:border-rose-500/30 text-[var(--text-primary)] hover:text-rose-500 transition-all cursor-pointer flex items-center justify-center group shadow-xs"
                title="Close notifications"
              >
                <X className="h-4 w-4 transition-transform group-hover:scale-110" />
              </button>
            </div>
          </div>

          {/* List Body */}
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] mx-auto mb-3 shadow-xs">
                  <Bell className="h-6 w-6" />
                </div>
                <p className="text-sm font-extrabold text-[var(--text-primary)]">No notifications yet</p>
                <p className="text-xs text-[var(--text-secondary)] font-medium max-w-xs mx-auto">
                  Post dispatch updates, BullMQ queue tasks, and AI compactor alerts will appear here.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isError = item.type === 'error';
                const isSuccess = item.type === 'success';
                const isWarning = item.type === 'warning';

                return (
                  <div
                    key={item.id}
                    onClick={() => !item.read && handleMarkAsRead(item.id)}
                    className={`p-4 transition-all duration-200 flex items-start gap-3.5 cursor-pointer border-b border-[var(--border-color)] ${
                      !item.read 
                        ? 'bg-[#2563EB]/5 hover:bg-[#2563EB]/10 border-l-4 border-l-[#2563EB]' 
                        : 'hover:bg-[var(--bg-input)]/60 opacity-80'
                    }`}
                  >
                    {/* Icon Badge */}
                    <div className="mt-0.5 shrink-0">
                      {isSuccess && (
                        <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      )}
                      {isError && (
                        <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                      )}
                      {isWarning && (
                        <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                      )}
                      {!isSuccess && !isError && !isWarning && (
                        <div className="p-2 bg-[#2563EB]/10 text-[#2563EB] rounded-xl border border-[#2563EB]/20">
                          <Info className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    {/* Notification Message Content */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-extrabold ${!item.read ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                          {item.title}
                        </span>
                        {!item.read && (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] shrink-0 shadow-xs shadow-blue-500 animate-pulse" />
                        )}
                      </div>

                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-normal">{item.message}</p>

                      <span className="text-[11px] text-[var(--text-secondary)] block font-semibold opacity-75 mt-1">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-5 py-3 border-t border-[var(--border-color)] bg-[var(--bg-input)]/40 text-center text-xs text-[var(--text-secondary)] font-semibold">
            Real-time WebSocket Push Active
          </div>
        </div>
      )}
    </div>
  );
}
