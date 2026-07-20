import { useState, type FormEvent } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { useUIStore } from '../../../stores/uiStore';

export default function NewProject() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');

  const createNewProject = useProjectStore((s) => s.createNewProject);
  const updateProject = useProjectStore((s) => s.updateProject);
  const setActiveView = useUIStore((s) => s.setActiveView);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createNewProject(name.trim(), description.trim() || undefined);

    // Set location if provided
    if (location.trim()) {
      updateProject({ location: location.trim() });
    }

    setActiveView('analysis');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--upas-text-primary)' }}>
          مشروع جديد
        </h1>
        <p className="text-sm" style={{ color: 'var(--upas-text-secondary)' }}>
          أدخل بيانات المشروع الأساسية للبدء
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border p-6 space-y-5"
        style={{
          backgroundColor: 'var(--upas-bg-card)',
          borderColor: 'var(--upas-border)',
        }}
      >
        {/* Project Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="project-name"
            className="block text-sm font-medium"
            style={{ color: 'var(--upas-text-primary)' }}
          >
            اسم المشروع <span className="text-red-500">*</span>
          </label>
          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: تحليل حماية المبنى الإداري"
            required
            className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none
              transition-colors duration-150
              focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
            style={{
              backgroundColor: 'var(--upas-bg-primary)',
              borderColor: 'var(--upas-border)',
              color: 'var(--upas-text-primary)',
            }}
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label
            htmlFor="project-desc"
            className="block text-sm font-medium"
            style={{ color: 'var(--upas-text-primary)' }}
          >
            وصف المشروع
          </label>
          <textarea
            id="project-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="وصف مختصر للمشروع وأهدافه..."
            rows={3}
            className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none resize-none
              transition-colors duration-150
              focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
            style={{
              backgroundColor: 'var(--upas-bg-primary)',
              borderColor: 'var(--upas-border)',
              color: 'var(--upas-text-primary)',
            }}
          />
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <label
            htmlFor="project-location"
            className="block text-sm font-medium"
            style={{ color: 'var(--upas-text-primary)' }}
          >
            الموقع
          </label>
          <input
            id="project-location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="مثال: الرياض، المملكة العربية السعودية"
            className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none
              transition-colors duration-150
              focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
            style={{
              backgroundColor: 'var(--upas-bg-primary)',
              borderColor: 'var(--upas-border)',
              color: 'var(--upas-text-primary)',
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-6 py-2.5 rounded-lg text-white text-sm font-medium
              transition-all duration-200 cursor-pointer
              hover:opacity-90 active:scale-[0.98]
              disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--upas-accent)' }}
          >
            إنشاء المشروع
          </button>
          <button
            type="button"
            onClick={() => setActiveView('dashboard')}
            className="px-6 py-2.5 rounded-lg text-sm font-medium
              border transition-colors duration-200 cursor-pointer hover:bg-slate-50"
            style={{
              borderColor: 'var(--upas-border)',
              color: 'var(--upas-text-secondary)',
            }}
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}