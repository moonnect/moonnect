/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Portfolio from '@/components/Portfolio';
import Admin from '@/components/Admin';
import { usePortfolio } from '@/hooks/use-portfolio';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { Lock } from 'lucide-react';

const ADMIN_PASSWORD = '9865';

export default function App() {
  const { data, updateData, isLoading, isSaving, provider, refreshData } = usePortfolio();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'preview'>('dashboard');

  if (isLoading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-zinc-800 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowLogin(false);
      setPassword('');
      setError(false);
      setViewMode('dashboard');
    } else {
      setError(true);
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setViewMode('dashboard');
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <AnimatePresence mode="wait">
        {isAdmin && viewMode === 'dashboard' ? (
          <motion.div
            key="admin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Admin 
              data={data} 
              onUpdate={updateData} 
              onLogout={handleLogout} 
              onGoToPreview={() => setViewMode('preview')}
              isSaving={isSaving}
              provider={provider}
              refreshData={refreshData}
            />
          </motion.div>
        ) : (
          <motion.div
            key="portfolio"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Portfolio 
              data={data} 
              onAdminClick={() => setShowLogin(true)} 
              isAdmin={isAdmin}
              onUpdate={updateData}
              onBackToDashboard={() => setViewMode('dashboard')}
              onLogout={handleLogout}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Overlay */}
      <AnimatePresence>
        {showLogin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-zinc-900 p-8 rounded-3xl border border-white/5 shadow-2xl relative"
            >
              <button 
                onClick={() => { setShowLogin(false); setError(false); }}
                className="absolute top-6 right-6 text-zinc-500 hover:text-white"
              >
                ✕
              </button>
              
              <div className="w-12 h-12 bg-violet-600 rounded-lg flex items-center justify-center mb-6">
                <Lock className="w-6 h-6 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold mb-2 text-white uppercase tracking-widest">Admin Access</h2>
              <p className="text-sm text-slate-500 mb-8 uppercase tracking-wider">Restricted area</p>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <Input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ENTER PASSWORD"
                    className={`bg-white/5 border-white/10 h-14 text-center tracking-[0.5em] text-white focus:border-violet-500 transition-colors ${error ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                    autoFocus
                  />
                  {error && <p className="text-[10px] text-red-500 font-medium pl-1 uppercase tracking-widest">Invalid password</p>}
                </div>
                <Button type="submit" className="w-full h-14 bg-violet-600 text-white hover:bg-violet-500 font-bold uppercase tracking-widest">
                  Verify
                </Button>
              </form>
              <p className="mt-8 text-[10px] text-slate-700 text-center uppercase tracking-widest">Restricted access for portfolio management only.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

