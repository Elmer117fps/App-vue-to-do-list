<template>
  <div class="container">
    <h1>
      {{ user?.name || 'Usuario' }}'s Todo List
      <span class="counter">{{ stats.pending }} pendientes</span>
    </h1>

    <!-- Loading state -->
    <div v-if="loading" class="loading">
      <p>Cargando...</p>
    </div>

    <!-- Error message -->
    <div v-if="error" class="message error">
      {{ error }}
      <button @click="loadData" class="btn btn-primary" style="margin-left: 10px;">
        Reintentar
      </button>
    </div>

    <!-- Success message -->
    <div v-if="successMessage" class="message success">
      {{ successMessage }}
    </div>

    <template v-if="!loading && !error">
      <!-- Stats -->
      <div class="stats">
        <span>Total: {{ stats.total }}</span>
        <span>Completadas: {{ stats.completed }}</span>
        <span>Pendientes: {{ stats.pending }}</span>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <div 
          class="tab" 
          :class="{ active: activeTab === 'app' }"
          @click="activeTab = 'app'"
        >
          Aplicación
        </div>
        <div 
          class="tab" 
          :class="{ active: activeTab === 'console' }"
          @click="activeTab = 'console'"
        >
          Consola
        </div>
      </div>

      <!-- App Tab -->
      <div v-if="activeTab === 'app'" class="tab-content active">
        <!-- Add new task -->
        <div class="new-task">
          <input
            v-model="newTaskText"
            @keyup.enter="addTask"
            :disabled="addingTask"
            type="text"
            placeholder="Añadir nueva tarea..."
          />
          <button 
            @click="addTask" 
            :disabled="!newTaskText.trim() || addingTask"
          >
            {{ addingTask ? 'Añadiendo...' : 'Añadir' }}
          </button>
        </div>

        <!-- Task list -->
        <ul class="task-list" v-if="filteredTodos.length > 0">
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
            <span class="task-id">{{ todo.id }}</span>
            <span class="task-text">{{ todo.task }}</span>
            <div class="task-actions">
              <button
                @click="deleteSingleTodo(todo.id)"
                class="btn btn-danger"
                :disabled="deletingTodo === todo.id"
              >
                {{ deletingTodo === todo.id ? '...' : 'Eliminar' }}
              </button>
            </div>
          </li>
        </ul>

        <!-- Empty state -->
        <div v-else class="empty-state">
          <h3>No hay tareas</h3>
          <p>{{ showCompleted ? 'No tienes tareas aún' : 'No hay tareas pendientes' }}</p>
        </div>

        <!-- Controls -->
        <div class="controls">
          <button
            @click="removeCompletedTasks"
            :disabled="!hasCompletedTasks || removingCompleted"
            class="btn btn-danger"
          >
            {{ removingCompleted ? 'Eliminando...' : 'Eliminar completadas' }}
          </button>
          <button
            @click="toggleShowCompleted"
            class="btn btn-primary"
          >
            {{ showCompleted ? 'Ocultar completadas' : 'Mostrar completadas' }}
          </button>
          <button
            @click="refreshData"
            :disabled="loading"
            class="btn btn-secondary"
          >
            {{ loading ? 'Actualizando...' : 'Actualizar' }}
          </button>
        </div>
      </div>

      <!-- Console Tab -->
      <div v-if="activeTab === 'console'" class="tab-content active">
        <div class="console-output" ref="consoleOutput">
          <div v-for="(log, index) in consoleLogs" :key="index" class="console-line">
            {{ log }}
          </div>
          <div v-if="consoleLogs.length === 0" class="console-line">
            Consola vacía. Las acciones aparecerán aquí.
          </div>
        </div>
        <div style="margin-top: 15px; text-align: center;">
          <button @click="clearConsole" class="btn btn-secondary">
            Limpiar Consola
          </button>
        </div>
      </div>
    </template>
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

    // Console logging
    const logToConsole = (message) => {
      consoleLogs.value.push(`[${new Date().toLocaleTimeString()}] ${message}`);
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

    // Message handling
    const showMessage = (message, isError = false) => {
      if (isError) {
        error.value = message;
        successMessage.value = '';
      } else {
        successMessage.value = message;
        error.value = '';
      }
      
      setTimeout(() => {
        error.value = '';
        successMessage.value = '';
      }, 3000);
    };

    // Data loading
    const loadData = async () => {
      loading.value = true;
      error.value = '';
      
      try {
        // Check API health first
        const apiHealthy = await ApiService.checkApiHealth();
        if (!apiHealthy) {
          throw new Error('El servidor JSON no está disponible. Asegúrate de ejecutar: npm run server');
        }

        // Load todos and user
        const [todosData, usersData] = await Promise.all([
          ApiService.getTodos(),
          ApiService.getUsers()
        ]);
        
        todos.value = todosData;
        user.value = usersData[0] || { id: 1, name: 'Usuario' };
        
        logToConsole(`${user.value.name}'s Todo List cargada (${stats.value.pending} pendientes)`);
        logToConsole(`Total de tareas: ${stats.value.total}`);
        
        // Log each todo
        todos.value.forEach(todo => {
          logToConsole(`${todo.id}\t${todo.task}${todo.complete ? '\t(completada)' : ''}`);
        });
        
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido';
        error.value = message;
        logToConsole(`Error: ${message}`);
      } finally {
        loading.value = false;
      }
    };

    const refreshData = async () => {
      await loadData();
      showMessage('Datos actualizados correctamente');
    };

    // Task operations
    const addTask = async () => {
      const task = newTaskText.value.trim();
      if (!task) return;
      
      addingTask.value = true;
      
      try {
        const newTodo = await ApiService.createTodo(task);
        todos.value.push(newTodo);
        newTaskText.value = '';
        
        logToConsole(`Nueva tarea añadida: "${task}" con ID: ${newTodo.id}`);
        showMessage('Tarea añadida correctamente');
        
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al añadir tarea';
        showMessage(message, true);
        logToConsole(`Error al añadir tarea: ${message}`);
      } finally {
        addingTask.value = false;
      }
    };

    const toggleComplete = async (id, complete) => {
      try {
        const updatedTodo = await ApiService.markTodoComplete(id, complete);
        
        const index = todos.value.findIndex(todo => todo.id === id);
        if (index !== -1) {
          todos.value[index] = updatedTodo;
        }
        
        const action = complete ? 'completada' : 'marcada como pendiente';
        logToConsole(`Tarea ${id} ${action}`);
        showMessage(`Tarea ${action} correctamente`);
        
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al actualizar tarea';
        showMessage(message, true);
        logToConsole(`Error al actualizar tarea ${id}: ${message}`);
      }
    };

    const deleteSingleTodo = async (id) => {
      deletingTodo.value = id;
      
      try {
        await ApiService.deleteTodo(id);
        todos.value = todos.value.filter(todo => todo.id !== id);
        
        logToConsole(`Tarea ${id} eliminada`);
        showMessage('Tarea eliminada correctamente');
        
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al eliminar tarea';
        showMessage(message, true);
        logToConsole(`Error al eliminar tarea ${id}: ${message}`);
      } finally {
        deletingTodo.value = null;
      }
    };

    const removeCompletedTasks = async () => {
      if (!hasCompletedTasks.value) return;
      
      removingCompleted.value = true;
      
      try {
        await ApiService.deleteCompletedTodos();
        todos.value = todos.value.filter(todo => !todo.complete);
        
        logToConsole('Tareas completadas eliminadas');
        showMessage('Tareas completadas eliminadas correctamente');
        
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al eliminar tareas completadas';
        showMessage(message, true);
        logToConsole(`Error al eliminar tareas completadas: ${message}`);
      } finally {
        removingCompleted.value = false;
      }
    };

    const toggleShowCompleted = () => {
      showCompleted.value = !showCompleted.value;
      const action = showCompleted.value ? 'Mostrando' : 'Ocultando';
      logToConsole(`${action} tareas completadas`);
    };

    // Watch for changes in filtered todos to update console
    watch(filteredTodos, (newTodos) => {
      if (newTodos.length > 0) {
        logToConsole(`Mostrando ${newTodos.length} tareas`);
      }
    }, { deep: true });

    // Initialize app
    onMounted(() => {
      logToConsole('Aplicación Vue Todo List iniciada');
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
      toggleShowCompleted
    };
  }
};
</script>

<style>
/* Los estilos ya están incluidos en assets/style.css */
</style>