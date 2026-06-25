import type { TaskItem } from '@/lib/storage/types';

export interface TaskProvider {
  list(): Promise<TaskItem[]>;
  create(task: TaskItem): Promise<TaskItem>;
  update(task: TaskItem): Promise<TaskItem>;
  delete(id: string): Promise<void>;
}

export class LocalDemoTaskProvider implements TaskProvider {
  constructor(private tasks: TaskItem[]) {}

  async list(): Promise<TaskItem[]> {
    return this.tasks;
  }

  async create(task: TaskItem): Promise<TaskItem> {
    this.tasks = [...this.tasks, task];
    return task;
  }

  async update(task: TaskItem): Promise<TaskItem> {
    this.tasks = this.tasks.map((item) => (item.id === task.id ? task : item));
    return task;
  }

  async delete(id: string): Promise<void> {
    this.tasks = this.tasks.filter((task) => task.id !== id);
  }
}
