import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import axios from 'axios';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const payload = isRegister ? { name, email, password } : { email, password };
      
      const res = await axios.post(`http://localhost:5000${endpoint}`, payload);
      
      if (!isRegister) {
        localStorage.setItem('kanban_token', res.data.token);
        localStorage.setItem('kanban_user', JSON.stringify(res.data.user));
        navigate('/dashboard');
      } else {
        // Auto login apos registro
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', { email, password });
        localStorage.setItem('kanban_token', loginRes.data.token);
        localStorage.setItem('kanban_user', JSON.stringify(loginRes.data.user));
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ocorreu um erro inesperado.');
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
