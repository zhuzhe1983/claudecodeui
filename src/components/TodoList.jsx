import React from 'react';
import { Badge } from './ui/badge';
import { CheckCircle2, Clock, Circle } from 'lucide-react';

const TodoList = ({ todos, isResult = false }) => {
  if (!todos || !Array.isArray(todos)) {
    return null;
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'pending':
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="space-y-3">
      {isResult && (
        <div className="text-sm font-medium text-gray-700 mb-3">
          Todo List ({todos.length} {todos.length === 1 ? 'item' : 'items'})
        </div>
      )}
      
      {todos.map((todo) => (
        <div
          key={todo.id}
          className="flex items-start gap-3 p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex-shrink-0 mt-0.5">
            {getStatusIcon(todo.status)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className={`text-sm font-medium ${todo.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                {todo.content}
              </p>
              
              <div className="flex gap-1 flex-shrink-0">
                <Badge
                  variant="outline"
                  className={`text-xs px-2 py-0.5 ${getPriorityColor(todo.priority)}`}
                >
                  {todo.priority}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-xs px-2 py-0.5 ${getStatusColor(todo.status)}`}
                >
                  {todo.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TodoList;