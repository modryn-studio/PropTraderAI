import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Settings, ArrowLeft, User, Bell, Link2, Shield } from 'lucide-react';

export default async function SettingsPage() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect('/auth/login');
  }

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
    <div className="min-h-screen bg-bg-primary pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-bg-primary/80 backdrop-blur-xl border-b border-line-subtle">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link 
            href="/dashboard" 
            className="p-2 -ml-2 text-content-tertiary hover:text-content-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="font-display font-bold text-lg">Settings</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 space-y-6">
        {/* User Info */}
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-accent-cyan/10 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-accent-cyan" />
            </div>
            <div>
              <p className="font-display font-bold">{user.email}</p>
              <p className="text-xs text-content-tertiary">Free Plan</p>
            </div>
          </div>
        </div>

        {/* Settings Groups */}
        {settingsGroups.map((group) => (
          <div key={group.title} className="card">
            <h3 className="font-display font-bold text-sm text-content-tertiary mb-4">
              {group.title}
            </h3>
            <div className="space-y-3">
              {group.items.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-bg-tertiary transition-colors cursor-pointer"
                >
                  <item.icon className="w-5 h-5 text-content-tertiary" />
                  <div className="flex-1">
                    <p className="text-sm">{item.label}</p>
                    <p className="text-xs text-content-tertiary">{item.description}</p>
                  </div>
                  {item.comingSoon && (
                    <span className="text-xs text-accent-purple bg-accent-purple/10 px-2 py-1 rounded">
                      Soon
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Version */}
        <p className="text-center text-xs text-content-tertiary">
          PropTrader.AI v0.1.0
        </p>
      </main>
    </div>
  );
}
