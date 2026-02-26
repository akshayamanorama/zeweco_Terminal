import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  User as UserIcon,
  LayoutGrid,
  AlertCircle,
  Check,
  Activity,
  GripVertical,
  FileText,
  ArrowUpCircle,
  Shield,
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Business, Checklist, Task } from '../types';
import type { CompanySettings } from '../types';
import { api } from '../src/api/client';

function ColumnDroppable({
  id,
  children,
  className = '',
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 overflow-y-auto p-3 space-y-2 min-h-[120px] min-w-0 custom-scrollbar ${isOver ? 'ring-2 ring-blue-400 ring-inset rounded-xl' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

function TaskCard({
  task,
  checklistId,
  index,
  bizId,
  onToggle,
  onUpdateText,
  onRemove,
}: {
  task: Task;
  checklistId: string;
  index: number;
  bizId: string;
  onToggle: () => void;
  onUpdateText: (v: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef: setDragRef } = useDraggable({
    id: task.id,
    data: { task, checklistId },
  });
  const { setNodeRef: setDropRef } = useDroppable({
    id: task.id,
    data: { checklistId, index },
  });
  const setRefs = (el: HTMLDivElement | null) => {
    setDropRef(el);
    setDragRef(el);
  };
  return (
    <div
      ref={setRefs}
      {...listeners}
      {...attributes}
      onClick={onToggle}
      className={`
        group relative p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none
        ${task.completed
          ? 'bg-zinc-50 dark:bg-zinc-900/20 border-zinc-100 dark:border-zinc-800 text-zinc-400'
          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700/50 shadow-sm hover:border-blue-400/50 hover:shadow-md'}
      `}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 shrink-0 touch-none" onClick={(e) => e.stopPropagation()}>
          <GripVertical size={14} />
        </span>
        <div className={`
          mt-0.5 w-4 h-4 rounded border transition-colors flex items-center justify-center shrink-0
          ${task.completed ? 'bg-green-500 border-green-500' : 'border-zinc-300 dark:border-zinc-600 group-hover:border-blue-500'}
        `}>
          {task.completed && <Check size={10} className="text-white" strokeWidth={4} />}
        </div>
        <input
          type="text"
          value={task.text}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onUpdateText(e.target.value)}
          className={`
            bg-transparent text-xs font-medium focus:outline-none w-full resize-none leading-relaxed
            ${task.completed ? 'text-zinc-400 line-through' : 'text-zinc-700 dark:text-zinc-300'}
          `}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-2 right-2 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white dark:bg-zinc-900 rounded-md shadow-sm"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

interface ManagerWorkspaceProps {
  businesses: Business[];
  onUpdateBusiness: (updated: Business) => void;
  currentUser: any;
  /** CXO company settings (reporting cycle, notifications, etc.) */
  companySettings?: CompanySettings;
  /** Open the entity detail drawer (Risks, Escalation, Next week focus, Support needed) */
  onOpenEntityDetail?: (business: Business) => void;
}

export const ManagerWorkspace: React.FC<ManagerWorkspaceProps> = ({
  businesses,
  onUpdateBusiness,
  currentUser,
  companySettings,
  onOpenEntityDetail,
}) => {
  const [selectedBizId, setSelectedBizId] = useState<string | null>(businesses[0]?.id || null);

  // Sync selectedBizId if businesses list changes or current selection disappears
  useEffect(() => {
    if (!selectedBizId && businesses.length > 0) {
      setSelectedBizId(businesses[0].id);
    }
  }, [businesses, selectedBizId]);

  const selectedBiz = businesses.find(b => b.id === selectedBizId);

  // Helper to update local state and notify parent
  const mutateBusiness = (updatedBiz: Business) => {
    onUpdateBusiness(updatedBiz);
  };

  const toggleTask = async (bizId: string, checklistId: string, taskId: string) => {
    const biz = businesses.find(b => b.id === bizId);
    if (!biz) return;
    const checklist = biz.checklists.find(cl => cl.id === checklistId);
    if (!checklist) return;
    const task = checklist.tasks.find(t => t.id === taskId);
    if (!task) return;

    // Optimistic update
    const updatedTask = { ...task, completed: !task.completed };
    const newChecklists = biz.checklists.map(cl =>
      cl.id === checklistId
        ? { ...cl, tasks: cl.tasks.map(t => t.id === taskId ? updatedTask : t) }
        : cl
    );

    // Calculate optimistic progress
    let total = 0;
    let completed = 0;
    newChecklists.forEach(cl => {
      cl.tasks.forEach(t => {
        total++;
        if (t.completed) completed++;
      });
    });
    const newProgress = total === 0 ? 0 : Math.round((completed / total) * 12);

    const optimisticBiz = { ...biz, checklists: newChecklists, routeProgress: newProgress };
    mutateBusiness(optimisticBiz);

    if (taskId.startsWith('local-task-')) return;
    try {
      await api.updateTask(taskId, { completed: updatedTask.completed });
    } catch (e) {
      console.error("Failed to toggle task", e);
    }
  };

  const updateTaskText = async (bizId: string, clId: string, taskId: string, newText: string) => {
    const biz = businesses.find(b => b.id === bizId);
    if (!biz) return;

    // Optimistic update
    const newChecklists = biz.checklists.map(cl =>
      cl.id === clId
        ? { ...cl, tasks: cl.tasks.map(t => t.id === taskId ? { ...t, text: newText } : t) }
        : cl
    );
    mutateBusiness({ ...biz, checklists: newChecklists });

    if (taskId.startsWith('local-task-')) return;
    try {
      await api.updateTask(taskId, { text: newText });
    } catch (e) { console.error(e); }
  };

  const addChecklist = async (bizId: string) => {
    const biz = businesses.find(b => b.id === bizId);
    if (!biz) return;

    if (biz.checklists.length >= 10) {
      alert("Maximum limit of 10 checklists reached for this business.");
      return;
    }

    try {
      const newChecklist = await api.createChecklist(bizId, 'New Operations Phase');
      const updatedBiz = {
        ...biz,
        checklists: [...biz.checklists, { ...newChecklist, tasks: [] }]
      };
      mutateBusiness(updatedBiz);
    } catch (e) {
      console.error(e);
      // Local fallback when backend is not available
      const localChecklist: Checklist = {
        id: `local-cl-${Date.now()}`,
        title: 'New Operations Phase',
        tasks: []
      };
      const updatedBiz = {
        ...biz,
        checklists: [...biz.checklists, localChecklist]
      };
      mutateBusiness(updatedBiz);
    }
  };

  const addTask = async (bizId: string, clId: string) => {
    const biz = businesses.find(b => b.id === bizId);
    if (!biz) return;

    const isLocalChecklist = clId.startsWith('local-cl-');
    if (isLocalChecklist) {
      const newTask: Task = { id: `local-task-${Date.now()}`, text: 'New Task', completed: false };
      const newChecklists = biz.checklists.map(cl =>
        cl.id === clId ? { ...cl, tasks: [...cl.tasks, newTask] } : cl
      );
      mutateBusiness({ ...biz, checklists: newChecklists });
      return;
    }
    try {
      const newTask = await api.createTask(clId, 'New Task');
      const newChecklists = biz.checklists.map(cl =>
        cl.id === clId ? { ...cl, tasks: [...cl.tasks, newTask] } : cl
      );
      mutateBusiness({ ...biz, checklists: newChecklists });
    } catch (e) {
      console.error(e);
      const newTask: Task = { id: `local-task-${Date.now()}`, text: 'New Task', completed: false };
      const newChecklists = biz.checklists.map(cl =>
        cl.id === clId ? { ...cl, tasks: [...cl.tasks, newTask] } : cl
      );
      mutateBusiness({ ...biz, checklists: newChecklists });
    }
  };

  const deleteChecklist = async (bizId: string, clId: string) => {
    const biz = businesses.find(b => b.id === bizId);
    if (!biz) return;

    const isLocalChecklist = clId.startsWith('local-cl-');
    if (isLocalChecklist) {
      const newChecklists = biz.checklists.filter(cl => cl.id !== clId);
      mutateBusiness({ ...biz, checklists: newChecklists });
      return;
    }
    try {
      await api.deleteChecklist(clId);
      const newChecklists = biz.checklists.filter(cl => cl.id !== clId);
      mutateBusiness({ ...biz, checklists: newChecklists });
    } catch (e) {
      console.error(e);
      const newChecklists = biz.checklists.filter(cl => cl.id !== clId);
      mutateBusiness({ ...biz, checklists: newChecklists });
    }
  };

  const removeTask = async (bizId: string, clId: string, taskId: string) => {
    const biz = businesses.find(b => b.id === bizId);
    if (!biz) return;

    const newChecklists = biz.checklists.map(cl =>
      cl.id === clId ? { ...cl, tasks: cl.tasks.filter(t => t.id !== taskId) } : cl
    );
    mutateBusiness({ ...biz, checklists: newChecklists });

    if (taskId.startsWith('local-task-')) return;
    try {
      await api.deleteTask(taskId);
    } catch (e) { console.error(e); }
  };

  const moveTask = (
    bizId: string,
    task: Task,
    sourceChecklistId: string,
    targetChecklistId: string,
    targetIndex: number
  ) => {
    const biz = businesses.find(b => b.id === bizId);
    if (!biz) return;
    const sourceList = biz.checklists.find(c => c.id === sourceChecklistId);
    const targetList = biz.checklists.find(c => c.id === targetChecklistId);
    if (!sourceList || !targetList) return;

    let newChecklists: Checklist[];
    if (sourceChecklistId === targetChecklistId) {
      const sourceIndex = sourceList.tasks.findIndex(t => t.id === task.id);
      if (sourceIndex === targetIndex) return;
      const newTasks = sourceList.tasks.filter(t => t.id !== task.id);
      const insertIdx = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
      newTasks.splice(insertIdx, 0, task);
      newChecklists = biz.checklists.map(c =>
        c.id === sourceChecklistId ? { ...c, tasks: newTasks } : c
      );
    } else {
      const newSourceTasks = sourceList.tasks.filter(t => t.id !== task.id);
      const newTargetTasks = [...targetList.tasks];
      newTargetTasks.splice(targetIndex, 0, task);
      newChecklists = biz.checklists.map(c => {
        if (c.id === sourceChecklistId) return { ...c, tasks: newSourceTasks };
        if (c.id === targetChecklistId) return { ...c, tasks: newTargetTasks };
        return c;
      });
    }

    let total = 0;
    let completed = 0;
    newChecklists.forEach(cl => {
      cl.tasks.forEach(t => {
        total++;
        if (t.completed) completed++;
      });
    });
    const routeProgress = total === 0 ? 0 : Math.round((completed / total) * 12);
    mutateBusiness({ ...biz, checklists: newChecklists, routeProgress });
  };

  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || !selectedBiz) return;
    const taskData = active.data.current as { task: Task; checklistId: string } | undefined;
    if (!taskData?.task) return;

    const { task, checklistId: sourceChecklistId } = taskData;
    const overId = over.id as string;
    const checklistIds = new Set(selectedBiz.checklists.map(c => c.id));
    let targetChecklistId: string;
    let targetIndex: number;

    if (checklistIds.has(overId)) {
      targetChecklistId = overId;
      const list = selectedBiz.checklists.find(c => c.id === overId);
      targetIndex = list ? list.tasks.length : 0;
    } else {
      const overData = over.data.current as { checklistId: string; index: number } | undefined;
      if (!overData) return;
      targetChecklistId = overData.checklistId;
      targetIndex = overData.index;
    }

    moveTask(selectedBiz.id, task, sourceChecklistId, targetChecklistId, targetIndex);
  };

  const permissionLabels: Record<string, string> = {
    can_manage_team: 'Manage Team',
    can_delete_tasks: 'Delete Tasks',
    can_edit_business: 'Edit Business Profile',
    can_view_financials: 'View Financials',
  };
  const perms = (currentUser?.permissions as string[] | undefined) || [];

  return (
    <div className="flex h-full bg-zinc-50 dark:bg-black overflow-hidden">
      {/* Sidebar Entities */}
      <aside className="w-72 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col shadow-xl z-10">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Assigned Portfolio</h2>
          <span className="text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-500 border border-zinc-200 dark:border-zinc-700">{businesses.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {businesses.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedBizId(b.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all group ${selectedBizId === b.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border transition-colors ${selectedBizId === b.id ? 'bg-white/20 border-white/30' : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 group-hover:border-zinc-300'
                }`}>
                {b.code.substring(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate leading-tight">{b.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 bg-white/20 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${selectedBizId === b.id ? 'bg-white' : 'bg-blue-500'}`} style={{ width: `${(b.routeProgress / 12) * 100}%` }} />
                  </div>
                  <span className={`text-[9px] font-mono ${selectedBizId === b.id ? 'text-blue-100' : 'text-zinc-500'}`}>{Math.round((b.routeProgress / 12) * 100)}%</span>
                </div>
              </div>
            </button>
          ))}
          {businesses.length === 0 && (
            <div className="p-8 text-center">
              <AlertCircle size={24} className="mx-auto text-zinc-300 mb-2" />
              <p className="text-xs text-zinc-400 font-medium">No assigned businesses found for this account.</p>
            </div>
          )}
        </div>
        {/* Your access: show permissions granted by CXO */}
        {perms.length > 0 && (
          <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={12} className="text-zinc-500" />
              <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.15em]">Your access</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {perms.map((id) => (
                <span key={id} className="text-[9px] font-medium px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                  {permissionLabels[id] || id}
                </span>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-black overflow-hidden relative">
        {selectedBiz ? (
          <>
            {/* Header with Stats & Progress */}
            <header className="px-8 py-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col gap-6 z-20 shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/20 flex items-center justify-center font-bold text-xl overflow-hidden">
                    {selectedBiz.logoUrl?.trim() ? <img src={selectedBiz.logoUrl} alt="" className="w-full h-full object-cover" /> : selectedBiz.code}
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
                      {selectedBiz.name}
                    </h1>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                        <UserIcon size={12} className="text-zinc-500" />
                        <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 font-medium uppercase tracking-wider">{selectedBiz.responsible}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                        <Activity size={12} className={selectedBiz.health === 'Green' ? 'text-green-500' : selectedBiz.health === 'Red' ? 'text-red-500' : 'text-yellow-500'} />
                        <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 font-medium uppercase tracking-wider">{selectedBiz.status}</span>
                      </div>
                      {companySettings && (
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700" title={`Reporting: ${companySettings.reportingCycle}; Notifications: ${companySettings.notificationMethod}`}>
                          <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Report: {companySettings.reportingCycle}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 items-center">
                  <button
                    type="button"
                    onClick={() => onOpenEntityDetail?.(selectedBiz)}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all shadow-sm"
                    title="Risks, severity, escalation, next week focus, support needed"
                  >
                    <FileText size={16} />
                    Risks & details
                  </button>
                  <button
                    onClick={() => addChecklist(selectedBiz.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
                  >
                    <Plus size={16} /> New List
                  </button>
                </div>
              </div>

              {/* Quick tags: risks count + escalation when present */}
              {(selectedBiz.risks?.length || selectedBiz.escalationRequested) ? (
                <div className="flex flex-wrap items-center gap-2">
                  {selectedBiz.risks && selectedBiz.risks.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-medium">
                      <AlertCircle size={12} />
                      {selectedBiz.risks.length} risk{selectedBiz.risks.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {selectedBiz.escalationRequested && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs font-medium">
                      <ArrowUpCircle size={12} />
                      Escalation requested
                    </span>
                  )}
                </div>
              ) : null}

              {/* Route Progress "Dots" Visualization */}
              <div className="relative pt-2 pb-4">
                <div className="flex items-center justify-between relative z-10">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const step = i + 1;
                    const isCompleted = step <= selectedBiz.routeProgress;
                    const isCurrent = step === selectedBiz.routeProgress;

                    return (
                      <div key={i} className="flex flex-col items-center gap-2 group cursor-default">
                        <div
                          className={`
                            w-3 h-3 rounded-full transition-all duration-300 border-2
                            ${isCompleted
                              ? 'bg-blue-600 border-blue-600 scale-110 shadow-[0_0_10px_rgba(37,99,235,0.3)]'
                              : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700'}
                            ${isCurrent ? 'ring-4 ring-blue-500/20' : ''}
                          `}
                        />
                        <span className={`text-[9px] font-mono font-bold transition-colors ${isCompleted ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-zinc-300 dark:text-zinc-700'}`}>
                          {step.toString().padStart(2, '0')}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* Connecting Line */}
                <div className="absolute top-[13px] left-0 w-full h-0.5 bg-zinc-100 dark:bg-zinc-800 -z-0">
                  <div
                    className="h-full bg-blue-100 dark:bg-blue-900/30 transition-all duration-500"
                    style={{ width: `${(selectedBiz.routeProgress / 12) * 100}%` }}
                  />
                </div>
              </div>
            </header>

            {/* Horizontal Board Area - Trello-style drag and drop */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-8 bg-zinc-50/50 dark:bg-black/50">
              <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="flex h-full gap-6 items-start">
                  {selectedBiz.checklists.length > 0 ? (
                    selectedBiz.checklists.map((cl) => {
                      const completedCount = cl.tasks.filter(t => t.completed).length;
                      const totalCount = cl.tasks.length;
                      const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                      return (
                        <div
                          key={cl.id}
                          className="w-80 shrink-0 max-h-full flex flex-col bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow group/card"
                        >
                          {/* Column Header */}
                          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/50 flex flex-col gap-3 shrink-0">
                            <div className="flex items-center justify-between gap-2">
                              <input
                                type="text"
                                value={cl.title}
                                onChange={(e) => {
                                  const newChecklists = selectedBiz.checklists.map(c => c.id === cl.id ? { ...c, title: e.target.value } : c);
                                  onUpdateBusiness({ ...selectedBiz, checklists: newChecklists });
                                }}
                                className="bg-transparent text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500/30 rounded px-1.5 py-0.5 w-full uppercase tracking-wide"
                              />
                              <button
                                onClick={() => deleteChecklist(selectedBiz.id, cl.id)}
                                className="text-zinc-400 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity p-1"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            {/* Mini Progress Bar */}
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${percent === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-zinc-400">{percent}%</span>
                            </div>
                          </div>

                          {/* Task List - droppable column */}
                          <ColumnDroppable id={cl.id}>
                            {cl.tasks.map((task, index) => (
                              <TaskCard
                                key={task.id}
                                task={task}
                                checklistId={cl.id}
                                index={index}
                                bizId={selectedBiz.id}
                                onToggle={() => toggleTask(selectedBiz.id, cl.id, task.id)}
                                onUpdateText={(v) => updateTaskText(selectedBiz.id, cl.id, task.id, v)}
                                onRemove={() => removeTask(selectedBiz.id, cl.id, task.id)}
                              />
                            ))}
                            <button
                              onClick={() => addTask(selectedBiz.id, cl.id)}
                              className="w-full py-2 flex items-center justify-center gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-xl transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 border-dashed"
                            >
                              <Plus size={14} /> Add Task
                            </button>
                          </ColumnDroppable>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-center opacity-40">
                      <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-400 mb-4 border border-zinc-200 dark:border-zinc-800">
                        <LayoutGrid size={32} />
                      </div>
                      <p className="text-sm font-medium text-zinc-400">No active checklists</p>
                    </div>
                  )}

                  <div className="w-8 shrink-0" />
                </div>

                <DragOverlay dropAnimation={null}>
                  {activeId && selectedBiz ? (() => {
                    let activeTask: Task | null = null;
                    for (const cl of selectedBiz.checklists) {
                      const t = cl.tasks.find(t => t.id === activeId);
                      if (t) {
                        activeTask = t;
                        break;
                      }
                    }
                    if (!activeTask) return null;
                    return (
                      <div className="w-72 p-3 rounded-xl border-2 border-blue-400 bg-white dark:bg-zinc-900 shadow-xl rotate-2 opacity-95 cursor-grabbing">
                        <div className="flex items-start gap-2">
                          <GripVertical size={14} className="text-zinc-400 shrink-0 mt-0.5" />
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${activeTask.completed ? 'bg-green-500 border-green-500' : 'border-zinc-300'}`}>
                            {activeTask.completed && <Check size={10} className="text-white" strokeWidth={4} />}
                          </div>
                          <span className={`text-xs font-medium ${activeTask.completed ? 'text-zinc-400 line-through' : 'text-zinc-700 dark:text-zinc-300'}`}>
                            {activeTask.text}
                          </span>
                        </div>
                      </div>
                    );
                  })() : null}
                </DragOverlay>
              </DndContext>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
            <Activity className="text-zinc-300 dark:text-zinc-800 animate-pulse mb-4" size={48} />
            <h2 className="text-xl font-bold text-zinc-400 dark:text-zinc-600">Secure Uplink Established</h2>
            <p className="text-sm text-zinc-500 mt-2">Select a business entity from the sidebar to begin operational tracking.</p>
          </div>
        )}
      </main>
    </div>
  );
};
