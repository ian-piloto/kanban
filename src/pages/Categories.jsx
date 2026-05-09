import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, or } from 'firebase/firestore';
import { Briefcase, Home, BookOpen, User, ChevronRight, CheckCircle2, Clock } from 'lucide-react';

const categoryMap = {
  'trabalho': { icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  'casa': { icon: Home, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  'estudos': { icon: BookOpen, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  'pessoal': { icon: User, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' }
};

export default function Categories() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'tasks'),
      or(
        where('creator_id', '==', user.uid),
        where('sharedWith', 'array-contains', user.email)
      )
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTasks(tasksData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const categories = ['trabalho', 'casa', 'estudos', 'pessoal'];

  if (loading) return <div className="flex-1 flex items-center justify-center text-dark-muted">Carregando categorias...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white tracking-tight">Minhas Categorias</h1>
        <p className="text-dark-muted mt-1 text-sm">Visualize suas tarefas organizadas por contexto</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map(catKey => {
          const cat = categoryMap[catKey];
          const Icon = cat.icon;
          const catTasks = tasks.filter(t => t.category === catKey);
          
          return (
            <div key={catKey} className="glass rounded-3xl border border-dark-border overflow-hidden flex flex-col group transition-all hover:border-brand-500/30">
               <div className={`p-6 border-b border-dark-border/50 ${cat.bg} flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                     <div className={`p-2 rounded-xl bg-dark-bg/50 ${cat.color} border ${cat.border}`}>
                        <Icon className="w-5 h-5" />
                     </div>
                     <h2 className="text-xl font-bold text-white capitalize">{catKey}</h2>
                  </div>
                  <span className="text-sm font-bold text-dark-muted bg-dark-bg/50 px-3 py-1 rounded-full border border-dark-border">
                    {catTasks.length} {catTasks.length === 1 ? 'tarefa' : 'tarefas'}
                  </span>
               </div>
               
               <div className="p-4 flex-1 space-y-3">
                  {catTasks.length === 0 ? (
                    <div className="h-24 flex items-center justify-center text-dark-muted text-sm italic">
                      Nenhuma tarefa nesta categoria.
                    </div>
                  ) : (
                    catTasks.slice(0, 5).map(task => (
                      <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-dark-card/30 border border-dark-border/50 hover:border-brand-500/20 transition-colors">
                        <div className={`w-2 h-2 rounded-full ${task.status === 'feito' ? 'bg-emerald-500' : task.status === 'fazendo' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                        <span className={`flex-1 text-sm font-medium ${task.status === 'feito' ? 'text-dark-muted line-through' : 'text-white'}`}>
                          {task.title}
                        </span>
                        {task.status === 'feito' ? (
                           <CheckCircle2 className="w-4 h-4 text-emerald-500/50" />
                        ) : (
                           <Clock className="w-4 h-4 text-dark-muted" />
                        )}
                      </div>
                    ))
                  )}
                  {catTasks.length > 5 && (
                    <button className="w-full text-center py-2 text-xs font-bold text-brand-400 hover:text-brand-300 uppercase tracking-widest transition-colors">
                       Ver mais {catTasks.length - 5} tarefas
                    </button>
                  )}
               </div>
               
               <div className="p-4 pt-0 mt-auto">
                  <div className="w-full bg-dark-bg/50 rounded-full h-1.5 overflow-hidden border border-dark-border/50">
                     <div 
                       className={`h-full ${catKey === 'trabalho' ? 'bg-blue-500' : catKey === 'casa' ? 'bg-emerald-500' : catKey === 'estudos' ? 'bg-amber-500' : 'bg-purple-500'}`}
                       style={{ width: `${catTasks.length > 0 ? (catTasks.filter(t => t.status === 'feito').length / catTasks.length) * 100 : 0}%` }}
                     ></div>
                  </div>
                  <div className="flex justify-between mt-2 px-1">
                     <span className="text-[10px] text-dark-muted uppercase font-bold">Progresso</span>
                     <span className="text-[10px] text-white font-bold">
                        {catTasks.length > 0 ? Math.round((catTasks.filter(t => t.status === 'feito').length / catTasks.length) * 100) : 0}%
                     </span>
                  </div>
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
