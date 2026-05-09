import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Verifica se o usuário já existe no Firestore, se não, cria
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          name: user.displayName,
          email: user.email,
          avatar_url: user.photoURL,
          created_at: new Date().toISOString()
        });
      }
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Erro ao entrar com Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Atualiza o nome no Firebase Auth
        await updateProfile(user, { displayName: name });
        
        // Cria o documento do usuário no Firestore para dados extras (opcional)
        await setDoc(doc(db, 'users', user.uid), {
          name,
          email,
          avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0f172a&textColor=f8fafc`,
          created_at: new Date().toISOString()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      
      // O Firebase mantém a sessão, mas se quiser manter compatibilidade com o código atual:
      // Redireciona e o Layout lidará com a verificação de auth
      navigate('/dashboard');
      
    } catch (err) {
      console.error(err);
      let msg = 'Ocorreu um erro inesperado.';
      if (err.code === 'auth/email-already-in-use') msg = 'Este e-mail já está em uso.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') msg = 'Credenciais inválidas.';
      if (err.code === 'auth/weak-password') msg = 'A senha deve ter pelo menos 6 caracteres.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 w-full h-full">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-600/20 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px]"></div>
      </div>
      
      <div className="glass w-full max-w-md rounded-2xl p-8 z-10 shadow-2xl border border-dark-border/50">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-brand-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30 mb-4 transition-transform hover:scale-105 duration-300">
            <LayoutDashboard className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">SyncBoard</h1>
          <p className="text-dark-muted mt-2 text-sm">Gerencie suas tarefas e colabore</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-dark-muted ml-1">Nome</label>
              <input 
                type="text" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-dark-bg/50 border border-dark-border text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all placeholder:text-dark-muted/50"
                placeholder="João Silva"
              />
            </div>
          )}
          
          <div className="space-y-1">
            <label className="text-sm font-medium text-dark-muted ml-1">Email</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-dark-bg/50 border border-dark-border text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all placeholder:text-dark-muted/50"
              placeholder="voce@exemplo.com"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-medium text-dark-muted ml-1">Senha</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-dark-bg/50 border border-dark-border text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all placeholder:text-dark-muted/50"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl px-4 py-3 mt-4 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-dark-bg disabled:opacity-50"
          >
            {loading ? 'Aguarde...' : (isRegister ? 'Criar Conta' : 'Entrar')}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-dark-border/50"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-dark-bg px-2 text-dark-muted">Ou continue com</span>
          </div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded-xl px-4 py-3 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Entrar com Google
        </button>

        <div className="mt-6 text-center">
          <p className="text-sm text-dark-muted">
            {isRegister ? 'Já tem uma conta?' : 'Ainda não tem acesso?'}
            <button 
              onClick={() => { setIsRegister(!isRegister); setError(''); }} 
              className="text-brand-400 hover:text-brand-300 ml-2 font-medium transition-colors"
            >
              {isRegister ? 'Faça login' : 'Registre-se'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
