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
        className="relative group p-2.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 text-slate-200 transition-all duration-300 active:scale-95 shadow-sm cursor-pointer"
      >
        <Bell className="h-5 w-5 text-slate-300 group-hover:rotate-12 transition-transform duration-300" />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white shadow-md animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden animate-fadeIn backdrop-blur-3xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-955/80">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-100">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List Body */}
          <div className="max-h-96 overflow-y-auto custom-scrollbar divide-y divide-slate-850">
            {notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Bell className="h-8 w-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-bold">No notifications yet</p>
                <p className="text-[11px] text-slate-500">Post updates and system alerts will appear here.</p>
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
                    className={`p-4 transition-colors flex items-start gap-3 cursor-pointer ${
                      !item.read ? 'bg-indigo-950/20 hover:bg-indigo-950/30' : 'hover:bg-slate-850/40 opacity-75'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isSuccess && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                      {isError && <AlertTriangle className="h-5 w-5 text-rose-400" />}
                      {isWarning && <AlertTriangle className="h-5 w-5 text-amber-400" />}
                      {!isSuccess && !isError && !isWarning && <Info className="h-5 w-5 text-indigo-400" />}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-extrabold ${!item.read ? 'text-slate-100' : 'text-slate-300'}`}>
                          {item.title}
                        </span>
                        {!item.read && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />}
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed font-normal">{item.message}</p>

                      <span className="text-[10px] text-slate-500 block font-mono">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
