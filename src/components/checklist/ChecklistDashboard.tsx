"use client";

import React, { useState, useEffect } from "react";
import { 
  CheckSquare, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Download, 
  AlertTriangle, 
  Info,
  Layers,
  Sparkles,
  ClipboardList,
  Loader2
} from "lucide-react";

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string;
  quantity: string | null;
  isRequired: boolean;
  isCompleted: boolean;
  isCustom: boolean;
}

interface ChecklistDashboardProps {
  locale: string;
}

export default function ChecklistDashboard({ locale }: ChecklistDashboardProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("custom");
  const [newItemQuantity, setNewItemQuantity] = useState("");
  const [adding, setAdding] = useState(false);

  // Fetch checklist items on mount
  useEffect(() => {
    fetchChecklist();
  }, []);

  const fetchChecklist = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checklist");
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (e) {
      console.error("Failed to load checklist", e);
    } finally {
      setLoading(false);
    }
  };

  // Toggle item completion
  const handleToggle = async (id: string, currentStatus: boolean) => {
    // Optimistic UI update
    setItems(prev => prev.map(item => item.id === id ? { ...item, isCompleted: !currentStatus } : item));
    
    try {
      await fetch("/api/checklist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isCompleted: !currentStatus })
      });
    } catch (e) {
      console.error(e);
      // Revert on error
      setItems(prev => prev.map(item => item.id === id ? { ...item, isCompleted: currentStatus } : item));
    }
  };

  // Add custom item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim() || adding) return;

    setAdding(true);
    try {
      const res = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newItemTitle,
          category: newItemCategory,
          quantity: newItemQuantity,
          isRequired: false
        })
      });
      if (res.ok) {
        const addedItem = await res.json();
        setItems(prev => [...prev, addedItem]);
        setNewItemTitle("");
        setNewItemQuantity("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAdding(false);
    }
  };

  // Delete item
  const handleDeleteItem = async (id: string) => {
    // Optimistic UI update
    setItems(prev => prev.filter(item => item.id !== id));

    try {
      await fetch(`/api/checklist?id=${id}`, {
        method: "DELETE"
      });
    } catch (e) {
      console.error(e);
      fetchChecklist(); // Refetch to sync state
    }
  };

  // Reset checklist
  const handleResetChecklist = async () => {
    if (!confirm("Are you sure you want to reset your checklist? All custom items will be deleted, and quantities will re-seed based on your household size.")) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/checklist?reset=true", {
        method: "DELETE"
      });
      if (res.ok) {
        fetchChecklist();
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  // Export checklist as Text
  const handleExportText = () => {
    const lines = [
      "MONSOON SAATHI EMERGENCY CHECKLIST",
      `Exported: ${new Date().toLocaleDateString()}`,
      "",
      ...items.map(item => `- [${item.isCompleted ? "x" : " "}] ${item.title} (${item.quantity || "N/A"}) - ${item.description}`)
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Monsoon_Emergency_Checklist.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Calculate stats
  const completedCount = items.filter(i => i.isCompleted).length;
  const totalCount = items.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Group by category
  const categories = Array.from(new Set(items.map(item => item.category)));

  const categoryLabels: Record<string, string> = {
    water: "Drinking Water",
    food: "Food Supplies",
    medicine: "Medicines & First Aid",
    lighting: "Lighting & Power",
    communication: "Devices & Signals",
    documents: "Personal Documents",
    pets: "Pet Supplies",
    vehicle: "Vehicle Protection",
    custom: "Custom Checklist Tasks"
  };

  return (
    <div className="space-y-6">
      {/* Overview bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 border border-slate-900 rounded-2xl p-4">
        <div className="space-y-1.5 flex-1 w-full max-w-sm">
          <div className="flex justify-between text-xs font-bold text-slate-350">
            <span>Checklist Completed</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-900">
            <div 
              className="bg-gradient-to-r from-teal-500 to-cyan-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            ></div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportText}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-semibold rounded-xl text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export TXT
          </button>
          <button
            onClick={handleResetChecklist}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-semibold rounded-xl text-red-400 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-red-400" /> Reset Checklist
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 bg-slate-900/40 rounded-2xl animate-pulse border border-slate-950 flex items-center justify-center">
          <span className="text-xs text-slate-500">Checking your emergency cache...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main checklist box */}
          <div className="md:col-span-2 space-y-6">
            {categories.map(cat => {
              const catItems = items.filter(i => i.category === cat);
              return (
                <div key={cat} className="glass-card rounded-2xl p-6 space-y-3.5">
                  <h3 className="text-xs uppercase font-extrabold text-teal-400 tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-teal-400 shrink-0" />
                    {categoryLabels[cat] || cat.toUpperCase()}
                  </h3>
                  
                  <div className="space-y-3.5">
                    {catItems.map(item => (
                      <div 
                        key={item.id}
                        className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                          item.isCompleted 
                            ? "bg-slate-950/40 border-slate-950 opacity-60 text-slate-500" 
                            : "bg-slate-900/30 border-slate-850/80 hover:border-slate-800"
                        }`}
                      >
                        <label className="flex items-start gap-3 flex-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.isCompleted}
                            onChange={() => handleToggle(item.id, item.isCompleted)}
                            className="mt-0.5 w-4 h-4 rounded text-teal-500 accent-teal-500 border-slate-850 bg-slate-950 cursor-pointer"
                          />
                          <div className="text-xs">
                            <span className={`font-semibold block ${item.isCompleted ? "line-through text-slate-500" : "text-slate-200"}`}>
                              {item.title}
                            </span>
                            <span className="text-slate-400 block mt-0.5 leading-relaxed">{item.description}</span>
                          </div>
                        </label>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.quantity && (
                            <span className="text-[10px] px-2 py-0.5 font-mono border border-slate-800 bg-slate-950 text-slate-400 rounded-md">
                              {item.quantity}
                            </span>
                          )}
                          {item.isCustom && (
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              aria-label="Delete custom task"
                              className="p-1 rounded bg-slate-950 hover:bg-slate-900 border border-slate-850 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                              title="Delete custom task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add custom item sidebar */}
          <div className="space-y-6">
            <form onSubmit={handleAddItem} className="glass-card rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-teal-400" /> Add Custom Task
              </h3>
              
              <div className="space-y-1.5">
                <label htmlFor="custom-task-title" className="text-[10px] text-slate-350 uppercase tracking-widest font-semibold">Task Name</label>
                <input
                  id="custom-task-title"
                  type="text"
                  required
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="e.g. Bring outdoor mats inside"
                  className="w-full glass-input px-3.5 py-2 text-xs rounded-xl outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="custom-task-qty" className="text-[10px] text-slate-350 uppercase tracking-widest font-semibold">Quantity / Supply</label>
                <input
                  id="custom-task-qty"
                  type="text"
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(e.target.value)}
                  placeholder="e.g. 2 mats, 3 days"
                  className="w-full glass-input px-3.5 py-2 text-xs rounded-xl outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="custom-task-cat" className="text-[10px] text-slate-350 uppercase tracking-widest font-semibold">Category Group</label>
                <select
                  id="custom-task-cat"
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350 outline-none focus:border-teal-500"
                >
                  <option value="custom">Custom Tasks</option>
                  <option value="water">Water supply</option>
                  <option value="food">Food stock</option>
                  <option value="medicine">Medicines & First-aid</option>
                  <option value="lighting">Lighting / Flashlights</option>
                  <option value="communication">Mobile & Signal</option>
                  <option value="pets">Pets safety</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={adding || !newItemTitle.trim()}
                className="w-full py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-all disabled:opacity-50"
              >
                {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 text-slate-950" />}
                Add Item
              </button>
            </form>

            {/* Offline note */}
            <div className="bg-slate-900/30 border border-slate-900 p-4 rounded-2xl flex items-start gap-2 text-[10px] text-slate-500 leading-relaxed">
              <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <span>
                <strong>Offline Persistence</strong>: Checklist modifications write directly to SQLite locally and sync instantly when offline using browser service caches.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
