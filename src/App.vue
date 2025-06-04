<template>
  <div class="container">
    <header class="header">
      <h1>
        {{ user?.name || 'Usuario' }}'s Todo List
      </h1>
      <div class="counter">
        {{ stats.pending }} tareas pendientes
      </div>
    </header>

    <div class="main-content">
      <!-- Loading state -->
      <div v-if="loading" class="loading">
        <p>Cargando tu lista de tareas...</p>
      </div>

      <!-- Error message -->
      <div v-if="error" class="message error">
        {{ error }}
        <button @click="loadData" class="btn btn-primary">
          🔄 Reintentar
        </button>
      </div>

      <!-- Success message -->
      <div v-if="successMessage" class="message success">
        {{ successMessage }}
      </div>

      <template v-if="!loading && !error">
        <!-- Statistics Cards -->
        <div class="stats">
          <div class="stat-card">
            <span class="stat-number">{{ stats.total }}</span>
            <span class="stat-label">Total</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">{{ stats.completed }}</span>
            <span class="stat-label">Completadas</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">{{ stats.pending }}</span>
            <span class="stat-label">Pendientes</span>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="tabs">
          <div 
            class="tab" 
            :class="{ active: activeTab === 'app' }"
            @click="activeTab = 'app'"
          >
            📝 Gestionar Tareas
          </div>
          <div 
            class="tab" 
            :class="{ active: activeTab === 'console' }"
            @click="activeTab = 'console'"
          >
            🖥️ Consola de Debug
          </div>
        </div>

        <!-- Tasks Management Tab -->
        <div v-if="activeTab === 'app'" class="tab-content active">
          <!-- Add New Task Section -->
          <div class="new-task">
            <h3 style="margin-bottom: 1rem; color: var(--text-primary); font-size: 1.1rem;">
              ➕ Agregar Nueva Tarea
            </h3>
            <div class="task-input-group">
              <input
                v-model="newTaskText"
                @keyup.enter="addTask"
                :disabled="addingTask"
                type="text"
                placeholder="Escribe tu nueva tarea aquí..."
                maxlength="100"
              />
              <button 
                @click="addTask" 
                :disabled="!newTaskText.trim() || addingTask"
                class="btn btn-primary"
              >
                {{ addingTask ? '⏳ Añadiendo...' : '➕ Añadir Tarea' }}
              </button>
            </div>
            <div style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-muted);">
              {{ newTaskText.length }}/100 caracteres
            </div>
          </div>

          <!-- Tasks List -->
          <div v-if="filteredTodos.length > 0">
            <h3 style="margin-bottom: 1.5rem; color: var(--text-primary); font-size: 1.2rem;">
              📋 {{ showCompleted ? 'Todas las Tareas' : 'Tareas Pendientes' }} ({{ filteredTodos.length }})
            </h3>
            <ul class="task-list">
              <li
                v-for="todo in filteredTodos"
                :key="todo.id"
                class="task-item"
                :class="{ completed: todo.complete }"
              >
                <input
                  type="checkbox"
                  class="task-checkbox"
                  :checked="todo.complete"
                  @change="toggleComplete(todo.id, !todo.complete)"
                />
                <div class="task-id">#{{ todo.id }}</div>
                <div class="task-text">{{ todo.task }}</div>
                <div class="task-actions">
                  <button
                    @click="deleteSingleTodo(todo.id)"
                    class="btn btn-danger"
                    style="padding: 0.5rem 1rem; font-size: 0.75rem;"
                    :disabled="deletingTodo === todo.id"
                  >
                    {{ deletingTodo === todo.id ? '⏳' : '🗑️ Eliminar' }}
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <!-- Empty State -->
          <div v-else class="empty-state">
            <h3>{{ showCompleted ? 'No tienes tareas aún' : 'No hay tareas pendientes' }}</h3>
            <p>{{ showCompleted ? '¡Comienza agregando tu primera tarea!' : '¡Excelente! Has completado todas tus tareas.' }}</p>
          </div>

          <!-- Action Controls -->
          <div class="controls">
            <button
              @click="removeCompletedTasks"
              :disabled="!hasCompletedTasks || removingCompleted"
              class="btn btn-danger"
            >
              {{ removingCompleted ? '⏳ Eliminando...' : '🗑️ Limpiar Completadas' }}
            </button>
            <button
              @click="toggleShowCompleted"
              class="btn btn-accent"
            >
              {{ showCompleted ? '👁️ Ocultar Completadas' : '👁️ Mostrar Todas' }}
            </button>
            <button
              @click="refreshData"
              :disabled="loading"
              class="btn btn-secondary"
            >
              {{ loading ? '⏳ Actualizando...' : '🔄 Actualizar Datos' }}
            </button>
            <button
              @click="exportTasks"
              class="btn btn-success"
              :disabled="!todos.length"
            >
              📤 Exportar Lista
            </button>
          </div>
        </div>

        <!-- Console Debug Tab -->
        <div v-if="activeTab === 'console'" class="tab-content active">
          <h3 style="margin-bottom: 1rem; color: var(--text-primary); font-size: 1.1rem;">
            🖥️ Consola de Desarrollo
          </h3>
          <div class="console-output" ref="consoleOutput">
            <div v-for="(log, index) in consoleLogs" :key="index" class="console-line">
              {{ log }}
            </div>
            <div v-if="consoleLogs.length === 0" class="console-line">
              💡 La consola está vacía. Las acciones aparecerán aquí automáticamente.
            </div>
          </div>
          <div style="margin-top: 1rem; text-align: center;">
            <button @click="clearConsole" class="btn btn-secondary">
              🧹 Limpiar Consola
            </button>
            <button @click="downloadLogs" class="btn btn-success" :disabled="!consoleLogs.length">
              💾 Descargar Logs
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { ApiService } from './services/apiServices.js';

export default {
  name: 'App',
  setup() {
    // Reactive state
    const todos = ref([]);
    const user = ref(null);
    const loading = ref(false);
    const error = ref('');
    const successMessage = ref('');
    const newTaskText = ref('');
    const showCompleted = ref(true);
    const activeTab = ref('app');
    const consoleLogs = ref([]);
    const consoleOutput = ref();

    // Action states
    const addingTask = ref(false);
    const removingCompleted = ref(false);
    const deletingTodo = ref(null);

    // Computed properties
    const filteredTodos = computed(() => {
      return showCompleted.value 
        ? todos.value 
        : todos.value.filter(todo => !todo.complete);
    });

    const stats = computed(() => {
      const total = todos.value.length;
      const completed = todos.value.filter(todo => todo.complete).length;
      const pending = total - completed;
      
      return { total, completed, pending };
    });

    const hasCompletedTasks = computed(() => {
      return todos.value.some(todo => todo.complete);
    });

    // Console logging with timestamps and types
    const logToConsole = (message, type = 'info') => {
      const timestamp = new Date().toLocaleTimeString();
      const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
      consoleLogs.value.push(`[${timestamp}] ${emoji} ${message}`);
      
      nextTick(() => {
        if (consoleOutput.value) {
          consoleOutput.value.scrollTop = consoleOutput.value.scrollHeight;
        }
      });
    };

    const clearConsole = () => {
      consoleLogs.value = [];
      logToConsole('Consola limpiada');
    };

    // Message handling with auto-dismiss
    const showMessage = (message, isError = false) => {
      if (isError) {
        error.value = message;
        successMessage.value = '';
        logToConsole(message, 'error');
      } else {
        successMessage.value = message;
        error.value = '';
        logToConsole(message, 'success');
      }
      
      setTimeout(() => {
        error.value = '';
        successMessage.value = '';
      }, 4000);
    };

    // Data loading with better error handling
    const loadData = async () => {
      loading.value = true;
      error.value = '';
      
      try {
        logToConsole('Iniciando carga de datos...');
        
        const apiHealthy = await ApiService.checkApiHealth();
        if (!apiHealthy) {
          throw new Error('🔌 El servidor JSON no está disponible. Ejecuta: npm run server');
        }

        const [todosData, usersData] = await Promise.all([
          ApiService.getTodos(),
          ApiService.getUsers()
        ]);
        
        todos.value = todosData;
        user.value = usersData[0] || { id: 1, name: 'Usuario' };
        
        logToConsole(`📋 ${user.value.name}'s Todo List cargada exitosamente`);
        logToConsole(`📊 Estadísticas: ${stats.value.total} total, ${stats.value.pending} pendientes, ${stats.value.completed} completadas`);
        
        // Log each todo with better formatting
        todos.value.forEach(todo => {
          const status = todo.complete ? '✅ completada' : '⏳ pendiente';
          logToConsole(`#${todo.id} "${todo.task}" - ${status}`);
        });
        
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido al cargar datos';
        error.value = message;
        logToConsole(message, 'error');
      } finally {
        loading.value = false;
      }
    };

    const refreshData = async () => {
      await loadData();
      showMessage('✅ Datos actualizados correctamente');
    };

    // Enhanced task operations
    const addTask = async () => {
      const task = newTaskText.value.trim();
      if (!task) return;
      
      addingTask.value = true;
      logToConsole(`🔄 Agregando nueva tarea: "${task}"`);
      
      try {
        const newTodo = await ApiService.createTodo(task);
        todos.value.push(newTodo);
        newTaskText.value = '';
        
        logToConsole(`✅ Tarea #${newTodo.id} creada exitosamente`, 'success');
        showMessage(`🎉 Tarea "${task}" agregada correctamente`);
        
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al agregar tarea';
        showMessage(message, true);
        logToConsole(`❌ Fallo al crear tarea: ${message}`, 'error');
      } finally {
        addingTask.value = false;
      }
    };

    const toggleComplete = async (id, complete) => {
      const task = todos.value.find(t => t.id === id);
      const action = complete ? 'completar' : 'marcar como pendiente';
      
      logToConsole(`🔄 Intentando ${action} tarea #${id}: "${task?.task}"`);
      
      try {
        const updatedTodo = await ApiService.markTodoComplete(id, complete);
        
        const index = todos.value.findIndex(todo => todo.id === id);
        if (index !== -1) {
          todos.value[index] = updatedTodo;
        }
        
        const actionText = complete ? 'completada' : 'marcada como pendiente';
        logToConsole(`✅ Tarea #${id} ${actionText}`, 'success');
        showMessage(`🎯 Tarea ${actionText} correctamente`);
        
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al actualizar tarea';
        showMessage(message, true);
        logToConsole(`❌ Error al actualizar tarea #${id}: ${message}`, 'error');
      }
    };

    const deleteSingleTodo = async (id) => {
      const task = todos.value.find(t => t.id === id);
      if (!confirm(`¿Estás seguro de eliminar la tarea "${task?.task}"?`)) {
        return;
      }
      
      deletingTodo.value = id;
      logToConsole(`🔄 Eliminando tarea #${id}: "${task?.task}"`);
      
      try {
        await ApiService.deleteTodo(id);
        todos.value = todos.value.filter(todo => todo.id !== id);
        
        logToConsole(`✅ Tarea #${id} eliminada exitosamente`, 'success');
        showMessage('🗑️ Tarea eliminada correctamente');
        
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al eliminar tarea';
        showMessage(message, true);
        logToConsole(`❌ Error al eliminar tarea #${id}: ${message}`, 'error');
      } finally {
        deletingTodo.value = null;
      }
    };

    const removeCompletedTasks = async () => {
      const completedCount = todos.value.filter(t => t.complete).length;
      if (!completedCount) return;
      
      if (!confirm(`¿Eliminar todas las ${completedCount} tareas completadas?`)) {
        return;
      }
      
      removingCompleted.value = true;
      logToConsole(`🔄 Eliminando ${completedCount} tareas completadas`);
      
      try {
        await ApiService.deleteCompletedTodos();
        todos.value = todos.value.filter(todo => !todo.complete);
        
        logToConsole(`✅ ${completedCount} tareas completadas eliminadas`, 'success');
        showMessage(`🧹 ${completedCount} tareas completadas eliminadas`);
        
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al eliminar tareas completadas';
        showMessage(message, true);
        logToConsole(`❌ Error al eliminar tareas completadas: ${message}`, 'error');
      } finally {
        removingCompleted.value = false;
      }
    };

    const toggleShowCompleted = () => {
      showCompleted.value = !showCompleted.value;
      const action = showCompleted.value ? 'Mostrando' : 'Ocultando';
      logToConsole(`👁️ ${action} tareas completadas`);
    };

    const exportTasks = () => {
      try {
        const exportData = {
          user: user.value?.name || 'Usuario',
          exportDate: new Date().toISOString(),
          stats: stats.value,
          tasks: todos.value.map(todo => ({
            id: todo.id,
            task: todo.task,
            completed: todo.complete,
            status: todo.complete ? 'Completada' : 'Pendiente'
          }))
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `todo-list-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        logToConsole(`📤 Lista exportada: ${todos.value.length} tareas`, 'success');
        showMessage('📤 Lista exportada correctamente');
        
      } catch (err) {
        logToConsole(`❌ Error al exportar: ${err.message}`, 'error');
        showMessage('Error al exportar la lista', true);
      }
    };

    const downloadLogs = () => {
      try {
        const logsText = consoleLogs.value.join('\n');
        const blob = new Blob([logsText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `todo-logs-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        
        logToConsole('💾 Logs descargados exitosamente', 'success');
        showMessage('💾 Logs descargados correctamente');
        
      } catch (err) {
        logToConsole(`❌ Error al descargar logs: ${err.message}`, 'error');
        showMessage('Error al descargar logs', true);
      }
    };

    // Enhanced watchers
    watch(filteredTodos, (newTodos, oldTodos) => {
      if (oldTodos && newTodos.length !== oldTodos.length) {
        logToConsole(`📊 Vista actualizada: mostrando ${newTodos.length} tareas`);
      }
    }, { deep: true });

    watch(activeTab, (newTab) => {
      logToConsole(`🔄 Cambiando a pestaña: ${newTab === 'app' ? 'Gestión de Tareas' : 'Consola de Debug'}`);
    });

    // Initialize app with enhanced logging
    onMounted(() => {
      logToConsole('🚀 Aplicación Vue Todo List iniciada');
      logToConsole('🔧 Modo: Desarrollo con API REST');
      loadData();
    });

    return {
      // State
      todos,
      user,
      loading,
      error,
      successMessage,
      newTaskText,
      showCompleted,
      activeTab,
      consoleLogs,
      consoleOutput,
      addingTask,
      removingCompleted,
      deletingTodo,
      
      // Computed
      filteredTodos,
      stats,
      hasCompletedTasks,
      
      // Methods
      logToConsole,
      clearConsole,
      showMessage,
      loadData,
      refreshData,
      addTask,
      toggleComplete,
      deleteSingleTodo,
      removeCompletedTasks,
      toggleShowCompleted,
      exportTasks,
      downloadLogs
    };
  }
};
</script>

<style>
/* Los estilos están en el archivo CSS separado */
</style>