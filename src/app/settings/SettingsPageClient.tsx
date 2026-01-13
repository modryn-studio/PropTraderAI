'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Bell, Link2, Shield, Globe, Save, Loader2, Trash2, AlertTriangle } from 'lucide-react';
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteAccount = async () => {
    if (deleteConfirmEmail !== userEmail) {
      toast.error('Email does not match');
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmEmail: deleteConfirmEmail }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete account');
      }

      toast.success('Account deleted successfully');
      router.push('/');
    } catch (err) {
      console.error('Failed to delete account:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setIsDeleting(false);
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

        {/* Delete Account Section */}
        <div className="border-t border-[#b5323d]/20 pt-6">
          <h3 className="text-[#b5323d] font-semibold mb-2">Delete Account</h3>
          <p className="text-sm text-[rgba(255,255,255,0.6)] mb-4">
            Your personal information will be permanently deleted. 
            Anonymized trading patterns will be retained for research purposes.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="bg-[#b5323d]/10 border border-[#b5323d] text-[#b5323d] px-4 py-2 rounded hover:bg-[#b5323d]/20 transition-colors"
          >
            Delete My Account
          </button>
        </div>

        {/* Version */}
        <p className="text-center text-xs text-[rgba(255,255,255,0.5)] pt-6">
          PropTrader.AI v0.1.0
        </p>
      </main>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center px-4 z-50">
          <div className="card max-w-md w-full border border-[rgba(181,50,61,0.3)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[rgba(181,50,61,0.15)] flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-[#b5323d]" />
              </div>
              <div>
                <h3 className="font-mono font-bold text-white">Delete Account</h3>
                <p className="text-xs text-[rgba(255,255,255,0.5)]">This cannot be undone</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-[rgba(255,255,255,0.85)]">
                Your account and all personal data will be permanently deleted.
              </p>

              <div className="bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.3)] rounded-lg p-3">
                <p className="text-xs text-[rgba(255,255,255,0.7)]">
                  <strong className="text-white">Privacy Note:</strong> Anonymous trading patterns are retained for AI research. This data cannot identify you.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Type your email to confirm: <span className="text-[#b5323d]">{userEmail}</span>
                </label>
                <input
                  type="email"
                  value={deleteConfirmEmail}
                  onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                  placeholder={userEmail}
                  className="terminal-input w-full"
                  disabled={isDeleting}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmEmail('');
                  }}
                  disabled={isDeleting}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || deleteConfirmEmail !== userEmail}
                  className="flex-1 bg-[#b5323d] hover:bg-[#dc2626] text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Forever
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
