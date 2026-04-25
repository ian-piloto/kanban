import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, CalendarDays, Plus, AlertTriangle, ArrowRight, Activity, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    total: 0, fazer: 0, fazendo: 0, feito: 0, atrasadas: 0, urgentes: 0, concluidasUltimos7Dias: 0, tarefasProximas: []
  });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [form, setForm] = useState({ title: '', description: '', priority: 'media', status: 'fazer', category: 'casa', deadline: '', tags: [], alloc_hours: 0, alloc_mins: 0 });
  const [tagInput, setTagInput] = useState('');

  const navigate = useNavigate();
  const token = localStorage.getItem('kanban_token');
  const userStr = localStorage.getItem('kanban_user');
  const user = userStr ? JSON.parse(userStr) : { name: '' };
  
  const headers = { Authorization: `Bearer ${token}` };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const fetchMetrics = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/dashboard', { headers });
      setMetrics(res.data);
    } catch (err) {
      console.error("Erro ao carregar dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setErrorMsg("O título é obrigatório.");
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }
    const payload = {
      ...form,
      allocated_time: (parseInt(form.alloc_hours || 0) * 3600) + (parseInt(form.alloc_mins || 0) * 60)
    };
    try {
      await axios.post('http://localhost:5000/api/tasks', payload, { headers });
      setIsModalOpen(false);
      setForm({ title: '', description: '', priority: 'media', status: 'fazer', category: 'casa', deadline: '', tags: [], alloc_hours: 0, alloc_mins: 0 });
      fetchMetrics();
    } catch (err) {
      setErrorMsg("Erro ao salvar a tarefa no momento.");
      setTimeout(() => setErrorMsg(''), 3000);
    }
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = tagInput.trim();
      if (val && !form.tags.includes(val)) {
        setForm({ ...form, tags: [...form.tags, val] });
        setTagInput('');
      }
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, bg }) => (
    <div className={`glass rounded-3xl p-6 relative overflow-hidden card-hover border border-${color}/20 group col-span-1`}>
      <div className={`absolute -right-6 -top-6 w-32 h-32 ${bg} rounded-full blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity`}></div>
      <div className="flex justify-between items-start relative z-10">
        <div>
          <p className="text-dark-muted font-medium mb-2">{title}</p>
          <h3 className="text-5xl font-bold text-white tracking-tight">{loading ? '...' : value}</h3>
        </div>
        <div className={`p-4 rounded-2xl ${bg} bg-opacity-10 border border-${color}/20`}>
          <Icon className={`w-8 h-8 text-${color}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full relative pb-20">
      {errorMsg && (
        <div className="absolute top-0 right-0 z-[100] animate-bounce bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> <span>{errorMsg}</span>
        </div>
      )}

      {/* Header Interativo Premium */}
      <div className="mb-12 relative animate-in slide-in-from-bottom-4 duration-700 ease-out">
        <div className="inline-block relative">
          <div className="absolute -inset-1 blur-xl opacity-30 bg-gradient-to-r from-brand-500 to-purple-500 rounded-lg"></div>
          <h1 className="relative text-5xl md:text-6xl font-extrabold text-white tracking-tight flex items-center gap-3 drop-shadow-2xl">
             <span className="opacity-90">{getGreeting()},</span> 
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-brand-400 to-indigo-400 animate-gradient-x drop-shadow-md pb-1">
               {user.name.split(' ')[0]}
             </span>! <span className="animate-bounce origin-bottom-right">👋</span>
          </h1>
        </div>
        <p className="text-dark-muted mt-4 text-xl font-medium tracking-wide">Bem-vindo de volta! Aqui está o resumo da sua produtividade de hoje.</p>
      </div>

      {/* Cards Grandes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        <StatCard 
          title="Concluídas (Últimos 7 dias)" 
          value={metrics.concluidasUltimos7Dias} 
          icon={Activity} 
          color="emerald-400" 
          bg="bg-emerald-500" 
        />
        <StatCard 
          title="Em Andamento" 
          value={metrics.fazendo} 
          icon={Clock} 
          color="amber-400" 
          bg="bg-amber-500" 
        />
        <StatCard 
          title="Tarefas Atrasadas" 
          value={metrics.atrasadas} 
          icon={AlertTriangle} 
          color="red-400" 
          bg="bg-red-500" 
        />
      </div>

      {/* Seção Analítica Dividida */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Lista de Próximas a Vencer */}
         <div className="lg:col-span-2 glass rounded-3xl p-6 border border-dark-border">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <CalendarDays className="text-brand-400 w-5 h-5"/> Próximas a Vencer
               </h2>
               <button onClick={() => navigate('/board')} className="text-sm font-medium text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
                 Ver todas <ArrowRight className="w-4 h-4"/>
               </button>
            </div>

            <div className="space-y-3">
               {loading ? (
                  <p className="text-dark-muted py-4 text-center">Carregando tarefas...</p>
               ) : metrics.tarefasProximas.length === 0 ? (
                  <div className="py-10 text-center flex flex-col items-center">
                     <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-3">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                     </div>
                     <p className="text-dark-muted font-medium">Você não possui tarefas com prazo próximo!</p>
                  </div>
               ) : (
                  metrics.tarefasProximas.map(task => (
                     <div key={task.id} className="bg-dark-card/50 hover:bg-dark-card border border-dark-border rounded-2xl p-4 flex items-center justify-between transition-colors cursor-default group">
                        <div className="flex items-center gap-4">
                           <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                              task.priority === 'alta' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                              task.priority === 'media' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                              'bg-blue-500/10 border-blue-500/20 text-blue-500'
                           }`}>
                              <Clock className="w-6 h-6" />
                           </div>
                           <div>
                              <h3 className="font-semibold text-white">{task.title}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                 <span className="text-xs text-dark-muted flex items-center gap-1">
                                    <CalendarDays className="w-3 h-3" /> 
                                    {new Date(task.deadline).toLocaleDateString()}
                                 </span>
                                 {task.category && (
                                   <span className="text-xs bg-dark-bg px-2 py-0.5 rounded-md text-indigo-400 border border-dark-border">{task.category}</span>
                                 )}
                              </div>
                           </div>
                        </div>
                        <button onClick={() => navigate('/board')} className="opacity-0 group-hover:opacity-100 p-2 bg-brand-500/10 text-brand-400 rounded-lg transition-all hover:bg-brand-500/20 border border-transparent hover:border-brand-500/30">
                           <ArrowRight className="w-5 h-5" />
                        </button>
                     </div>
                  ))
               )}
            </div>
         </div>

         {/* Painel Secundário Info */}
         <div className="glass rounded-3xl p-6 border border-dark-border bg-gradient-to-br from-indigo-900/20 to-purple-900/10 flex flex-col justify-between">
            <div>
               <div className="w-16 h-16 bg-gradient-to-tr from-brand-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20 mb-6">
                  <Activity className="text-white w-8 h-8" />
               </div>
               <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Crescimento <br/> Constante</h3>
               <p className="text-dark-muted leading-relaxed">Você está no domínio das suas responsabilidades. Transforme grandes projetos em pequenos passos através do seu Quadro Interativo.</p>
            </div>
            
            <div className="mt-8 bg-dark-bg/60 p-5 rounded-2xl border border-dark-border/50">
               <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-dark-muted">Taxa de Conclusão Global</span>
                  <span className="text-sm font-bold text-emerald-400">
                     {metrics.total > 0 ? Math.round((metrics.feito / metrics.total) * 100) : 0}%
                  </span>
               </div>
               <div className="w-full h-2 bg-dark-card rounded-full overflow-hidden">
                  <div 
                     className="h-full bg-gradient-to-r from-emerald-500 to-brand-400 rounded-full transition-all duration-1000" 
                     style={{ width: `${metrics.total > 0 ? (metrics.feito / metrics.total) * 100 : 0}%` }}
                  ></div>
               </div>
            </div>
         </div>
      </div>

      {/* Floating Action Button (FAB) */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-10 right-10 z-50 w-16 h-16 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-full flex items-center justify-center shadow-[0_10px_40px_-10px_rgba(99,102,241,0.8)] hover:scale-110 transition-all duration-300 border-2 border-white/10"
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* Modal Nova Tarefa (FAB) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass w-full max-w-lg rounded-3xl p-8 shadow-2xl border border-dark-border overflow-y-auto max-h-[90vh] custom-scrollbar">
            <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">📝 Criar Nova Tarefa</h2>
            
            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-dark-muted ml-1 mb-1 block">Título</label>
                <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-dark-bg/80 border border-dark-border text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="O que você precisa fazer?" />
              </div>
              
              <div>
                <label className="text-sm font-medium text-dark-muted ml-1 mb-1 block">Descrição</label>
                <textarea rows="3" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-dark-bg/80 border border-dark-border text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-500 outline-none resize-none" placeholder="Detalhes da tarefa..."></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-dark-muted ml-1 mb-1 block">Prioridade</label>
                  <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full bg-dark-bg/80 border border-dark-border text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 appearance-none">
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <div>
                   <label className="text-sm font-medium text-dark-muted ml-1 mb-1 block">Data Vencimento</label>
                   <input type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} className="w-full bg-dark-bg/80 border border-dark-border text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-dark-muted ml-1 mb-1 block">Categoria Fixa</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-dark-bg/80 border border-dark-border text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 appearance-none">
                    <option value="casa">Casa</option>
                    <option value="trabalho">Trabalho</option>
                    <option value="estudos">Estudos</option>
                    <option value="pessoal">Pessoal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                   <label className="text-sm font-medium text-dark-muted ml-1 mb-1 block">Tempo Estimado (Horas)</label>
                   <input type="number" min="0" value={form.alloc_hours} onChange={e => setForm({...form, alloc_hours: e.target.value})} className="w-full bg-dark-bg/80 border border-dark-border text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500" placeholder="0" />
                </div>
                <div>
                   <label className="text-sm font-medium text-dark-muted ml-1 mb-1 block">Minutos</label>
                   <input type="number" min="0" max="59" value={form.alloc_mins} onChange={e => setForm({...form, alloc_mins: e.target.value})} className="w-full bg-dark-bg/80 border border-dark-border text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500" placeholder="0" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-dark-muted ml-1 mb-1 block">Tags Livres (Aperte Enter)</label>
                <div className="w-full bg-dark-bg/80 border border-dark-border rounded-xl p-2 focus-within:ring-2 focus-within:ring-brand-500 min-h-[55px] flex flex-wrap gap-2 items-center">
                  {form.tags && form.tags.map(t => (
                    <span key={t} className="bg-brand-500/20 text-brand-400 border border-brand-500/30 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
                      <Tag className="w-3 h-3"/> {t}
                      <button type="button" onClick={() => setForm({...form, tags: form.tags.filter(tg=> tg!==t)})} className="text-brand-300 hover:text-white">&times;</button>
                    </span>
                  ))}
                  <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleAddTag} className="flex-1 min-w-[120px] bg-transparent outline-none text-white px-2 text-sm" placeholder={form.tags.length === 0 ? "Adicionar tag..." : ""} />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-dark-border/50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 text-dark-muted hover:text-white transition-colors font-medium rounded-xl hover:bg-dark-card">Cancelar</button>
                <button type="submit" className="bg-brand-600 hover:bg-brand-500 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-brand-500/30 hover:-translate-y-0.5">
                  Salvar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
