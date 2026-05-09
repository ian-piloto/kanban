import { useNavigate } from 'react-router-dom';
import { UserCircle, LogOut, Mail, Hash } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export default function Profile() {
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  if (!currentUser) return null;

  const user = {
    name: currentUser.displayName || 'Usuário',
    email: currentUser.email,
    id: currentUser.uid,
    avatar_url: currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.displayName || 'U')}&backgroundColor=0f172a&textColor=f8fafc`
  };

  return (
    <div className="flex-1 flex items-center justify-center py-10 w-full h-full relative">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[30%] h-[40%] rounded-full bg-brand-500/10 blur-[100px]"></div>
        <div className="absolute bottom-[20%] right-[20%] w-[25%] h-[35%] rounded-full bg-purple-500/10 blur-[100px]"></div>
      </div>
      
      <div className="glass w-full max-w-lg rounded-3xl p-8 z-10 shadow-2xl border border-dark-border relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-brand-600/40 to-purple-600/40 border-b border-dark-border/50"></div>
        
        <div className="relative pt-12 flex flex-col items-center">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-dark-bg bg-dark-card shadow-2xl z-10">
            {user.avatar_url ? (
               <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
               <UserCircle className="w-full h-full text-dark-muted p-2" />
            )}
          </div>
          
          <h1 className="mt-4 text-3xl font-bold text-white tracking-tight">{user.name}</h1>
          <p className="text-dark-muted font-medium mt-1">Membro Oficial</p>
        </div>

        <div className="mt-10 space-y-4">
          <div className="bg-dark-bg/60 border border-dark-border rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-brand-500/10 text-brand-400 rounded-xl">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-dark-muted">Endereço de E-mail</p>
              <p className="text-white font-medium">{user.email}</p>
            </div>
          </div>
          
          <div className="bg-dark-bg/60 border border-dark-border rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Hash className="w-6 h-6" />
            </div>
            <div>
               <p className="text-sm font-medium text-dark-muted">ID da Conta</p>
               <p className="text-white font-medium">#{user.id.substring(0, 8)}...</p>
            </div>
          </div>
        </div>

        <div className="mt-10">
           <button 
             onClick={handleLogout}
             className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-6 py-4 rounded-2xl font-semibold transition-colors"
           >
             <LogOut className="w-5 h-5" /> Sair da Conta e Finalizar Sessão
           </button>
        </div>
      </div>
    </div>
  );
}
