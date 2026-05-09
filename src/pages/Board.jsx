import { useState, useEffect } from 'react';
import { Plus, Users, Clock, Trash2, Edit2, Tag, AlertTriangle, GripVertical, Timer } from 'lucide-react';
import { DndContext, useSensor, useSensors, PointerSensor, closestCorners, DragOverlay } from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { db, auth } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  or
} from 'firebase/firestore';

// --- Formatação de Tempo ---
const formatTime = (seconds) => {
   if (!seconds) return '0m 0s';
   const h = Math.floor(seconds / 3600);
   const m = Math.floor((seconds % 3600) / 60);
   const s = seconds % 60;
   return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
};

// --- Sub-components para Drag & Drop ---

const DroppableColumn = ({ id, title, accentColor, children, taskCount }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <div className="flex-1 flex flex-col min-w-[300px] max-w-[400px] h-full">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full bg-${accentColor}`}></div>
          <h2 className="font-semibold text-lg text-dark-text">{title}</h2>
        </div>
        <span className="bg-dark-card text-dark-muted px-2.5 py-0.5 rounded-full text-sm font-medium border border-dark-border">
          {taskCount}
        </span>
      </div>

      <div 
        ref={setNodeRef} 
        className={`flex-1 rounded-2xl border p-3 overflow-y-auto custom-scrollbar flex flex-col gap-3 min-h-[500px] transition-colors ${isOver ? 'bg-brand-500/10 border-brand-500/50' : 'bg-dark-bg/50 border-dark-border/50'}`}
      >
        {children}
        {taskCount === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-dark-muted border-2 border-dashed border-dark-border/50 rounded-xl">
            <span className="text-sm">Área de soltura</span>
          </div>
        )}
      </div>
    </div>
  );
};

const DraggableTask = ({ task, onEdit, onDelete, onShare, isOverlay = false }) => {
  const [activeTimerSeconds, setActiveTimerSeconds] = useState(0);

  useEffect(() => {
    let interval;
    if (task.status === 'fazendo' && task.last_started_at) {
       const started = new Date(task.last_started_at).getTime();
       setActiveTimerSeconds(Math.floor((Date.now() - started) / 1000));
       
       interval = setInterval(() => {
         setActiveTimerSeconds(Math.floor((Date.now() - started) / 1000));
       }, 1000);
    } else {
       setActiveTimerSeconds(0);
    }
    return () => clearInterval(interval);
  }, [task.status, task.last_started_at]);

  const totalTimeSpent = (task.time_spent || 0) + activeTimerSeconds;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: task
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging && !isOverlay ? 0.3 : 1,
    zIndex: isDragging ? 999 : 1,
  };

  const isOwned = task.creator_id === auth.currentUser?.uid;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`glass rounded-xl p-4 border transition-all relative group cursor-grab active:cursor-grabbing hover:border-brand-500/50 ${isOverlay ? 'shadow-2xl border-brand-500 rotate-2 scale-105' : 'shadow-lg border-dark-border/80'}`}
      {...attributes} 
      {...listeners}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-wrap gap-2 mb-2">
          <span className={`text-xs px-2 py-1 rounded-md font-medium border 
            ${task.priority === 'alta' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
              task.priority === 'media' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
              'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
            {task.priority.toUpperCase()}
          </span>
          {task.category && (
            <span className="text-xs px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-400 font-medium border border-indigo-500/20 uppercase tracking-wide">
              {task.category}
            </span>
          )}
          {task.tags && task.tags.map(tag => (
              <span key={tag} className="text-xs px-2 py-1 flex items-center gap-1 rounded-md bg-dark-card text-dark-muted font-medium border border-dark-border">
                <Tag className="w-2.5 h-2.5" />{tag}
              </span>
          ))}
          {!isOwned && (
            <span className="text-xs px-2 py-1 flex items-center gap-1 rounded-md bg-purple-500/10 text-purple-400 font-medium border border-purple-500/20" title={`Criado por outro usuário`}>
              <Users className="w-3 h-3" /> Shared
            </span>
          )}
        </div>
        
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          {isOwned && (
            <button 
              onPointerDown={(e) => e.stopPropagation()} 
              onClick={() => onShare(task)} 
              className="p-1.5 text-dark-muted hover:text-brand-400 rounded-lg hover:bg-dark-card" title="Compartilhar"
            >
              <Users className="w-4 h-4" />
            </button>
          )}
          <button 
            onPointerDown={(e) => e.stopPropagation()} 
            onClick={() => onEdit(task)} 
            className="p-1.5 text-dark-muted hover:text-blue-400 rounded-lg hover:bg-dark-card" title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {isOwned && (
            <button 
              onPointerDown={(e) => e.stopPropagation()} 
              onClick={() => onDelete(task.id)} 
              className="p-1.5 text-dark-muted hover:text-red-400 rounded-lg hover:bg-dark-card" title="Excluir"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <h3 className="font-semibold text-dark-text text-lg leading-tight mb-2 pr-6">
        <GripVertical className="absolute right-4 top-[50%] -translate-y-1/2 w-5 h-5 text-dark-border group-hover:text-dark-muted transition-colors opacity-30 group-hover:opacity-100" />
        {task.title}
      </h3>
      {task.description && <p className="text-dark-muted text-sm line-clamp-2 mb-3 pr-4">{task.description}</p>}
      
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-dark-border/50">
        <div className="flex items-center gap-1.5 text-xs text-dark-muted">
          <Clock className="w-3.5 h-3.5" />
          {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'Sem prazo'}
        </div>
        
        {(totalTimeSpent > 0 || task.status === 'fazendo' || (task.allocated_time && task.allocated_time > 0)) && (
           <div className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border ${
              task.allocated_time > 0 && totalTimeSpent > task.allocated_time ? 'bg-red-500/10 text-red-400 border-red-500/30 font-bold' :
              task.status === 'fazendo' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold tracking-wider' : 
              'bg-dark-card text-dark-muted border-dark-border font-medium'
           }`}>
             <Timer className={`w-3.5 h-3.5 ${task.status === 'fazendo' ? 'animate-pulse' : ''}`} />
             {task.allocated_time > 0 
                ? (totalTimeSpent > task.allocated_time ? '-' : '') + formatTime(Math.abs(task.allocated_time - totalTimeSpent))
                : formatTime(totalTimeSpent)}
           </div>
        )}
      </div>
    </div>
  );
};

// --- Principal ---

export default function Board() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [currentTask, setCurrentTask] = useState(null);
  const [activeDragTask, setActiveDragTask] = useState(null);
  
  const [errorMsg, setErrorMsg] = useState('');
  
  const [form, setForm] = useState({ title: '', description: '', priority: 'media', status: 'fazer', category: 'casa', deadline: '', tags: [], alloc_hours: 0, alloc_mins: 0 });
  const [tagInput, setTagInput] = useState('');
  const [shareEmail, setShareEmail] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 4000);
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Escutar tarefas criadas por mim ou compartilhadas comigo
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
    }, (err) => {
      console.error(err);
      showError("Erro ao carregar tarefas em tempo real.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showError("Por favor, preencha o título da tarefa.");
      return;
    }

    const payload = {
      title: form.title,
      description: form.description || '',
      priority: form.priority || 'media',
      status: form.status || 'fazer',
      category: form.category || '',
      deadline: form.deadline || '',
      tags: form.tags || [],
      allocated_time: (parseInt(form.alloc_hours || 0) * 3600) + (parseInt(form.alloc_mins || 0) * 60),
      time_spent: currentTask?.time_spent || 0,
      last_started_at: currentTask?.last_started_at || null,
      completed_at: currentTask?.completed_at || null
    };

    try {
      if (currentTask && currentTask.id) {
        await updateDoc(doc(db, 'tasks', currentTask.id), payload);
      } else {
        await addDoc(collection(db, 'tasks'), {
          ...payload,
          creator_id: auth.currentUser.uid,
          created_at: serverTimestamp(),
          sharedWith: []
        });
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      showError("Não foi possível salvar a tarefa.");
    }
  };

  const resetForm = () => {
    setForm({ title: '', description: '', priority: 'media', status: 'fazer', category: 'casa', deadline: '', tags: [], alloc_hours: 0, alloc_mins: 0 });
    setTagInput('');
    setCurrentTask(null);
  }

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

  const handleRemoveTag = (tagToRemove) => {
    setForm({ ...form, tags: form.tags.filter(t => t !== tagToRemove) });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, 'tasks', deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
      showError("Erro ao deletar tarefa.");
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      let updatedTimeSpent = task.time_spent || 0;
      let newLastStartedAt = task.last_started_at || null;
      let completedAtDate = task.completed_at || null;

      // Lógica de Timer
      if (task.status === 'fazendo' && newStatus !== 'fazendo' && task.last_started_at) {
        const started = new Date(task.last_started_at).getTime();
        const diffSeconds = Math.floor((Date.now() - started) / 1000);
        updatedTimeSpent += diffSeconds;
        newLastStartedAt = null;
      }
      
      if (task.status !== 'fazendo' && newStatus === 'fazendo') {
        newLastStartedAt = new Date().toISOString();
      }

      if (task.status !== 'feito' && newStatus === 'feito') {
        completedAtDate = new Date().toISOString();
      } else if (newStatus !== 'feito') {
        completedAtDate = null;
      }

      await updateDoc(doc(db, 'tasks', task.id), {
        status: newStatus,
        time_spent: updatedTimeSpent,
        last_started_at: newLastStartedAt,
        completed_at: completedAtDate
      });
    } catch (err) {
      showError("Não foi possível atualizar o status.");
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    if (!currentTask) return;
    try {
      const taskRef = doc(db, 'tasks', currentTask.id);
      const updatedSharedWith = [...(currentTask.sharedWith || []), shareEmail];
      await updateDoc(taskRef, { sharedWith: updatedSharedWith });
      setIsShareModalOpen(false);
      setShareEmail('');
    } catch (err) {
      showError("Erro ao compartilhar tarefa.");
    }
  };

  const handleDragStart = (event) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    setActiveDragTask(task);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveDragTask(null);

    if (!over) return; 

    const taskId = active.id;
    const newStatus = over.id;
    
    if (['fazer', 'fazendo', 'feito'].includes(newStatus)) {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== newStatus) {
        handleStatusChange(task, newStatus);
      }
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      {errorMsg && (
        <div className="absolute top-0 right-0 z-[100] animate-bounce bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-dark-text tracking-tight">Project Board</h1>
          <p className="text-dark-muted mt-1 text-sm">Gerencie fluxo e calcule o seu tempo produtivo!</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-brand-500/25"
        >
          <Plus className="w-5 h-5" /> Nova Tarefa
        </button>
      </div>

      {loading ? (
        <div className="w-full flex-1 flex items-center justify-center text-dark-muted">
           <Clock className="animate-spin w-8 h-8 mr-2" /> Carregando board...
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
            {/* Colunas */}
            <DroppableColumn id="fazer" title="Para Fazer" accentColor="blue-500" taskCount={tasks.filter(t => t.status === 'fazer').length}>
              {tasks.filter(t => t.status === 'fazer').map(t => (
                 <DraggableTask key={t.id} task={t} onEdit={(t) => { setCurrentTask(t); setForm({...t, tags: t.tags || [], alloc_hours: Math.floor((t.allocated_time||0)/3600), alloc_mins: Math.floor(((t.allocated_time||0)%3600)/60)}); setIsModalOpen(true); }} onDelete={(id) => setDeleteConfirmId(id)} onShare={(t) => { setCurrentTask(t); setIsShareModalOpen(true); }} />
              ))}
            </DroppableColumn>
            
            <DroppableColumn id="fazendo" title="Em Andamento" accentColor="amber-500" taskCount={tasks.filter(t => t.status === 'fazendo').length}>
              {tasks.filter(t => t.status === 'fazendo').map(t => (
                 <DraggableTask key={t.id} task={t} onEdit={(t) => { setCurrentTask(t); setForm({...t, tags: t.tags || [], alloc_hours: Math.floor((t.allocated_time||0)/3600), alloc_mins: Math.floor(((t.allocated_time||0)%3600)/60)}); setIsModalOpen(true); }} onDelete={(id) => setDeleteConfirmId(id)} onShare={(t) => { setCurrentTask(t); setIsShareModalOpen(true); }} />
              ))}
            </DroppableColumn>

            <DroppableColumn id="feito" title="Concluído" accentColor="emerald-500" taskCount={tasks.filter(t => t.status === 'feito').length}>
              {tasks.filter(t => t.status === 'feito').map(t => (
                 <DraggableTask key={t.id} task={t} onEdit={(t) => { setCurrentTask(t); setForm({...t, tags: t.tags || [], alloc_hours: Math.floor((t.allocated_time||0)/3600), alloc_mins: Math.floor(((t.allocated_time||0)%3600)/60)}); setIsModalOpen(true); }} onDelete={(id) => setDeleteConfirmId(id)} onShare={(t) => { setCurrentTask(t); setIsShareModalOpen(true); }} />
              ))}
            </DroppableColumn>
          </div>
          
          <DragOverlay>
            {activeDragTask ? <DraggableTask task={activeDragTask} isOverlay={true} onEdit={()=>{}} onDelete={()=>{}} onShare={()=>{}} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Modal Deletar */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-red-500/20 text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
             <div className="w-16 h-16 bg-red-500/10 rounded-full flex mx-auto items-center justify-center mb-4 border border-red-500/20">
               <Trash2 className="w-8 h-8 text-red-400" />
             </div>
             <h2 className="text-xl font-bold text-dark-text mb-2">Excluir tarefa?</h2>
             <p className="text-dark-muted text-sm mb-6">Essa ação não pode ser desfeita. Apenas o criador tem permissão.</p>
             <div className="flex gap-3">
               <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2.5 text-dark-muted bg-dark-card hover:bg-dark-border hover:text-dark-text transition-colors font-medium rounded-xl border border-dark-border">
                 Cancelar
               </button>
               <button onClick={confirmDelete} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-medium py-2.5 rounded-xl transition-colors shadow-lg shadow-red-500/20">
                 Sim, Excluir
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Modal Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass w-full max-w-lg rounded-3xl p-8 shadow-2xl border border-dark-border overflow-y-auto max-h-[90vh] custom-scrollbar">
            <h2 className="text-2xl font-bold text-dark-text mb-6 tracking-tight">{currentTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
            
             <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-dark-muted ml-1 mb-1 block">Título</label>
                <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-dark-bg/80 border border-dark-border text-dark-text rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="O que você precisa fazer?" />
              </div>
              
              <div>
                <label className="text-sm font-medium text-dark-muted ml-1 mb-1 block">Descrição</label>
                <textarea rows="3" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-dark-bg/80 border border-dark-border text-dark-text rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-500 outline-none resize-none" placeholder="Detalhes da tarefa..."></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-dark-muted ml-1 mb-1 block">Prioridade</label>
                  <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full bg-dark-bg/80 border border-dark-border text-dark-text rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 appearance-none">
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <div>
                   <label className="text-sm font-medium text-dark-muted ml-1 mb-1 block">Data Vencimento</label>
                   <input type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} className="w-full bg-dark-bg/80 border border-dark-border text-dark-text rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-dark-muted ml-1 mb-1 block">Categoria Fixa</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-dark-bg/80 border border-dark-border text-dark-text rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 appearance-none">
                    <option value="casa">Casa</option>
                    <option value="trabalho">Trabalho</option>
                    <option value="estudos">Estudos</option>
                    <option value="pessoal">Pessoal</option>
                  </select>
                </div>
                <div>
                   <label className="text-sm font-medium text-dark-muted ml-1 mb-1 block">Status</label>
                   <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-dark-bg/80 border border-dark-border text-dark-text rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 appearance-none">
                     <option value="fazer">A Fazer</option>
                     <option value="fazendo">Em Andamento</option>
                     <option value="feito">Concluído</option>
                   </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                   <label className="text-sm font-medium text-dark-muted ml-1 mb-1 block">Tempo Estimado (Horas)</label>
                   <input type="number" min="0" value={form.alloc_hours} onChange={e => setForm({...form, alloc_hours: e.target.value})} className="w-full bg-dark-bg/80 border border-dark-border text-dark-text rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500" placeholder="0" />
                </div>
                <div>
                   <label className="text-sm font-medium text-dark-muted ml-1 mb-1 block">Minutos</label>
                   <input type="number" min="0" max="59" value={form.alloc_mins} onChange={e => setForm({...form, alloc_mins: e.target.value})} className="w-full bg-dark-bg/80 border border-dark-border text-dark-text rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500" placeholder="0" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-dark-muted ml-1 mb-1 block">Tags Livres (Aperte Enter)</label>
                <div className="w-full bg-dark-bg/80 border border-dark-border rounded-xl p-2 focus-within:ring-2 focus-within:ring-brand-500 min-h-[55px] flex flex-wrap gap-2 items-center">
                  {form.tags && form.tags.map(t => (
                    <span key={t} className="bg-brand-500/20 text-brand-400 border border-brand-500/30 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
                      <Tag className="w-3 h-3"/> {t}
                      <button type="button" onClick={() => handleRemoveTag(t)} className="text-brand-300 hover:text-dark-text">&times;</button>
                    </span>
                  ))}
                  <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleAddTag} className="flex-1 min-w-[120px] bg-transparent outline-none text-dark-text px-2 text-sm" placeholder={form.tags.length === 0 ? "Adicionar tag..." : ""} />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-dark-border/50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 text-dark-muted hover:text-dark-text transition-colors font-medium rounded-xl hover:bg-dark-card">Cancelar</button>
                <button type="submit" className="bg-brand-600 hover:bg-brand-500 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-brand-500/30 hover:-translate-y-0.5">
                  Salvar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Compartilhar */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-dark-border">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                  <Users className="text-purple-400 w-5 h-5"/>
                </div>
                <h2 className="text-xl font-bold text-dark-text">Compartilhar Tarefa</h2>
             </div>
             <form onSubmit={handleShare} className="space-y-5">
               <input type="email" required value={shareEmail} onChange={e => setShareEmail(e.target.value)} className="w-full bg-dark-bg/80 border border-dark-border text-dark-text rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500" placeholder="usuario@email.com" />
               <div className="flex gap-3 pt-2">
                 <button type="button" onClick={() => setIsShareModalOpen(false)} className="flex-1 py-2.5 text-dark-muted bg-dark-card hover:bg-dark-border hover:text-dark-text transition-colors font-medium rounded-xl border border-dark-border">Cancelar</button>
                 <button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-medium py-2.5 rounded-xl transition-colors shadow-lg shadow-purple-500/20">Enviar</button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
