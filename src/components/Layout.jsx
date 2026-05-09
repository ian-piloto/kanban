import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { LayoutDashboard, KanbanSquare, Settings, CheckSquare, Bell, UserCircle, LogOut } from 'lucide-react';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default function Layout() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
          id: currentUser.uid,
          name: currentUser.displayName || 'Usuário',
          email: currentUser.email,
          avatar_url: currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.displayName || 'U')}&backgroundColor=0f172a&textColor=f8fafc`
        });
      } else {
        setUser(null);
        navigate('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  if (loading) return <div className="min-h-screen bg-dark-bg flex items-center justify-center text-white">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const navItemClass = (path) => `
    flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium
    ${location.pathname.startsWith(path) 
      ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
      : 'text-dark-muted hover:bg-dark-card hover:text-white border border-transparent'}
  `;

  return (
    <div className="flex min-h-screen text-dark-text w-full bg-dark-bg">
      {/* Sidebar (Desktop) */}
      <aside className="w-64 glass hidden md:flex flex-col border-r border-dark-border shadow-2xl relative z-40 bg-dark-bg/80">
        <div className="p-6">
           <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-gradient-to-tr from-brand-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
                 <CheckSquare className="text-white w-6 h-6" />
              </div>
              <span className="font-bold text-2xl tracking-tight text-dark-text">SyncBoard</span>
           </div>

           <div className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-3 px-2">Menu Principal</div>
           <nav className="flex flex-col gap-2">
             <Link to="/dashboard" className={navItemClass('/dashboard')}>
               <LayoutDashboard className="w-5 h-5" />
               <span>Início</span>
             </Link>
             <Link to="/board" className={navItemClass('/board')}>
               <KanbanSquare className="w-5 h-5" />
               <span>Minhas Tarefas</span>
             </Link>
             <Link to="/categorias" className={navItemClass('/categorias')}>
               <CheckSquare className="w-5 h-5" />
               <span>Categorias</span>
             </Link>
             <Link to="/settings" className={navItemClass('/settings')}>
               <Settings className="w-5 h-5" />
               <span>Configurações</span>
             </Link>
           </nav>
        </div>

        {/* User Card no Rodapé */}
        <div className="mt-auto p-4 border-t border-dark-border">
           <div className="bg-dark-card/50 rounded-2xl p-4 border border-dark-border/80 flex items-center gap-3 group relative cursor-pointer hover:border-brand-500/50 transition-colors">
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-dark-border">
                 {user?.avatar_url ? (
                   <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                 ) : (
                   <UserCircle className="w-full h-full text-dark-muted" />
                 )}
              </div>
              <div className="flex-1 overflow-hidden">
                 <p className="text-dark-text font-medium text-sm truncate">{user?.name}</p>
                 <button onClick={handleLogout} className="text-xs text-dark-muted hover:text-red-400 flex items-center gap-1 mt-0.5 transition-colors">
                   <LogOut className="w-3 h-3" /> Sair da conta
                 </button>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
         {/* Mobile Header */}
         <header className="md:hidden glass h-16 border-b border-dark-border flex items-center justify-between px-4 sticky top-0 z-40">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
                 <CheckSquare className="text-white w-4 h-4" />
               </div>
               <span className="font-bold text-lg text-dark-text">SyncBoard</span>
            </div>
            <button onClick={handleLogout} className="p-2 text-dark-muted hover:text-red-400">
               <LogOut className="w-5 h-5" />
            </button>
         </header>

         {/* Content Wrapper */}
         <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-10">
            <Outlet />
         </div>
      </main>
    </div>
  );
}
