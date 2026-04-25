const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { initDB, query, run, get } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = 'super_secret_kanban_key_for_local_dev'; // Em prod usar .env

app.use(cors());
app.use(express.json());

// Initialize DB
initDB();

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Acesso negado' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
};

// ========================
// AUTHENTICATION ROUTES
// ========================
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Preencha todos os campos.' });

  try {
    const existing = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (existing) return res.status(400).json({ error: 'Email já cadastrado.' });

    const hash = await bcrypt.hash(password, 10);
    const avatar_url = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0f172a&textColor=f8fafc`;
    const result = await run('INSERT INTO users (name, email, password_hash, avatar_url) VALUES (?, ?, ?, ?)', [name, email, hash, avatar_url]);
    
    res.status(201).json({ message: 'Usuário criado com sucesso!', userId: result.lastID });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar usuário.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(400).json({ error: 'Credenciais inválidas.' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(400).json({ error: 'Credenciais inválidas.' });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url } });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer login.' });
  }
});

// ========================
// TASKS ROUTES
// ========================
app.get('/api/tasks', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const sql = `
      SELECT DISTINCT t.* 
      FROM tasks t
      LEFT JOIN task_shares ts ON t.id = ts.task_id
      WHERE t.creator_id = ? OR ts.user_id = ?
    `;
    const tasks = await query(sql, [userId, userId]);
    
    // Adicionar flag de dono e buscar tags para ajudar visualmente no front
    for (let task of tasks) {
      task.isOwned = task.creator_id === userId;
      const tags = await query(`SELECT tags.name FROM tags JOIN task_tags ON tags.id = task_tags.tag_id WHERE task_tags.task_id = ?`, [task.id]);
      task.tags = tags.map(t => t.name);
    }
    
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar tarefas.' });
  }
});

app.post('/api/tasks', authenticateToken, async (req, res) => {
  const { title, description, deadline, priority, category, status, tags, allocated_time } = req.body;
  const userId = req.user.id;

  try {
    const result = await run(
      'INSERT INTO tasks (title, description, deadline, priority, status, category, creator_id, allocated_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description || '', deadline || null, priority || 'media', status || 'fazer', category || '', userId, allocated_time || 0]
    );
    const taskId = result.lastID;
    
    if (tags && Array.isArray(tags)) {
      for (const tName of tags) {
        let tag = await get('SELECT id FROM tags WHERE name = ?', [tName]);
        if (!tag) {
           const tr = await run('INSERT INTO tags (name, color) VALUES (?, ?)', [tName, 'gray']);
           tag = { id: tr.lastID };
        }
        await run('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)', [taskId, tag.id]);
      }
    }

    const newTask = await get('SELECT * FROM tasks WHERE id = ?', [result.lastID]);
    newTask.isOwned = true;
    newTask.tags = tags || [];
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar tarefa.' });
  }
});

app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  const taskId = req.params.id;
  const { title, description, deadline, priority, status, category, tags } = req.body;
  const userId = req.user.id;

  try {
    // Checa se tem permissao para alterar
    const task = await get(`
      SELECT t.* FROM tasks t 
      LEFT JOIN task_shares ts ON t.id = ts.task_id 
      WHERE t.id = ? AND (t.creator_id = ? OR ts.user_id = ?)
    `, [taskId, userId, userId]);

    if (!task) return res.status(403).json({ error: 'Sem permissão ou tarefa não encontrada.' });

    // TIME TRACKING & COMPLETED
    let updatedTimeSpent = task.time_spent || 0;
    let newLastStartedAt = task.last_started_at;
    let completedAtDate = task.completed_at;
    const targetStatus = status || task.status;

    // Se saiu de Fazendo (pausa timer)
    if (task.status === 'fazendo' && targetStatus !== 'fazendo' && task.last_started_at) {
        const started = new Date(task.last_started_at).getTime();
        const diffSeconds = Math.floor((Date.now() - started) / 1000);
        updatedTimeSpent += diffSeconds;
        newLastStartedAt = null;
    }
    
    // Se entrou em Fazendo (inicia timer)
    if (task.status !== 'fazendo' && targetStatus === 'fazendo') {
        newLastStartedAt = new Date().toISOString();
    }

    // Se mudou pra Feito
    if (task.status !== 'feito' && targetStatus === 'feito') {
        completedAtDate = new Date().toISOString();
    } else if (targetStatus !== 'feito') {
        completedAtDate = null;
    }

    const { allocated_time } = req.body;
    const finalAllocated = allocated_time !== undefined ? allocated_time : task.allocated_time;

    await run(
      'UPDATE tasks SET title = ?, description = ?, deadline = ?, priority = ?, status = ?, category = ?, time_spent = ?, last_started_at = ?, completed_at = ?, allocated_time = ? WHERE id = ?',
      [title || task.title, description || task.description, deadline || task.deadline, priority || task.priority, targetStatus, category || task.category, updatedTimeSpent, newLastStartedAt, completedAtDate, finalAllocated, taskId]
    );

    // Sync tags
    if (tags && Array.isArray(tags)) {
       await run('DELETE FROM task_tags WHERE task_id = ?', [taskId]);
       for (const tName of tags) {
        let tag = await get('SELECT id FROM tags WHERE name = ?', [tName]);
        if (!tag) {
           const tr = await run('INSERT INTO tags (name, color) VALUES (?, ?)', [tName, 'gray']);
           tag = { id: tr.lastID };
        }
        await run('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)', [taskId, tag.id]);
      }
    }

    res.json({ message: 'Tarefa atualizada' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar tarefa.' });
  }
});

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;

  try {
    const task = await get('SELECT * FROM tasks WHERE id = ? AND creator_id = ?', [taskId, userId]);
    if (!task) return res.status(403).json({ error: 'Apenas o criador pode deletar a tarefa.' });

    await run('DELETE FROM tasks WHERE id = ?', [taskId]);
    res.json({ message: 'Deletado com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar tarefa.' });
  }
});

// ========================
// SHARING ROUTES
// ========================
app.post('/api/tasks/:id/share', authenticateToken, async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;
  const { email } = req.body;

  try {
    const task = await get('SELECT * FROM tasks WHERE id = ? AND creator_id = ?', [taskId, userId]);
    if (!task) return res.status(403).json({ error: 'Apenas o criador da tarefa pode compartilhá-la.' });

    const targetUser = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (!targetUser) return res.status(404).json({ error: 'Usuário não encontrado com este email.' });
    if (targetUser.id === userId) return res.status(400).json({ error: 'Você não pode compartilhar consigo mesmo.' });

    await run('INSERT OR IGNORE INTO task_shares (task_id, user_id) VALUES (?, ?)', [taskId, targetUser.id]);
    res.json({ message: 'Compartilhado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao compartilhar.' });
  }
});

// ========================
// DASHBOARD ROUTE
// ========================
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const sql = `
      SELECT t.* 
      FROM tasks t
      LEFT JOIN task_shares ts ON t.id = ts.task_id
      WHERE t.creator_id = ? OR ts.user_id = ?
    `;
    const tasks = await query(sql, [userId, userId]);
    
    // Obter data de hoje em YYYY-MM-DD
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    let metrics = {
      total: tasks.length,
      fazer: 0,
      fazendo: 0,
      feito: 0,
      atrasadas: 0,
      urgentes: 0,
      concluidasUltimos7Dias: 0,
      tarefasProximas: []
    };

    const sevenDaysAgoStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    tasks.forEach(t => {
      metrics[t.status] = (metrics[t.status] || 0) + 1;
      if (t.priority === 'alta' && t.status !== 'feito') metrics.urgentes++;
      // Checa tarefas atrasadas ignorando as que já foram feitas
      if (t.deadline && t.status !== 'feito' && t.deadline < todayStr) {
        metrics.atrasadas++;
      }
      if (t.status === 'feito' && t.completed_at && t.completed_at >= sevenDaysAgoStr) {
          metrics.concluidasUltimos7Dias++;
      }
      if (t.status !== 'feito' && t.deadline && t.deadline >= todayStr) {
          metrics.tarefasProximas.push(t);
      }
    });

    metrics.tarefasProximas.sort((a,b) => new Date(a.deadline) - new Date(b.deadline));
    metrics.tarefasProximas = metrics.tarefasProximas.slice(0, 5);

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar dashboard.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor Backend rodando na porta ${PORT}`);
});
