import { useState, useEffect } from 'react';
import { Moon, Sun, LogOut, User, Bell, Shield } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const user = auth.currentUser;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white tracking-tight">Configurações</h1>
        <p className="text-dark-muted mt-1 text-sm">Personalize sua experiência no SyncBoard</p>
      </div>

      <div className="grid gap-6">
        {/* Seção de Perfil Rápido */}
        <div className="glass rounded-3xl p-6 border border-dark-border flex items-center gap-6">
           <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-brand-500/30">
              <img 
                src={user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.displayName || 'U'}`} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
           </div>
           <div>
              <h2 className="text-xl font-bold text-white">{user?.displayName || 'Usuário'}</h2>
              <p className="text-dark-muted text-sm">{user?.email}</p>
              <div className="mt-2 flex gap-2">
                 <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">Plano Gratuito</span>
                 <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Status: Ativo</span>
              </div>
           </div>
        </div>

        {/* Aparência */}
        <div className="glass rounded-3xl border border-dark-border overflow-hidden">
          <div className="p-6 border-b border-dark-border/50 bg-dark-card/30">
             <div className="flex items-center gap-3">
                <Sun className="text-brand-400 w-5 h-5" />
                <h3 className="font-bold text-white">Aparência e Estilo</h3>
             </div>
          </div>
          <div className="p-6 space-y-6">
             <div className="flex items-center justify-between">
                <div>
                   <p className="text-white font-medium">Tema do Sistema</p>
                   <p className="text-dark-muted text-xs mt-0.5">Alterne entre os modos claro e escuro</p>
                </div>
                <button 
                  onClick={toggleTheme}
                  className="flex items-center gap-2 bg-dark-bg border border-dark-border rounded-xl p-1.5 transition-all hover:border-brand-500/50"
                >
                   <div className={`p-2 rounded-lg transition-all ${theme === 'light' ? 'bg-brand-500 text-white shadow-lg' : 'text-dark-muted'}`}>
                      <Sun className="w-4 h-4" />
                   </div>
                   <div className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'bg-brand-500 text-white shadow-lg' : 'text-dark-muted'}`}>
                      <Moon className="w-4 h-4" />
                   </div>
                </button>
             </div>
          </div>
        </div>

        {/* Conta e Segurança */}
        <div className="glass rounded-3xl border border-dark-border overflow-hidden">
          <div className="p-6 border-b border-dark-border/50 bg-dark-card/30">
             <div className="flex items-center gap-3">
                <Shield className="text-brand-400 w-5 h-5" />
                <h3 className="font-bold text-white">Conta e Segurança</h3>
             </div>
          </div>
          <div className="p-6 space-y-2">
             <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-dark-card/50 transition-colors group">
                <div className="flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                      <User className="w-4 h-4" />
                   </div>
                   <span className="text-sm font-medium text-white group-hover:text-brand-400 transition-colors">Editar Informações do Perfil</span>
                </div>
                <div className="text-dark-muted text-xs">Acessar</div>
             </button>
             <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-dark-card/50 transition-colors group">
                <div className="flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                      <Bell className="w-4 h-4" />
                   </div>
                   <span className="text-sm font-medium text-white group-hover:text-brand-400 transition-colors">Configurações de Notificação</span>
                </div>
                <div className="text-dark-muted text-xs">Ativado</div>
             </button>
          </div>
        </div>

        {/* Perigo */}
        <div className="glass rounded-3xl border border-red-500/10 overflow-hidden">
           <div className="p-6 flex items-center justify-between">
              <div>
                 <p className="text-white font-medium">Finalizar Sessão</p>
                 <p className="text-dark-muted text-xs mt-0.5">Saia da sua conta com segurança</p>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2.5 rounded-xl font-semibold transition-all"
              >
                <LogOut className="w-4 h-4" /> Sair Agora
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
