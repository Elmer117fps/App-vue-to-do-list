import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejo de errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    throw error;
  }
);

export class ApiService {
  // Métodos para TodoItems
  static async getTodos() {
    try {
      const response = await api.get('/todos');
      return response.data;
    } catch (error) {
      console.error('Error fetching todos:', error);
      throw new Error('No se pudieron cargar las tareas');
    }
  }

  static async getTodoById(id) {
    try {
      const response = await api.get(`/todos/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching todo:', error);
      throw new Error('No se pudo cargar la tarea');
    }
  }

  static async createTodo(task) {
    try {
      const newTodo = {
        task,
        complete: false
      };
      const response = await api.post('/todos', newTodo);
      return response.data;
    } catch (error) {
      console.error('Error creating todo:', error);
      throw new Error('No se pudo crear la tarea');
    }
  }

  static async updateTodo(id, updates) {
    try {
      const response = await api.patch(`/todos/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating todo:', error);
      throw new Error('No se pudo actualizar la tarea');
    }
  }

  static async deleteTodo(id) {
    try {
      await api.delete(`/todos/${id}`);
    } catch (error) {
      console.error('Error deleting todo:', error);
      throw new Error('No se pudo eliminar la tarea');
    }
  }

  static async markTodoComplete(id, complete) {
    return this.updateTodo(id, { complete });
  }

  static async deleteCompletedTodos() {
    try {
      const todos = await this.getTodos();
      const completedTodos = todos.filter(todo => todo.complete);
      
      const deletePromises = completedTodos.map(todo => this.deleteTodo(todo.id));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting completed todos:', error);
      throw new Error('No se pudieron eliminar las tareas completadas');
    }
  }

  // Métodos para Users
  static async getUsers() {
    try {
      const response = await api.get('/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('No se pudieron cargar los usuarios');
    }
  }

  static async getUserById(id) {
    try {
      const response = await api.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error('No se pudo cargar el usuario');
    }
  }

  // Método para verificar si la API está disponible
  static async checkApiHealth() {
    try {
      await api.get('/todos');
      return true;
    } catch (error) {
      return false;
    }
  }
}