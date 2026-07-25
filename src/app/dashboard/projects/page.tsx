"use client";

import { useState, useEffect } from "react";
import { Plus, Kanban, Calendar, MoreHorizontal, CheckCircle2, ChevronRight } from "lucide-react";
import Topbar from "@/components/layout/Topbar";
import { getProjects, updateProjectStatus, updateTaskStage, deleteTask, createTask } from "@/app/actions/projects";

const columns: { stage: string; label: string; color: string }[] = [
  { stage: "TODO", label: "To Do", color: "#475569" },
  { stage: "IN_PROGRESS", label: "In Progress", color: "#6c5ce7" },
  { stage: "REVIEW", label: "Review", color: "#fdcb6e" },
  { stage: "DONE", label: "Deliver", color: "#00b894" },
];

const priorityConfig: Record<string, { color: string; label: string }> = {
  LOW: { color: "#64748b", label: "Low" },
  MEDIUM: { color: "#fdcb6e", label: "Med" },
  HIGH: { color: "#e17055", label: "High" },
  URGENT: { color: "#fd79a8", label: "Urgent" },
};

export default function ProjectsPage() {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [rawProjects, setRawProjects] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadProjectsData = async () => {
    const dbProjects = await getProjects();
    if (dbProjects) {
      setRawProjects(dbProjects);
      const allItems: any[] = [];

      dbProjects.forEach((p: any) => {
        const clientName = p.client?.companyName || p.name;

        if (p.tasks && p.tasks.length > 0) {
          p.tasks.forEach((t: any) => {
            allItems.push({
              id: t.id,
              isTask: true,
              projectId: p.id,
              title: t.title,
              stage: t.stage || "TODO",
              project: clientName,
              priority: t.priority || "MEDIUM",
              assignee: "YP",
              color: priorityConfig[t.priority]?.color || "#6c5ce7",
            });
          });
        } else {
          // Map project itself as main deliverable item
          const projStage =
            p.status === "DELIVERED" || p.status === "COMPLETED"
              ? "DONE"
              : p.status === "REVIEW"
              ? "REVIEW"
              : p.status === "PLANNING"
              ? "TODO"
              : "IN_PROGRESS";

          allItems.push({
            id: p.id,
            isTask: false,
            projectId: p.id,
            title: `${clientName} — Deliverable`,
            stage: projStage,
            project: clientName,
            priority: p.status === "DELIVERED" ? "LOW" : "HIGH",
            assignee: "YP",
            color: p.status === "DELIVERED" ? "#00b894" : "#6c5ce7",
          });
        }
      });

      setTasksList(allItems);
    }
  };

  useEffect(() => {
    loadProjectsData();
  }, []);

  const handleStageChange = async (item: any, newStage: string) => {
    setActiveDropdown(null);
    if (item.isTask) {
      await updateTaskStage(item.id, newStage as any);
    } else {
      const projStatus = newStage === "DONE" ? "DELIVERED" : newStage === "REVIEW" ? "REVIEW" : newStage === "TODO" ? "PLANNING" : "IN_PROGRESS";
      await updateProjectStatus(item.projectId, projStatus as any);
    }
    await loadProjectsData();
  };

  const handleDeleteItem = async (item: any) => {
    setActiveDropdown(null);
    if (item.isTask) {
      await deleteTask(item.id);
      await loadProjectsData();
    } else {
      setTasksList(tasksList.filter((t) => t.id !== item.id));
    }
  };

  const [newTask, setNewTask] = useState<any>({
    title: "",
    projectId: "",
    project: "",
    priority: "MEDIUM",
    stage: "TODO",
    assignee: "YP",
  });

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;
    setIsSubmitting(true);

    try {
      let targetProjectId = newTask.projectId;
      if (!targetProjectId && rawProjects.length > 0) {
        targetProjectId = rawProjects[0].id;
      }

      if (targetProjectId) {
        await createTask({
          title: newTask.title,
          projectId: targetProjectId,
          stage: newTask.stage,
          priority: newTask.priority,
        });
      }

      await loadProjectsData();
      setIsAddModalOpen(false);
      setNewTask({ title: "", projectId: "", project: "", priority: "MEDIUM", stage: "TODO", assignee: "YP" });
    } catch (err) {
      console.error("Failed to add task:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Topbar title="Projects" subtitle="Kanban board — all client deliverables" />
      <main style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }} className="animate-in">
        
        {/* Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "4px", background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "8px", padding: "4px" }}>
            {[{ key: "kanban", icon: Kanban, label: "Kanban" }, { key: "list", icon: Calendar, label: "List" }].map((v) => {
              const Icon = v.icon;
              return (
                <button
                  key={v.key}
                  onClick={() => setView(v.key as "kanban" | "list")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 14px",
                    borderRadius: "6px",
                    border: "none",
                    background: view === v.key ? "#6c5ce7" : "transparent",
                    color: view === v.key ? "#fff" : "var(--text-secondary)",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <Icon size={13} />
                  {v.label}
                </button>
              );
            })}
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Plus size={15} /> New Task
          </button>
        </div>

        {/* Board Views */}
        {view === "kanban" ? (
          <div className="pipeline-kanban-row" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", alignItems: "start" }}>
            {columns.map((col) => {
              const tasks = tasksList.filter((t) => t.stage === col.stage);
              return (
                <div key={col.stage} className="pipeline-kanban-col" style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "12px", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
                  
                  {/* Column Header */}
                  <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: col.color, display: "block", boxShadow: `0 0 8px ${col.color}60` }} />
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{col.label}</span>
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: col.color, background: `${col.color}18`, padding: "2px 8px", borderRadius: "5px" }}>{tasks.length}</span>
                  </div>

                  {/* Tasks */}
                  <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", minHeight: "120px" }}>
                    {tasks.map((task) => {
                      const pr = priorityConfig[task.priority] || priorityConfig.MEDIUM;
                      return (
                        <div key={task.id} style={{ background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", padding: "12px", cursor: "grab", transition: "all 0.2s" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", margin: 0, flex: 1 }}>{task.title}</p>
                            <div style={{ position: "relative" }}>
                              <button onClick={() => setActiveDropdown(activeDropdown === task.id ? null : task.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0 0 0 6px" }}>
                                <MoreHorizontal size={14} />
                              </button>
                              {activeDropdown === task.id && (
                                <div style={{ position: "absolute", right: 0, top: "20px", background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "8px", overflow: "hidden", zIndex: 20, minWidth: "140px", boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }}>
                                  <div style={{ padding: "4px 8px", fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", borderBottom: "1px solid var(--bg-border)" }}>MOVE TO STAGE</div>
                                  {columns.map((c) => (
                                    <button
                                      key={c.stage}
                                      onClick={() => handleStageChange(task, c.stage)}
                                      style={{ width: "100%", padding: "7px 12px", background: "transparent", border: "none", color: task.stage === c.stage ? c.color : "var(--text-primary)", fontSize: "12px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                                    >
                                      <span>{c.label}</span>
                                      {task.stage === c.stage && <CheckCircle2 size={12} color={c.color} />}
                                    </button>
                                  ))}
                                  <div style={{ borderTop: "1px solid var(--bg-border)" }}>
                                    <button onClick={() => handleDeleteItem(task)} style={{ width: "100%", padding: "8px 12px", background: "transparent", border: "none", color: "#e17055", fontSize: "12px", textAlign: "left", cursor: "pointer" }}>
                                      Delete Item
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "10px" }}>{task.project}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "10px", fontWeight: 700, color: pr.color, background: `${pr.color}18`, padding: "2px 7px", borderRadius: "4px" }}>{pr.label}</span>
                            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "linear-gradient(135deg, #6c5ce7, #a29bfe)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 800, color: "#fff" }}>
                              {task.assignee}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add task button */}
                    <button
                      onClick={() => {
                        setNewTask({ ...newTask, stage: col.stage, projectId: rawProjects[0]?.id || "" });
                        setIsAddModalOpen(true);
                      }}
                      style={{
                        width: "100%",
                        padding: "10px",
                        background: "transparent",
                        border: "1px dashed var(--bg-border)",
                        borderRadius: "8px",
                        color: "var(--text-secondary)",
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        transition: "all 0.2s",
                      }}
                    >
                      <Plus size={13} /> Add task
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card-youistic" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-input)", borderBottom: "1px solid var(--bg-border)" }}>
                  {["Deliverable Title", "Client Project", "Priority", "Stage", "Assignee", "Action"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "14px 20px", fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasksList.map((task) => {
                  const pr = priorityConfig[task.priority] || priorityConfig.MEDIUM;
                  const col = columns.find((c) => c.stage === task.stage);
                  return (
                    <tr key={task.id} style={{ borderBottom: "1px solid var(--bg-border)", transition: "background 0.15s" }}>
                      <td style={{ padding: "16px 20px", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{task.title}</td>
                      <td style={{ padding: "16px 20px", fontSize: "13px", color: "var(--text-secondary)" }}>{task.project}</td>
                      <td style={{ padding: "16px 20px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: pr.color, background: `${pr.color}18`, padding: "4px 8px", borderRadius: "5px" }}>{pr.label}</span>
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-input)", padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--bg-border)", width: "max-content" }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: col?.color, display: "block", boxShadow: `0 0 8px ${col?.color}60` }} />
                          <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 500 }}>{col?.label}</span>
                        </div>
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #6c5ce7, #a29bfe)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, color: "#fff" }}>
                          {task.assignee}
                        </div>
                      </td>
                      <td style={{ padding: "16px 20px", position: "relative" }}>
                        <button onClick={() => setActiveDropdown(activeDropdown === task.id ? null : task.id)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "6px", borderRadius: "6px", transition: "background 0.2s" }}>
                          <MoreHorizontal size={18} />
                        </button>
                        {activeDropdown === task.id && (
                          <div style={{ position: "absolute", right: "20px", top: "50%", background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "8px", overflow: "hidden", zIndex: 20, minWidth: "140px", boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }}>
                            <div style={{ padding: "4px 8px", fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", borderBottom: "1px solid var(--bg-border)" }}>MOVE TO STAGE</div>
                            {columns.map((c) => (
                              <button
                                key={c.stage}
                                onClick={() => handleStageChange(task, c.stage)}
                                style={{ width: "100%", padding: "7px 12px", background: "transparent", border: "none", color: task.stage === c.stage ? c.color : "var(--text-primary)", fontSize: "12px", textAlign: "left", cursor: "pointer" }}
                              >
                                {c.label}
                              </button>
                            ))}
                            <div style={{ borderTop: "1px solid var(--bg-border)" }}>
                              <button onClick={() => handleDeleteItem(task)} style={{ width: "100%", padding: "8px 12px", background: "transparent", border: "none", color: "#e17055", fontSize: "12px", textAlign: "left", cursor: "pointer" }}>
                                Delete Item
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Add Task Modal */}
      {isAddModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div className="card-youistic animate-in" style={{ width: "100%", maxWidth: "450px", padding: "24px", background: "var(--bg-card)", border: "1px solid var(--bg-border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div className="section-title" style={{ fontSize: "18px", margin: 0, color: "var(--text-primary)" }}>
                Add New Deliverable Task
              </div>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "20px" }}>
                &times;
              </button>
            </div>

            <form onSubmit={handleAddTask} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "6px" }}>Task / Deliverable Title *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Website Launch & Handover"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "6px" }}>Client Project *</label>
                <select
                  value={newTask.projectId}
                  onChange={(e) => setNewTask({ ...newTask, projectId: e.target.value })}
                  style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none", cursor: "pointer" }}
                >
                  {rawProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.client?.companyName || p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "6px" }}>Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none", cursor: "pointer" }}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "6px" }}>Stage Column</label>
                  <select
                    value={newTask.stage}
                    onChange={(e) => setNewTask({ ...newTask, stage: e.target.value })}
                    style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none", cursor: "pointer" }}
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="REVIEW">Review</option>
                    <option value="DONE">Deliver</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ padding: "8px 16px", background: "transparent", border: "1px solid var(--bg-border)", borderRadius: "6px", color: "var(--text-secondary)", fontSize: "13px", cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
