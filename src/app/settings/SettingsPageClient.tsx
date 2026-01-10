'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Bell, Link2, Shield, Globe, Save, Loader2 } from 'lucide-react';
import TimezonePicker from '@/components/ui/TimezonePicker';
import { createClient } from '@/lib/supabase/client';
import type { TRADER_TIMEZONES } from '@/lib/utils/timezone';
import { toast } from 'sonner';

interface Profile {
  timezone: string | null;
}

export default function SettingsPageClient({ 
  userEmail, 
  initialProfile 
}: { 
  userEmail: string;
  initialProfile: Profile;
}) {
  const router = useRouter();
  const [timezone, setTimezone] = useState<keyof typeof TRADER_TIMEZONES | null>(
    initialProfile.timezone as keyof typeof TRADER_TIMEZONES | null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setHasChanges(timezone !== initialProfile.timezone);
  }, [timezone, initialProfile.timezone]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ timezone })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Timezone preference saved');
      setHasChanges(false);
      router.refresh();
    } catch (err) {
      console.error('Failed to save timezone:', err);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const settingsGroups = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Profile', description: 'Manage your account details', comingSoon: true },
        { icon: Bell, label: 'Notifications', description: 'Alert preferences', comingSoon: true },
      ],
    },
    {
      title: 'Connections',
      items: [
        { icon: Link2, label: 'Tradovate', description: 'Manage broker connection', comingSoon: true },
      ],
    },
    {
      title: 'Protection',
      items: [
        { icon: Shield, label: 'Risk Settings', description: 'Daily limits and drawdown rules', comingSoon: true },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      {/* Header */}
      <header className="app-header">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link 
            href="/dashboard" 
            className="p-2 -ml-2 text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="font-mono font-bold text-lg text-white">Settings</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 space-y-6">
        {/* User Info */}
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[rgba(0,255,209,0.1)] flex items-center justify-center">
              <User className="w-6 h-6 text-[#00FFD1]" />
            </div>
            <div>
              <p className="font-mono font-bold text-white">{userEmail}</p>
              <p className="text-xs text-[rgba(255,255,255,0.5)]">Free Plan</p>
            </div>
          </div>
        </div>

        {/* Timezone Preference */}
        <div className="card">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-[rgba(59,130,246,0.1)] flex items-center justify-center rounded-lg flex-shrink-0">
              <Globe className="w-5 h-5 text-[#3b82f6]" />
            </div>
            <div className="flex-1">
              <h3 className="font-mono font-bold text-white mb-1">
                Timezone Preference
              </h3>
              <p className="text-sm text-[rgba(255,255,255,0.5)] mb-4">
                Your timezone for strategy time conversions. Auto-detect will infer from your conversation.
              </p>
              
              <TimezonePicker
                value={timezone}
                onChange={setTimezone}
                disabled={isSaving}
                showAutoDetect={true}
              />

              {hasChanges && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-[rgba(255,255,255,0.5)]">
                    You have unsaved changes
                  </p>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn-primary flex items-center gap-2 text-sm py-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Settings Groups */}
        {settingsGroups.map((group) => (
          <div key={group.title} className="card">
            <h3 className="font-mono font-bold text-sm text-[rgba(255,255,255,0.5)] mb-4">
              {group.title}
            </h3>
            <div className="space-y-3">
              {group.items.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-[#121212] transition-colors cursor-pointer"
                >
                  <item.icon className="w-5 h-5 text-[rgba(255,255,255,0.5)]" />
                  <div className="flex-1">
                    <p className="text-sm text-white">{item.label}</p>
                    <p className="text-xs text-[rgba(255,255,255,0.5)]">{item.description}</p>
                  </div>
                  {item.comingSoon && (
                    <span className="text-xs text-[#8b5cf6] bg-[rgba(139,92,246,0.1)] px-2 py-1 rounded">
                      Soon
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Version */}
        <p className="text-center text-xs text-[rgba(255,255,255,0.5)]">
          PropTrader.AI v0.1.0
        </p>
      </main>
    </div>
  );
}
